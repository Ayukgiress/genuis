"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { interviewApi, jobApi, ApiError, getAuthToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  extractMedia,
  useInterviewRuntime,
  type InterviewRuntimePhase,
  type AiTurnMedia,
} from "@/hooks/useInterviewWebSocket";
import {
  createOrReuseInterview,
  interviewKeys,
  normalizeInterviewJobId,
  useInterviewsData,
} from "@/hooks/useInterviewsData";
import type { Interview, InterviewMessage, Job } from "@/types";
import { useInterviewCallStore } from "@/store/interviewCallStore";
import { useShallow } from "zustand/react/shallow";
import { useInterviewSpeechRecognition } from "@/hooks/useInterviewSpeechRecognition";
import { useInterviewVad } from "@/hooks/useInterviewVad";
import { calculateInterviewMetrics, getWeakAreas, loadInterviewReport, saveInterviewReport, type InterviewType } from "@/lib/interview-report";
import type { PresenceMetrics } from "@/hooks/useInterviewPresenceMetrics";
import { addInAppNotification } from "@/lib/in-app-notifications";
import { useLowBandwidth } from "@/lib/network-preferences";
import { StageHeader, type Phase } from "./_components";
import { InterviewLobby } from "./InterviewLobby";
import { InterviewCallScreen } from "./InterviewCallScreen";
import { Notice, StageFooter, EmptyStage, CreateModal } from "./_components2";

/* ──────────────────────────────────────────────────────────────────────────
   Clean interview page — single-column, focused stage
   ────────────────────────────────────────────────────────────────────────── */

export default function InterviewsPage() {
  const router = useRouter();
  const { lowBandwidth } = useLowBandwidth();
  const searchParams = useSearchParams();
  const interviewIdParam = searchParams.get("id");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const callSettings = useInterviewCallStore(useShallow((state) => ({
    interviewType: state.interviewType,
    difficulty: state.difficulty,
    durationMinutes: state.durationMinutes,
    language: state.language,
    setInterviewType: state.setInterviewType,
    captionsEnabled: state.captionsEnabled,
    muted: state.muted,
    cameraEnabled: state.cameraEnabled,
    audioDeviceId: state.audioDeviceId,
    videoDeviceId: state.videoDeviceId,
    setPhase: state.setPhase,
    setMuted: state.setMuted,
    setCameraEnabled: state.setCameraEnabled,
    setCaptionsEnabled: state.setCaptionsEnabled,
  })));
  const setCallPhase = callSettings.setPhase;
  const setInterviewType = callSettings.setInterviewType;

  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(
    null,
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [modalJobsLoading, setModalJobsLoading] = useState(false);
  const [modalJobsError, setModalJobsError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [presenceMetrics, setPresenceMetrics] = useState<PresenceMetrics>({});
  const [practiceFocus, setPracticeFocus] = useState("");
  const [aiMedia, setAiMedia] = useState<AiTurnMedia>({});
  const [aiAmplitude, setAiAmplitude] = useState(0);
  const [isTextOnlyMode, setIsTextOnlyMode] = useState(false);
  const creationLockRef = useRef(false);
  const startLockRef = useRef(false);
  const startGenerationRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryEnabled = !authLoading && isAuthenticated && !!getAuthToken();
  const {
    interviews: remoteInterviews,
    boards,
    isLoading,
    interviewsError,
    error: dataError,
    prefetchMessages,
    invalidateMessages,
    queryClient,
  } = useInterviewsData(queryEnabled);
  const interviews = remoteInterviews;
  const selectedInterviewId = selectedInterview?.id;
  const activeInterviewJobId = selectedInterview?.job_id ?? "";
  const listedInterviewJob = jobs.find(
    (candidate) =>
      normalizeInterviewJobId(candidate.id) ===
      normalizeInterviewJobId(activeInterviewJobId),
  );
  const selectedJobQuery = useQuery({
    queryKey: ["jobs", "detail", normalizeInterviewJobId(activeInterviewJobId)],
    queryFn: async () => {
      const requestedJobId = normalizeInterviewJobId(activeInterviewJobId);
      const fetchedJob = await jobApi.getById(requestedJobId);
      if (normalizeInterviewJobId(fetchedJob.id) !== requestedJobId) {
        throw new Error(
          "The job service returned a different role than the interview session requested.",
        );
      }
      return fetchedJob;
    },
    enabled: !!activeInterviewJobId && !listedInterviewJob,
    staleTime: 5 * 60_000,
  });

  const fetchInterviewMessages = useCallback(
    async (interviewId: number) => {
      try {
        const messages = await prefetchMessages(interviewId);
        setSelectedInterview((prev) =>
          prev?.id === interviewId ? { ...prev, messages } : prev,
        );
      } catch {
        setError("Could not load interview messages. Please try again.");
        window.setTimeout(() => setError(null), 4000);
      }
    },
    [prefetchMessages],
  );

  const appendMessage = useCallback(
    (interviewId: number, message: InterviewMessage) => {
      const appendUnique = (messages: InterviewMessage[] = []) =>
        messages.some((item) => item.id === message.id)
          ? messages
          : [...messages, message];

      setSelectedInterview((previous) =>
        previous?.id === interviewId
          ? { ...previous, messages: appendUnique(previous.messages) }
          : previous,
      );
      queryClient.setQueryData<InterviewMessage[]>(
        interviewKeys.messages(interviewId),
        (previous) => (previous ? appendUnique(previous) : previous),
      );
      queryClient.setQueryData<Interview[]>(interviewKeys.list, (previous) =>
        previous?.map((interview) =>
          interview.id === interviewId
            ? { ...interview, messages: appendUnique(interview.messages) }
            : interview,
        ),
      );
    },
    [queryClient],
  );

  const session = useInterviewRuntime({
    interviewId: selectedInterview?.id || null,
    audioDeviceId: callSettings.audioDeviceId,
    videoDeviceId: callSettings.videoDeviceId,
    language: callSettings.language,
    onMessage: useCallback(
      (message: InterviewMessage) => {
        if (!selectedInterview?.id) return;
        appendMessage(selectedInterview.id, message);
        invalidateMessages(selectedInterview.id);
      },
      [selectedInterview?.id, appendMessage, invalidateMessages],
    ),
    onAiTurnMedia: useCallback((media: AiTurnMedia) => setAiMedia(media), []),
    onAiAmplitude: useCallback((level: number) => setAiAmplitude(level), []),
  });
  const sessionActive = session.isActive;
  const runtimePhase = session.phase;
  const submitText = session.submitText;
  const interruptAi = session.interruptAi;
  const stopSession = session.stop;
  const submitRecognizedText = useCallback(
    (text: string) => {
      if (sessionActive) void submitText(text);
    },
    [sessionActive, submitText],
  );
  const speech = useInterviewSpeechRecognition(
    callSettings.language,
    submitRecognizedText,
  );
  const startSpeech = speech.start;
  const stopSpeech = speech.stop;
  const bargeIn = useCallback(() => {
    if (runtimePhase === "interviewer_speaking") interruptAi();
  }, [interruptAi, runtimePhase]);
  const vad = useInterviewVad(bargeIn);
  const startVad = vad.start;
  const stopVad = vad.stop;
  const showToast = useCallback((msg: string, type: "error" | "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setError(null);
    setSuccess(null);
    if (type === "error") setError(msg);
    else setSuccess(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setError(null);
      setSuccess(null);
      toastTimeoutRef.current = null;
    }, 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  /* Data loading */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get("action") !== "new") return;
    setShowCreateModal(true);
    const jobId = searchParams.get("jobId");
    const focus = searchParams.get("focus") || "";
    const requestedType = searchParams.get("type");
    if (jobId) setSelectedJobId(jobId);
    setPracticeFocus(focus);
    if (requestedType === "behavioral" || requestedType === "technical" || requestedType === "general") {
      setInterviewType(requestedType as InterviewType);
    }
  }, [searchParams, setInterviewType]);

  useEffect(() => {
    if (isLoading) return;
    const hasRequestedId = interviewIdParam !== null;
    const requestedId = hasRequestedId ? Number(interviewIdParam) : null;
    const target = hasRequestedId
      ? requestedId !== null && Number.isSafeInteger(requestedId)
        ? interviews.find((interview) => interview.id === requestedId)
        : undefined
      : selectedInterviewId
        ? null
        : interviews[0];
    if (hasRequestedId && !target) {
      setSelectedInterview(null);
      setAiMedia({});
      return;
    }
    if (!target || target.id === selectedInterviewId) return;
    setSelectedInterview(target);
    setAiMedia({});
    if (!target.messages) void fetchInterviewMessages(target.id);
  }, [
    interviews,
    interviewIdParam,
    selectedInterviewId,
    fetchInterviewMessages,
    isLoading,
  ]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowCreateModal(true);
      }
      if (e.key === "Escape") setShowCreateModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Elapsed timer */
  useEffect(() => {
    if (!sessionActive) {
      setCallPhase("listening");
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [sessionActive, setCallPhase]);

  useEffect(() => {
    const mappedPhase =
      runtimePhase === "interviewer_speaking"
        ? "ai_speaking"
        : runtimePhase === "processing"
          ? "waiting_for_user"
          : "listening";
    setCallPhase(mappedPhase);
  }, [setCallPhase, runtimePhase]);

  useEffect(() => {
    if (!sessionActive || isTextOnlyMode) return;
    void startVad();
    return () => {
      void stopVad();
    };
  }, [sessionActive, isTextOnlyMode, startVad, stopVad]);

  useEffect(() => {
    if (runtimePhase === "user_listening" && sessionActive && !isTextOnlyMode) startSpeech();
    else stopSpeech();
    return () => stopSpeech();
  }, [sessionActive, isTextOnlyMode, runtimePhase, startSpeech, stopSpeech]);

  /* Actions */
  const handleCreateInterview = useCallback(async () => {
    if (!selectedJobId || creationLockRef.current) return;
    creationLockRef.current = true;
    try {
      setIsCreating(true);
      if (boards.length > 0)
        await jobApi.addToKanban(
          selectedJobId,
          parseInt(boards[0].id),
          "review",
        );
      const newInterview = await createOrReuseInterview(
        queryClient,
        selectedJobId,
      );
      if (
        normalizeInterviewJobId(newInterview.job_id) !==
        normalizeInterviewJobId(selectedJobId)
      ) {
        throw new Error(
          "The saved interview does not match the selected role.",
        );
      }
      setSelectedInterview(newInterview);
      setElapsed(0);
      setPresenceMetrics({});
      setShowCreateModal(false);
      setSelectedJobId("");
      showToast("Session ready", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError && [502, 503, 504].includes(err.status)
          ? "The interview service is temporarily unavailable. Please try again shortly."
          : err instanceof ApiError
            ? err.message
            : "Could not reach the interview service. Check your connection and try again.",
        "error",
      );
    } finally {
      creationLockRef.current = false;
      setIsCreating(false);
    }
  }, [selectedJobId, boards, showToast, queryClient]);

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm("Delete this session?")) return;
    try {
      await interviewApi.delete(interviewId);
      queryClient.setQueryData<Interview[]>(
        interviewKeys.list,
        (previous) =>
          previous?.filter((interview) => interview.id !== interviewId) ??
          previous,
      );
      if (selectedInterview?.id === interviewId) setSelectedInterview(null);
      showToast("Deleted", "success");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const handleCompleteInterview = async (interviewId: number) => {
    try {
      const current = selectedInterview?.id === interviewId ? selectedInterview : interviews.find((item) => item.id === interviewId);
      const messages = current?.messages ?? await prefetchMessages(interviewId);
      const isSelected = selectedInterview?.id === interviewId;
      const fallbackDuration = current?.updated_at
        ? Math.max(0, Math.round((Date.parse(current.updated_at) - Date.parse(current.created_at)) / 1000))
        : 0;
      await interviewApi.complete(interviewId);
      const reportMetrics = calculateInterviewMetrics(messages, isSelected ? elapsed : fallbackDuration, isSelected ? presenceMetrics : undefined);
      saveInterviewReport({
        interviewId,
        jobId: current?.job_id ?? "",
        interviewType: isSelected ? callSettings.interviewType : loadInterviewReport(interviewId)?.interviewType ?? "general",
        metrics: reportMetrics,
        weakAreas: getWeakAreas(messages),
      });
      addInAppNotification({ title: "Interview report ready", body: "Your practice scores, transcript, and next-step suggestions are ready.", href: `/interviews/${interviewId}/report` });
      if (sessionActive && selectedInterview?.id === interviewId) stopAudioInterview();
      queryClient.setQueryData<Interview[]>(
        interviewKeys.list,
        (previous) =>
          previous?.map((i) =>
            i.id === interviewId ? { ...i, status: "completed" } : i,
          ) ?? previous,
      );
      if (selectedInterview?.id === interviewId)
        setSelectedInterview({ ...selectedInterview, status: "completed" });
      router.push(`/interviews/${interviewId}/report`);
    } catch {
      showToast("Failed", "error");
    }
  };

  const stopAudioInterview = useCallback(() => {
    startGenerationRef.current += 1;
    startLockRef.current = false;
    setIsTextOnlyMode(false);
    stopSpeech();
    void stopVad();
    stopSession();
  }, [stopSession, stopSpeech, stopVad]);

  useEffect(() => {
    if (sessionActive && elapsed >= callSettings.durationMinutes * 60) {
      stopAudioInterview();
      showToast(
        "Your practice time is up. Your session has been saved.",
        "success",
      );
    }
  }, [
    callSettings.durationMinutes,
    elapsed,
    sessionActive,
    showToast,
    stopAudioInterview,
  ]);

  const selectInterview = (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    stopAudioInterview();
    setAiMedia({});
    setElapsed(0);
    setPresenceMetrics({});
    setSelectedInterview(interview);
    if (!interview.messages) fetchInterviewMessages(interview.id);
  };

  const startAudioInterview = async (textOnly = false) => {
    if (!selectedInterview || session.isActive || startLockRef.current) return;
    startLockRef.current = true;
    setElapsed(0);
    setPresenceMetrics({});
    const generation = ++startGenerationRef.current;
    setIsTextOnlyMode(textOnly);
    setAiMedia({});
    if (!textOnly && callSettings.cameraEnabled && !lowBandwidth) void session.videoCapture.startCapture();
    showToast("Starting session…", "success");

    try {
      const microphoneReady = textOnly ? (session.beginListening(), true) : await session.start();
      if (!microphoneReady) {
        session.videoCapture.stopCapture();
        return;
      }

      let currentInterview = selectedInterview;
      if (
        !currentInterview.messages ||
        currentInterview.messages.length === 0
      ) {
        const freshMessages = await prefetchMessages(currentInterview.id);
        if (generation !== startGenerationRef.current) return;
        currentInterview = { ...currentInterview, messages: freshMessages };
        setSelectedInterview(currentInterview);
      }

      if (generation !== startGenerationRef.current) return;

      const existing = currentInterview.messages || [];
      const lastAssistant = [...existing]
        .reverse()
        .find((m) => m.role === "assistant");

      if (lastAssistant) {
        await session.speakOpening(
          lastAssistant.content,
          extractMedia(lastAssistant),
        );
        return;
      }

      const focusInstruction = practiceFocus ? ` Please focus this practice on ${practiceFocus}; ask targeted questions and give me opportunities to improve in this area.` : "";
      const trigger = `Hello, I'm ready to begin a ${callSettings.difficulty}-level ${callSettings.interviewType} interview for about ${callSettings.durationMinutes} minutes.${focusInstruction} Please start by introducing yourself and asking your first question. Please speak in ${callSettings.language === "fr-CM" ? "French" : "English"}.`;
      const aiResponse = await interviewApi.sendMessage(selectedInterview.id, {
        role: "user",
        content: trigger,
        generate_audio: true,
      });
      if (generation !== startGenerationRef.current) return;

      const updatedMessages = [
        ...existing,
        {
          id: Date.now() - 1,
          interview_id: selectedInterview.id,
          role: "user",
          content: trigger,
          created_at: new Date().toISOString(),
        } as InterviewMessage,
        aiResponse,
      ];
      const updated = { ...selectedInterview, messages: updatedMessages };
      setSelectedInterview(updated);
      queryClient.setQueryData<Interview[]>(
        interviewKeys.list,
        (previous) =>
          previous?.map((interview) =>
            interview.id === selectedInterview.id ? updated : interview,
          ) ?? previous,
      );
      queryClient.setQueryData(
        interviewKeys.messages(selectedInterview.id),
        updatedMessages,
      );

      await session.speakOpening(aiResponse.content, extractMedia(aiResponse));
    } catch (err) {
      if (generation !== startGenerationRef.current) return;
      console.error("Failed to start interview:", err);
      showToast(
        err instanceof ApiError && [502, 503, 504].includes(err.status)
          ? "The interview service is temporarily unavailable. Your session is ready—try starting again shortly."
          : err instanceof ApiError
            ? err.message
            : "Could not reach the interview service. Check your connection and try starting again.",
        "error",
      );
      session.stop();
    } finally {
      if (generation === startGenerationRef.current)
        startLockRef.current = false;
    }
  };

  /* Jobs for the create modal — fetched lazily only when modal opens */
  const [modalJobsLoaded, setModalJobsLoaded] = useState(false);
  useEffect(() => {
    if (!showCreateModal || modalJobsLoaded) return;
    setModalJobsLoaded(true);
    setModalJobsLoading(true);
    setModalJobsError(null);
    jobApi
      .search({ limit: 50 })
      .then(setJobs)
      .catch(() =>
        setModalJobsError(
          "Could not load your saved jobs. Check your connection and retry.",
        ),
      )
      .finally(() => setModalJobsLoading(false));
  }, [showCreateModal, modalJobsLoaded]);

  /* Helpers */
  const getJobDetails = (jobId: string) => {
    const listedJob = jobs.find(
      (candidate) =>
        normalizeInterviewJobId(candidate.id) ===
        normalizeInterviewJobId(jobId),
    );
    if (listedJob) return listedJob;
    return normalizeInterviewJobId(jobId) ===
      normalizeInterviewJobId(activeInterviewJobId)
      ? selectedJobQuery.data
      : undefined;
  };
  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(d).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };
  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* Phase — mapped from session state machine */
  const phaseMap: Record<InterviewRuntimePhase, Phase> = {
    idle: "idle",
    preparing: "preparing",
    interviewer_speaking: "ai_speaking",
    user_listening: session.audioCapture.isListening
      ? "user_speaking"
      : "ready",
    processing: "processing",
    completed: "idle",
  };
  const phase: Phase = phaseMap[session.phase];

  const job = selectedInterview
    ? getJobDetails(selectedInterview.job_id)
    : null;
  const interviewServiceUnavailable =
    interviewsError instanceof ApiError
      ? [502, 503, 504].includes(interviewsError.status)
      : interviewsError instanceof TypeError;
  const requestedInterviewMissing =
    interviewIdParam !== null &&
    !isLoading &&
    !interviewsError &&
    !interviews.some((interview) => interview.id === Number(interviewIdParam));
  const userInitial = (user?.name || user?.email || "Y")[0].toUpperCase();
  const userName = user?.name || "You";
  const assistantTurns =
    selectedInterview?.messages?.filter(
      (message) => message.role === "assistant",
    ).length || 0;
  const latestAssistantText =
    [...(selectedInterview?.messages || [])]
      .reverse()
      .find((message) => message.role === "assistant")?.content || "";

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-primary animate-spin" />
          <p className="text-xs text-zinc-500 tracking-wide">
            Loading sessions…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-64px)]"
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @keyframes wf-pulse-ring {
          0%   { transform: scale(1);    opacity: 0.55; }
          80%  { transform: scale(1.6);  opacity: 0;    }
          100% { transform: scale(1.6);  opacity: 0;    }
        }
        @keyframes wf-bar {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1);    }
        }
        @keyframes wf-face-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes wf-avatar-blink { 0%, 46%, 50%, 100% { transform: scaleY(1); } 48% { transform: scaleY(0.08); } }
        .wf-face-idle { animation: wf-face-float 4s ease-in-out infinite; }
        .wf-avatar-blink { transform-box: fill-box; transform-origin: center; animation: wf-avatar-blink 5.2s ease-in-out infinite; }
        .wf-avatar-mouth { transform-box: fill-box; transform-origin: center; animation: wf-avatar-talk .34s ease-in-out infinite alternate; }
        @keyframes wf-avatar-talk { 0%, 100% { transform: scaleY(calc(var(--mouth-amplitude, .35) * .75)); } 50% { transform: scaleY(var(--mouth-amplitude, .35)); } }
        .wf-scrollbar::-webkit-scrollbar { width: 6px; }
        .wf-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .wf-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 6px; }
        .wf-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>

      {/* Single-column clean stage */}
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-black">
        <StageHeader
          interviews={interviews}
          selectedId={selectedInterview?.id || null}
          onSelect={selectInterview}
          onCreate={() => setShowCreateModal(true)}
          onDelete={handleDeleteInterview}
          onComplete={handleCompleteInterview}
          getJob={getJobDetails}
          formatRelative={formatRelative}
          isInterviewActive={session.isActive}
          phase={phase}
          elapsed={elapsed}
          formatElapsed={formatElapsed}
          onToggle={session.isActive ? stopAudioInterview : () => undefined}
          disabled={!session.isActive}
        />

        <main className="flex-1 min-h-0 overflow-y-auto wf-scrollbar">
          {dataError && (
            <div
              role="alert"
              className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {interviewsError
                    ? interviewServiceUnavailable
                      ? "The interview service is temporarily unavailable."
                      : "Your interview sessions could not be loaded."
                    : "Some interview details could not be loaded."}
                </p>
                <p className="mt-0.5 text-xs text-amber-100/70">
                  {interviewsError
                    ? "Check your connection and retry. We’ll confirm your saved sessions when the request succeeds."
                    : "You can continue, or retry to refresh the missing details."}
                </p>
              </div>
              <button
                onClick={() =>
                  void Promise.all([
                    queryClient.invalidateQueries({
                      queryKey: interviewKeys.list,
                    }),
                    queryClient.invalidateQueries({
                      queryKey: interviewKeys.boards,
                    }),
                  ])
                }
                className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-400/20"
              >
                Retry
              </button>
            </div>
          )}
          {selectedInterview ? (
            <div className="min-h-full flex flex-col">
              <div className="flex-1 px-4 sm:px-8 py-10 sm:py-14 flex flex-col items-center justify-center">
                {session.isActive ? (
                  <InterviewCallScreen
                    phase={phase}
                    elapsed={elapsed}
                    durationMinutes={callSettings.durationMinutes}
                    questionCount={assistantTurns}
                    totalQuestions={Math.max(
                      4,
                      Math.ceil(callSettings.durationMinutes / 5),
                    )}
                    userInitial={userInitial}
                    userName={userName}
                    attachVideo={session.videoCapture.attachVideo}
                    isCameraOn={session.videoCapture.isStreaming}
                    cameraError={session.videoCapture.error}
                    lowBandwidth={lowBandwidth}
                    aiMedia={{
                      ...aiMedia,
                      ...(lowBandwidth ? {
                        videoUrl: null,
                        videoData: null,
                        avatarImageUrl: null,
                        avatarImageData: null,
                      } : {}),
                      transcript:
                        aiMedia.transcript ||
                        (callSettings.captionsEnabled
                          ? latestAssistantText
                          : null),
                    }}
                    audioAmplitude={aiAmplitude}
                    captionsEnabled={callSettings.captionsEnabled}
                    onToggleCaptions={() =>
                      callSettings.setCaptionsEnabled(
                        !callSettings.captionsEnabled,
                      )
                    }
                    muted={callSettings.muted}
                    onToggleMute={() => {
                      const nextMuted = !callSettings.muted;
                      callSettings.setMuted(nextMuted);
                      session.setMuted(nextMuted);
                    }}
                    onToggleCamera={() => {
                      if (lowBandwidth) return;
                      const nextEnabled = !session.videoCapture.isStreaming;
                      callSettings.setCameraEnabled(nextEnabled);
                      if (nextEnabled) void session.videoCapture.startCapture();
                      else session.videoCapture.stopCapture();
                    }}
                    onEnd={stopAudioInterview}
                    isTextMode={speech.isTextFallback}
                    transcript={speech.transcript}
                    onSubmitText={session.submitText}
                    onPresenceMetrics={setPresenceMetrics}
                    connectionLabel={
                      isTextOnlyMode
                        ? "Text chat"
                        : speech.isTextFallback
                        ? "Text fallback"
                        : vad.isAvailable
                          ? "Voice connected"
                          : "Audio connected"
                    }
                  />
                ) : (
                  <InterviewLobby
                    jobTitle={job?.title}
                    onStart={() => startAudioInterview()}
                    onStartTextOnly={() => startAudioInterview(true)}
                  />
                )}

                {(session.error ||
                  session.audioCapture.error ||
                  speech.error ||
                  vad.error ||
                  selectedJobQuery.error) && (
                  <div className="mt-4 w-full max-w-2xl space-y-2">
                    {selectedJobQuery.isLoading && (
                      <Notice
                        tone="info"
                        msg="Loading role details for this session…"
                      />
                    )}
                    {selectedJobQuery.error && (
                      <Notice
                        tone="warn"
                        msg="Role details are unavailable right now. You can still practice in this session."
                      />
                    )}
                    {session.error && (
                      <Notice tone="warn" msg={session.error} />
                    )}
                    {session.audioCapture.error && (
                      <Notice tone="error" msg={session.audioCapture.error} />
                    )}
                    {speech.error && <Notice tone="warn" msg={speech.error} />}
                    {vad.error && (
                      <Notice
                        tone="info"
                        msg="Smart voice activity detection is unavailable; the call continues with browser audio detection."
                      />
                    )}
                  </div>
                )}
              </div>

              <StageFooter
                interviewId={selectedInterview.id}
                createdAt={selectedInterview.created_at}
                messageCount={selectedInterview.messages?.length || 0}
                status={selectedInterview.status}
                onComplete={() => handleCompleteInterview(selectedInterview.id)}
              />
            </div>
          ) : requestedInterviewMissing ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-white">
                This interview session wasn’t found
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                The session may have been removed or its link may be out of
                date. Choose another session or start a new one.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => router.push("/interviews")}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  View sessions
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-black transition hover:opacity-90"
                >
                  Start a session
                </button>
              </div>
            </div>
          ) : interviewsError ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                {interviewServiceUnavailable
                  ? "Sessions are temporarily unavailable"
                  : "We couldn’t load your sessions"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                We can&apos;t confirm whether you have existing sessions until
                this request succeeds. Check your connection, retry in a moment,
                or return to your dashboard.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() =>
                    void queryClient.invalidateQueries({
                      queryKey: interviewKeys.list,
                    })
                  }
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-black transition hover:opacity-90"
                >
                  Retry sessions
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          ) : (
            <EmptyStage onCreate={() => setShowCreateModal(true)} />
          )}
        </main>
      </div>

      {showCreateModal && (
        <CreateModal
          jobs={jobs}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
          isCreating={isCreating}
          jobsLoading={modalJobsLoading}
          jobsError={modalJobsError}
          onRetryJobs={() => setModalJobsLoaded(false)}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateInterview}
        />
      )}

      {/* Toasts */}
      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-60 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-red-500/30 text-red-400 rounded-xl shadow-lg text-[13px]">
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-60 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-primary/30 text-primary rounded-xl shadow-lg text-[13px]">
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}
    </div>
  );
}
