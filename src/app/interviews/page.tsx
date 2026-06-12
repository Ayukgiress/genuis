"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  interviewApi,
  jobApi,
  kanbanApi,
  ApiError,
  getAuthToken,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useInterviewWebSocket } from "@/hooks/useInterviewWebSocket";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import type { Interview, InterviewMessage, Job } from "@/types";
import { SessionPicker, StageHeader, type Phase } from "./_components";
import {
  InterviewStage,
  PhaseCaption,
  Notice,
  StageFooter,
  EmptyStage,
  CreateModal,
} from "./_components2";

/* ──────────────────────────────────────────────────────────────────────────
   Clean interview page — single-column, focused stage
   ────────────────────────────────────────────────────────────────────────── */

export default function InterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewIdParam = searchParams.get("id");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [localAiSpeaking, setLocalAiSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const audioPlayback = useAudioPlayback();

  const fetchInterviewMessages = useCallback(async (interviewId: number) => {
    try {
      const messages = await interviewApi.getMessages(interviewId);
      setInterviews((prev) =>
        prev.map((int) => (int.id === interviewId ? { ...int, messages } : int))
      );
      setSelectedInterview((prev) =>
        prev?.id === interviewId ? { ...prev, messages } : prev
      );
    } catch {}
  }, []);

  const {
    isConnected,
    isStreaming,
    connectionAttempted,
    audioCapture,
    isAiResponding,
    isTtsActive,
    isUserSpeaking,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream,
  } = useInterviewWebSocket(
    selectedInterview?.id || null,
    useCallback(() => {
      if (selectedInterview?.id) fetchInterviewMessages(selectedInterview.id);
    }, [selectedInterview?.id, fetchInterviewMessages])
  );

  /* Toast */
  const showToast = (msg: string, type: "error" | "success") => {
    if (type === "error") {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  /* Data loading */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [interviewsData, jobsData, boardsData] = await Promise.all([
        interviewApi.list(),
        jobApi.search({ limit: 50 }),
        kanbanApi.listBoards(),
      ]);
      setInterviews(interviewsData);
      setJobs(jobsData);
      setBoards(boardsData);
    } catch {
      showToast("Failed to load interviews.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) { router.push("/login"); return; }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  useEffect(() => {
    if (searchParams.get("action") === "new") setShowCreateModal(true);
  }, [searchParams]);

  useEffect(() => {
    if (interviews.length > 0 && !selectedInterview) {
      const target = interviewIdParam
        ? interviews.find((i) => i.id === parseInt(interviewIdParam))
        : interviews[0];
      if (target) {
        fetchInterviewMessages(target.id);
        setSelectedInterview(target);
      }
    }
  }, [interviews, fetchInterviewMessages, interviewIdParam, selectedInterview]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); setShowCreateModal(true); }
      if (e.key === "Escape") setShowCreateModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Elapsed timer */
  useEffect(() => {
    if (!isInterviewActive) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isInterviewActive]);

  /* Actions */
  const handleCreateInterview = async () => {
    if (!selectedJobId) return;
    try {
      setIsCreating(true);
      if (boards.length > 0) await jobApi.addToKanban(selectedJobId, boards[0].id, "review");
      const newInterview = await interviewApi.create({ job_id: selectedJobId });
      setInterviews((prev) => [newInterview, ...prev]);
      setSelectedInterview(newInterview);
      setShowCreateModal(false);
      setSelectedJobId("");
      showToast("Session created", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm("Delete this session?")) return;
    try {
      await interviewApi.delete(interviewId);
      setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
      if (selectedInterview?.id === interviewId) setSelectedInterview(null);
      showToast("Deleted", "success");
    } catch { showToast("Failed to delete", "error"); }
  };

  const handleCompleteInterview = async (interviewId: number) => {
    try {
      await interviewApi.complete(interviewId);
      setInterviews((prev) =>
        prev.map((i) => i.id === interviewId ? { ...i, status: "completed" } : i)
      );
      if (selectedInterview?.id === interviewId)
        setSelectedInterview({ ...selectedInterview, status: "completed" });
      showToast("Marked complete", "success");
    } catch { showToast("Failed", "error"); }
  };

  const stopAudioInterview = useCallback(() => {
    stopAudioStream();
    disconnect();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setLocalAiSpeaking(false);
    setIsInterviewActive(false);
  }, [stopAudioStream, disconnect]);

  const selectInterview = (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    stopAudioInterview();
    setSelectedInterview(interview);
    if (!interview.messages) fetchInterviewMessages(interview.id);
  };

  const startAudioInterview = async () => {
    if (!selectedInterview || isInterviewActive) return;
    setIsInterviewActive(true);
    showToast("Starting session…", "success");

    try {
      connect();

      let currentInterview = selectedInterview;
      if (!currentInterview.messages || currentInterview.messages.length === 0) {
        const freshMessages = await interviewApi.getMessages(currentInterview.id);
        currentInterview = { ...currentInterview, messages: freshMessages };
        setSelectedInterview(currentInterview);
      }

      const existing = currentInterview.messages || [];
      const lastAssistant = [...existing].reverse().find((m) => m.role === "assistant");

      if (lastAssistant) {
        const handleAiSpeaking = async (content: string, audioData?: string) => {
          setLocalAiSpeaking(true);
          if (audioData) {
            try {
              await audioPlayback.playAudio(audioData, "audio/webm", () => {
                setLocalAiSpeaking(false);
                startAudioStream();
              });
              return true;
            } catch (e) {
              console.warn("Failed to play audio data, falling back to TTS", e);
            }
          }
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            setLocalAiSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(content);
            utterance.onend = () => { setLocalAiSpeaking(false); startAudioStream(); };
            utterance.onerror = () => { setLocalAiSpeaking(false); startAudioStream(); };
            window.speechSynthesis.speak(utterance);
            return true;
          }
          setLocalAiSpeaking(false);
          return false;
        };

        const spoke = await handleAiSpeaking(lastAssistant.content, lastAssistant.audio_data);
        if (spoke) return;
      }

      const trigger = "Hello, I'm ready to begin the interview. Please start by introducing yourself and asking your first question.";
      const aiResponse = await interviewApi.sendMessage(selectedInterview.id, {
        role: "user", content: trigger, generate_audio: true,
      } as any);

      const updatedMessages = [
        ...existing,
        { id: Date.now() - 1, interview_id: selectedInterview.id, role: "user", content: trigger, created_at: new Date().toISOString() } as InterviewMessage,
        aiResponse,
      ];
      const updated = { ...selectedInterview, messages: updatedMessages };
      setSelectedInterview(updated);
      setInterviews((prev) => prev.map((i) => i.id === selectedInterview.id ? updated : i));

      if (aiResponse.audio_data) {
        setLocalAiSpeaking(true);
        await audioPlayback.playAudio(aiResponse.audio_data, "audio/webm", () => {
          setLocalAiSpeaking(false);
          startAudioStream();
        });
      } else if (aiResponse.content) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          setLocalAiSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(aiResponse.content);
          utterance.onend = () => { setLocalAiSpeaking(false); startAudioStream(); };
          utterance.onerror = () => { setLocalAiSpeaking(false); startAudioStream(); };
          window.speechSynthesis.speak(utterance);
        } else {
          startAudioStream();
        }
      } else {
        startAudioStream();
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
      showToast("Failed to start", "error");
      setIsInterviewActive(false);
    }
  };

  /* Helpers */
  const getJobDetails = (jobId: string) => jobs.find((j) => j.id === jobId);
  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* Phase — single source of truth for the speaking indicator */
  const phase: Phase = !isInterviewActive
    ? "idle"
    : isAiResponding || localAiSpeaking || isTtsActive
      ? "ai_speaking"
      : isUserSpeaking
        ? "user_speaking"
        : isStreaming && audioCapture.isListening
          ? "user_speaking"
          : "ready";

  const job = selectedInterview ? getJobDetails(selectedInterview.job_id) : null;
  const userInitial = (user?.name || user?.email || "Y")[0].toUpperCase();
  const userName = user?.name || "You";

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-primary animate-spin" />
          <p className="text-xs text-zinc-500 tracking-wide">Loading sessions…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-64px)]"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}
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
          job={job}
          isInterviewActive={isInterviewActive}
          phase={phase}
          elapsed={elapsed}
          formatElapsed={formatElapsed}
          onToggle={isInterviewActive ? stopAudioInterview : startAudioInterview}
          disabled={!!audioCapture.error}
        />

        <main className="flex-1 min-h-0 overflow-y-auto wf-scrollbar">
          {selectedInterview ? (
            <div className="min-h-full flex flex-col">
              <div className="flex-1 px-4 sm:px-8 py-10 sm:py-14 flex flex-col items-center justify-center">
                <InterviewStage
                  phase={phase}
                  isInterviewActive={isInterviewActive}
                  job={job}
                  userInitial={userInitial}
                  userName={userName}
                  onToggle={isInterviewActive ? stopAudioInterview : startAudioInterview}
                  disabled={!!audioCapture.error}
                />

                <PhaseCaption phase={phase} isActive={isInterviewActive} jobTitle={job?.title} />

                <div className="mt-6 w-full max-w-md space-y-2">
                  {connectionAttempted && !isConnected && (
                    <Notice tone="warn" msg="Audio endpoint unavailable — running in limited mode" />
                  )}
                  {audioCapture.error && <Notice tone="error" msg={audioCapture.error} />}
                </div>
              </div>

              <StageFooter
                interviewId={selectedInterview.id}
                createdAt={selectedInterview.created_at}
                messageCount={selectedInterview.messages?.length || 0}
                status={selectedInterview.status}
                onComplete={() => handleCompleteInterview(selectedInterview.id)}
              />
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
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateInterview}
        />
      )}

      {/* Toasts */}
      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-red-500/30 text-red-400 rounded-xl shadow-lg text-[13px]">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-primary/30 text-primary rounded-xl shadow-lg text-[13px]">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}
    </div>
  );
}
