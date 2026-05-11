"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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

export default function InterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewIdParam = searchParams.get("id");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localAiSpeaking, setLocalAiSpeaking] = useState(false);

  const audioPlayback = useAudioPlayback();

  const fetchInterviewMessages = useCallback(async (interviewId: number) => {
    try {
      const messages = await interviewApi.getMessages(interviewId);
      setInterviews((prev) =>
        prev.map((int) => (int.id === interviewId ? { ...int, messages } : int))
      );
      setSelectedInterview((prev) => (prev?.id === interviewId ? { ...prev, messages } : prev));
    } catch {}
  }, []);

  const {
    isConnected,
    isStreaming,
    connectionAttempted,
    audioCapture,
    error: audioError,
    isAiResponding,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream,
  } = useInterviewWebSocket(
    selectedInterview?.id || null,
    useCallback(() => {
      if (selectedInterview?.id) {
        fetchInterviewMessages(selectedInterview.id);
      }
    }, [selectedInterview?.id, fetchInterviewMessages])
  );

  const showToast = (msg: string, type: "error" | "success") => {
    if (type === "error") {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

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
      if (interviewIdParam) {
        const interview = interviews.find((i) => i.id === parseInt(interviewIdParam));
        if (interview) {
          fetchInterviewMessages(interview.id);
          setSelectedInterview(interview);
          return;
        }
      }
      const first = interviews[0];
      fetchInterviewMessages(first.id);
      setSelectedInterview(first);
    }
  }, [interviews, fetchInterviewMessages, interviewIdParam, selectedInterview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N to create new session
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setSidebarOpen(false);
      }
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      showToast("Interview session created!", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create", "error");
    } finally { setIsCreating(false); }
  };

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm("Delete this session?")) return;
    try {
      await interviewApi.delete(interviewId);
      setInterviews((prev) => prev.filter((int) => int.id !== interviewId));
      if (selectedInterview?.id === interviewId) setSelectedInterview(null);
      showToast("Session deleted", "success");
    } catch { showToast("Failed to delete", "error"); }
  };

  const handleCompleteInterview = async (interviewId: number) => {
    try {
      await interviewApi.complete(interviewId);
      setInterviews((prev) => prev.map((int) =>
        int.id === interviewId ? { ...int, status: 'completed' } : int
      ));
      if (selectedInterview?.id === interviewId) {
        setSelectedInterview({ ...selectedInterview, status: 'completed' });
      }
      showToast("Interview completed!", "success");
    } catch { showToast("Failed to complete interview", "error"); }
  };

  const selectInterview = (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    stopAudioInterview();
    disconnect();
    setIsInterviewActive(false);
    setSelectedInterview(interview);
    if (!interview.messages) fetchInterviewMessages(interview.id);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const startAudioInterview = async () => {
    if (!selectedInterview || isInterviewActive) return;
    setIsInterviewActive(true);
    showToast("🎤 Starting conversational interview...", "success");
    
    try {
      // Connect first so we're ready
      connect();

      // Ensure we have messages
      let currentInterview = selectedInterview;
      if (!currentInterview.messages || currentInterview.messages.length === 0) {
        const freshMessages = await interviewApi.getMessages(currentInterview.id);
        currentInterview = { ...currentInterview, messages: freshMessages };
        setSelectedInterview(currentInterview);
      }

      const existingMessages = currentInterview.messages || [];
      
      // If there's already an assistant message (likely the one created on creation), play it
      const lastAssistantMsg = [...existingMessages].reverse().find(m => m.role === 'assistant');
      
      if (lastAssistantMsg) {
        console.log("🔊 Playing initial assistant message");
        
        // Use a function to handle the speaking state
        const handleAiSpeaking = async (content: string, audioData?: string) => {
          setLocalAiSpeaking(true);
          
          if (audioData) {
            try {
              await audioPlayback.playAudio(audioData, "audio/webm", () => {
                setLocalAiSpeaking(false);
                startAudioStream();
                showToast("🎤 AI has started - you can now respond!", "success");
              });
              return true;
            } catch (e) {
              console.warn("Failed to play audio data, falling back to TTS", e);
            }
          }
          
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(content);
            utterance.onend = () => {
              setLocalAiSpeaking(false);
              startAudioStream();
              showToast("🎤 AI has started - you can now respond!", "success");
            };
            utterance.onerror = () => setLocalAiSpeaking(false);
            window.speechSynthesis.speak(utterance);
            return true;
          }
          setLocalAiSpeaking(false);
          return false;
        };

        const spoke = await handleAiSpeaking(lastAssistantMsg.content, lastAssistantMsg.audio_data);
        if (spoke) return;
      }

      // If no audio message to play, or playback failed, trigger a new one
      const initialTriggerMsg = "Hello, I'm ready to begin the interview. Please start by introducing yourself and asking your first question.";
      
      const aiResponse = await interviewApi.sendMessage(selectedInterview.id, {
        role: "user",
        content: initialTriggerMsg,
        generate_audio: true,
      } as any);

      // Update local state with new messages
      const updatedMessages = [...existingMessages, {
        id: Date.now() - 1,
        interview_id: selectedInterview.id,
        role: "user",
        content: initialTriggerMsg,
        created_at: new Date().toISOString()
      } as InterviewMessage, aiResponse];

      const updatedInterview = { ...selectedInterview, messages: updatedMessages };
      setSelectedInterview(updatedInterview);
      setInterviews((prev) => prev.map((int) => int.id === selectedInterview.id ? updatedInterview : int));

      if (aiResponse.audio_data) {
        setLocalAiSpeaking(true);
        await audioPlayback.playAudio(aiResponse.audio_data, "audio/webm", () => {
          setLocalAiSpeaking(false);
          startAudioStream();
          showToast("🎤 AI has started - you can now respond!", "success");
        });
      } else if (aiResponse.content) {
        // Fallback to browser TTS for new AI response
        console.log("🔊 Falling back to browser TTS for new AI response");
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          setLocalAiSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(aiResponse.content);
          utterance.onend = () => {
            setLocalAiSpeaking(false);
            startAudioStream();
            showToast("🎤 AI has started - you can now respond!", "success");
          };
          utterance.onerror = () => setLocalAiSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          startAudioStream();
        }
      } else {
        startAudioStream();
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
      showToast("Failed to start interview", "error");
      setIsInterviewActive(false);
    }
  };

  const stopAudioInterview = () => {
    stopAudioStream();
    disconnect();
    setIsInterviewActive(false);
    showToast("Interview ended", "success");
  };

  const getJobDetails = (jobId: string) => jobs.find((job) => job.id === jobId);
  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });

  const WaveIndicator = ({ isActive, isSpeaking, label, isAi = false }: { isActive: boolean; isSpeaking: boolean; label: string; isAi?: boolean }) => (
    <div className={`flex flex-col items-center justify-center gap-6 py-6 px-8 rounded-3xl transition-all duration-700 ${
      isActive && isSpeaking 
        ? 'scale-105 bg-primary/5 ring-1 ring-primary/20 shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]' 
        : 'opacity-50 grayscale-[0.5]'
    }`}>
      <div className="relative flex items-center justify-center h-48 w-48">
        {/* Speaking Status Badge */}
        {isActive && isSpeaking && (
          <div className="absolute -top-4 px-3 py-1 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-full z-20 shadow-[0_4px_12px_rgba(var(--primary-rgb),0.4)] animate-bounce">
            Speaking...
          </div>
        )}
        
        {/* Animated circles for waves */}
        {isActive && isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75" />
            <div className="absolute inset-[-10%] rounded-full border border-primary/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />
            <div className="absolute inset-[-20%] rounded-full border border-primary/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-25" />
            
            {/* Dynamic glow */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          </>
        )}
        
        {/* Core indicator */}
        <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
          isActive 
            ? isSpeaking 
              ? 'bg-primary shadow-[0_0_60px_rgba(var(--primary-rgb),0.6)] scale-110' 
              : 'bg-zinc-800 border-2 border-primary/30'
            : 'bg-zinc-900 border border-zinc-800'
        }`}>
          {isAi ? (
            <div className={`transition-colors duration-500 ${isActive && isSpeaking ? 'text-black' : 'text-zinc-500'}`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" className={isActive && isSpeaking ? 'animate-pulse' : ''} />
              </svg>
            </div>
          ) : (
            <div className={`transition-colors duration-500 ${isActive && isSpeaking ? 'text-black' : 'text-zinc-500'}`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500 ${isActive && isSpeaking ? 'text-primary' : 'text-zinc-500'}`}>
          {label}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-3 h-4">
          {isActive && isSpeaking ? (
            <div className="flex gap-1 items-end h-full">
              {[0.5, 0.8, 0.6, 1, 0.7, 0.9].map((delay, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-full animate-[bounce_1s_infinite]" 
                  style={{ 
                    height: `${20 + (i * 13) % 80}%`,
                    animationDelay: `${delay}s` 
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="h-0.5 w-8 bg-zinc-800 rounded-full transition-all duration-500" />
          )}
        </div>
      </div>
    </div>
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header skeleton */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800/60 bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <div className="h-7 w-36 bg-zinc-800/70 rounded-lg animate-pulse" />
            <div className="h-5 w-20 bg-zinc-800/50 rounded animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-zinc-800/60 rounded-lg animate-pulse" />
        </header>
        {/* Body skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-72 border-r border-zinc-800/60 p-5 space-y-3 hidden lg:block bg-zinc-900/20">
            <div className="h-4 w-28 bg-zinc-800/60 rounded animate-pulse mb-5" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/30 animate-pulse space-y-2">
                <div className="h-4 w-3/4 bg-zinc-800/70 rounded" />
                <div className="h-3 w-1/2 bg-zinc-800/60 rounded" />
                <div className="flex justify-between mt-2">
                  <div className="h-5 w-16 bg-zinc-800/60 rounded-full" />
                  <div className="h-3 w-14 bg-zinc-800/50 rounded" />
                </div>
              </div>
            ))}
          </aside>
          {/* Main */}
          <main className="flex-1 flex flex-col bg-zinc-950">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-zinc-800/40 border-2 border-zinc-700/40 animate-pulse" />
            </div>
            <div className="h-24 border-t border-zinc-800/50 bg-zinc-900/30 flex items-center px-6">
              <div className="w-full h-12 bg-zinc-800/50 rounded-xl animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const job = selectedInterview ? getJobDetails(selectedInterview.job_id) : null;
  const messages = selectedInterview?.messages || [];

  // ── Status indicator helpers ─────────────────────────────────────────────
  const statusLabel = isInterviewActive
    ? isAiResponding ? "AI Speaking" : isStreaming && audioCapture.isListening ? "Listening" : "Ready"
    : "Standby";

  const statusColor = isInterviewActive
    ? isAiResponding ? "text-primary" : isStreaming && audioCapture.isListening ? "text-emerald-400" : "text-zinc-300"
    : "text-zinc-500";

  const statusDot = isInterviewActive
    ? isAiResponding ? "bg-primary animate-pulse" : isStreaming && audioCapture.isListening ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
    : "bg-zinc-600";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-300px] right-[-200px] w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-8 h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
              {/* Icon mark */}
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                </svg>
              </div>
              <span className="text-[17px] font-black tracking-tight">
                Interview <span className="text-primary">Studio</span>
              </span>
            </div>
            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary rounded-md">
                Voice AI
              </span>
              {isConnected && (
                <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Live
                </span>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="text-xs font-mono text-zinc-500 hidden sm:block">
              {interviews.length} session{interviews.length !== 1 ? "s" : ""}
            </span>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-sm font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all"
              onClick={() => setShowCreateModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Session
            </button>
          </div>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Sessions Sidebar ─────────────────────────────────────────── */}
          <aside className={`w-[260px] xl:w-[280px] shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-900/20 z-50 transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:relative inset-y-0 left-0 lg:flex`}>
            {/* Sidebar header */}
            <div className="px-4 py-3.5 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sessions</span>
                <span className="text-[9px] font-mono text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded-md tabular-nums">
                  {interviews.length}
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-6 h-6 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center text-primary hover:bg-primary/25 transition-all"
                title="New session"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {interviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 py-12">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-zinc-500">No sessions yet</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Create one to get started</p>
                  </div>
                </div>
              ) : (
                interviews.map((iv) => {
                  const j = getJobDetails(iv.job_id);
                  const active = selectedInterview?.id === iv.id;
                  const msgCount = iv.messages?.length ?? 0;
                  const lastMsg = iv.messages?.[iv.messages.length - 1];
                  const companyInitial = (j?.company || j?.title || "?")[0].toUpperCase();
                  const isCompleted = iv.status === "completed";

                  return (
                    <div
                      key={iv.id}
                      onClick={() => selectInterview(iv)}
                      className={`group relative rounded-xl cursor-pointer transition-all duration-150 ${
                        active
                          ? "bg-zinc-800/60 border border-zinc-700/50"
                          : "hover:bg-zinc-800/30 border border-transparent"
                      }`}
                    >
                      {/* Active left bar */}
                      {active && (
                        <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-primary rounded-r-full" />
                      )}

                      <div className="px-3 py-3 pl-4">
                        {/* Top row: avatar + title + delete */}
                        <div className="flex items-start gap-2.5">
                          {/* Company avatar */}
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-black border transition-all ${
                            active
                              ? "bg-primary/20 border-primary/30 text-primary"
                              : "bg-zinc-800/80 border-zinc-700/50 text-zinc-400 group-hover:border-zinc-600/60"
                          }`}>
                            {companyInitial}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className={`text-[13px] font-semibold truncate leading-tight transition-colors ${
                              active ? "text-zinc-50" : "text-zinc-300 group-hover:text-zinc-100"
                            }`}>
                              {j?.title || "Practice Session"}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate mt-0.5">{j?.company || "—"}</div>
                          </div>

                           <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-0.5">
                             {!isCompleted && (iv.messages?.length ?? 0) > 0 && (
                               <button
                                 className="w-4 h-4 rounded flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs leading-none shrink-0"
                                 onClick={(e) => { e.stopPropagation(); handleCompleteInterview(iv.id); }}
                                 title="Mark as completed"
                               >
                                 ✓
                               </button>
                             )}
                             <button
                               className="w-4 h-4 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs leading-none shrink-0"
                               onClick={(e) => { e.stopPropagation(); handleDeleteInterview(iv.id); }}
                               title="Delete"
                             >
                               ×
                             </button>
                           </div>
                        </div>

                        {/* Bottom row: status + meta */}
                        <div className="flex items-center gap-2 mt-2.5 ml-[42px]">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                            isCompleted
                              ? "bg-zinc-800/60 text-zinc-500 border border-zinc-700/40"
                              : (iv.messages?.length ?? 0) > 0
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}>
                            <span className={`w-1 h-1 rounded-full inline-block ${
                              isCompleted
                                ? "bg-zinc-500"
                                : (iv.messages?.length ?? 0) > 0
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-primary animate-pulse"
                            }`} />
                            {isCompleted ? "Completed" : (iv.messages?.length ?? 0) > 0 ? "In Progress" : "Ready"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-700 ml-auto">{formatDate(iv.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Main Stage ──────────────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {selectedInterview ? (
              <div className="flex flex-col h-full">
                {/* Interview job info bar */}
                {job && (
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800/50 bg-zinc-900/30 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                      {(job.company || "?")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate text-zinc-100">{job.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{job.company}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`flex items-center gap-1.5 text-xs font-mono ${statusColor}`}>
                        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </div>
                      {/* Audio toggle */}
                      <button
                        onClick={isInterviewActive ? stopAudioInterview : startAudioInterview}
                        disabled={!!audioCapture.error}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isInterviewActive
                            ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15"
                            : "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                        </svg>
                        {isInterviewActive ? "Stop" : "Start"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Main content area - Audio Only */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl px-4">
                    {/* AI Wave */}
                    <div className="flex flex-col items-center">
                      <WaveIndicator 
                        isActive={isInterviewActive} 
                        isSpeaking={isAiResponding || localAiSpeaking} 
                        label="AI Interviewer" 
                        isAi={true} 
                      />
                    </div>

                    {/* User Wave */}
                    <div className="flex flex-col items-center">
                      <WaveIndicator 
                        isActive={isInterviewActive} 
                        isSpeaking={isStreaming && audioCapture.isListening} 
                        label="You" 
                      />
                    </div>
                  </div>

                  {/* Central Control */}
                  <div className="flex flex-col items-center gap-6 w-full max-w-md">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={isInterviewActive ? stopAudioInterview : startAudioInterview}
                        disabled={!!audioCapture.error}
                        className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                          isInterviewActive
                            ? "bg-red-500/10 border-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            : "bg-primary border-2 border-primary text-black hover:scale-105 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isInterviewActive ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                        ) : (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="text-center">
                      <h2 className={`text-lg font-bold transition-colors duration-300 ${isInterviewActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                        {isInterviewActive ? "Interview in Progress" : "Ready to Start"}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-1">
                        {isInterviewActive 
                          ? isAiResponding ? "Listen to the interviewer..." : "Speak your answer now."
                          : "Click the microphone to begin your audio session."}
                      </p>
                    </div>

                    {/* Connection/Error messages */}
                    <div className="w-full space-y-2">
                      {connectionAttempted && !isConnected && (
                        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 w-full justify-center">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          Audio endpoint unavailable
                        </div>
                      )}
                      {audioCapture.error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 w-full justify-center">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {audioCapture.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full gap-6 text-zinc-500 px-8">
                <div className="w-24 h-24 rounded-2xl bg-zinc-800/40 border border-zinc-700/40 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
                <div className="text-center max-w-md">
                  <h3 className="text-xl font-bold text-zinc-200 mb-2">Ready to Practice?</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Pick a session on the left, or create a new one.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-800/80 hover:border-zinc-600 transition-all"
                    >
                      View Sessions
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2.5 bg-primary text-black text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
                    >
                      New Interview
                    </button>
                  </div>
                 </div>
               </div>

            )}
          </main>


        </div>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-5 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/60">
            {/* Modal header */}
            <div className="flex items-start justify-between p-7 pb-5 border-b border-zinc-800/60">
              <div>
                <h3 className="text-xl font-black tracking-tight mb-1">New Interview Session</h3>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Select a job to practice for</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-lg leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            <div className="p-7 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5">
                  Job Position
                </label>
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2371717a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                      paddingRight: "40px",
                    }}
                  >
                    <option value="">Choose a role…</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title} @ {job.company}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700/60 bg-transparent text-sm text-zinc-300 font-medium hover:bg-zinc-800/50 hover:border-zinc-600 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInterview}
                  disabled={!selectedJobId || isCreating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                      Creating…
                    </span>
                  ) : "Create Session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-red-500/30 text-red-400 rounded-xl font-mono text-xs tracking-wide shadow-xl z-[60] animate-in slide-in-from-bottom-3 duration-200">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-primary/30 text-primary rounded-xl font-mono text-xs tracking-wide shadow-xl z-[60] animate-in slide-in-from-bottom-3 duration-200">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {success}
        </div>
      )}
    </div>
  );
}
