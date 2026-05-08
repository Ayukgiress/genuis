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
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [hideAIMessages, setHideAIMessages] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);

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
    stopAudioStream
  } = useInterviewWebSocket(selectedInterview?.id || null);

  const showToast = (msg: string, type: "error" | "success") => {
    if (type === "error") { setError(msg); setTimeout(() => setError(null), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [interviewsData, jobsData, boardsData] = await Promise.all([
        interviewApi.list(), jobApi.search({ limit: 50 }), kanbanApi.listBoards(),
      ]);
      setInterviews(interviewsData);
      setJobs(jobsData);
      setBoards(boardsData);
    } catch { showToast("Failed to load interviews.", "error"); }
    finally { setIsLoading(false); }
  }, []);

  const fetchInterviewMessages = useCallback(async (interviewId: number) => {
    try {
      const messages = await interviewApi.getMessages(interviewId);
      setInterviews((prev) => prev.map((int) => int.id === interviewId ? { ...int, messages } : int));
      setSelectedInterview((prev) => prev?.id === interviewId ? { ...prev, messages } : prev);
    } catch {}
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) { router.push("/login"); return; }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowCreateModal(true);
    }
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedInterview?.messages]);

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

  const handleSendMessage = async () => {
    if (!selectedInterview || !newMessage.trim()) return;
    try {
      setIsSending(true);
      const userMessage: InterviewMessage = {
        id: Date.now(), interview_id: selectedInterview.id, role: "user",
        content: newMessage.trim(), created_at: new Date().toISOString(),
      };
      const tempInterview = { ...selectedInterview, messages: [...(selectedInterview.messages || []), userMessage] };
      setSelectedInterview(tempInterview);
      setNewMessage("");
      const aiMessage = await interviewApi.sendMessage(selectedInterview.id, { role: "user", content: userMessage.content });
      const finalInterview = { ...tempInterview, messages: [...tempInterview.messages, aiMessage] };
      setSelectedInterview(finalInterview);
      setInterviews((prev) => prev.map((int) => int.id === selectedInterview.id ? finalInterview : int));
      if (aiMessage.content?.includes("[INTERVIEW_COMPLETE]")) {
        await interviewApi.complete(selectedInterview.id);
        showToast("Interview completed!", "success");
      }
    } catch { showToast("Failed to send message", "error"); }
    finally { setIsSending(false); }
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

  const selectInterview = (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    stopAudioInterview();
    disconnect();
    setIsInterviewActive(false);
    setSelectedInterview(interview);
    if (!interview.messages) fetchInterviewMessages(interview.id);
  };

  const startAudioInterview = async () => {
    if (!selectedInterview || isInterviewActive) return;
    setIsInterviewActive(true);
    setNewMessage("");
    showToast("🎤 Starting conversational interview...", "success");

    try {
      // Send initial message to trigger AI to start the conversation
      const initialMessage: InterviewMessage = {
        id: Date.now(),
        interview_id: selectedInterview.id,
        role: "user",
        content: "Hello, I'm ready to begin the interview. Please start by introducing yourself and asking your first question.",
        created_at: new Date().toISOString(),
      };

      // Add user message to UI
      const tempInterview = { ...selectedInterview, messages: [...(selectedInterview.messages || []), initialMessage] };
      setSelectedInterview(tempInterview);

      // Send to API
      const aiResponse = await interviewApi.sendMessage(selectedInterview.id, {
        role: "user",
        content: initialMessage.content
      });

      // Add AI response
      const finalInterview = { ...tempInterview, messages: [...tempInterview.messages, aiResponse] };
      setSelectedInterview(finalInterview);
      setInterviews((prev) => prev.map((int) => int.id === selectedInterview.id ? finalInterview : int));

      // Now start audio capture after AI has responded
      connect();
      setTimeout(() => {
        startAudioStream();
        showToast("🎤 AI has started - you can now respond!", "success");
      }, 2000); // Give time for AI audio to play

    } catch (err) {
      console.error('Failed to start interview:', err);
      showToast("Failed to start interview", "error");
      setIsInterviewActive(false);
    }
  };

  const stopAudioInterview = () => {
    console.log('🛑 Stopping conversational interview');
    stopAudioStream();
    disconnect();
    setIsInterviewActive(false);
    showToast("Interview ended", "success");
  };

  const getJobDetails = (jobId: number) => jobs.find((job) => job.id === jobId.toString());
  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-mono text-xs uppercase tracking-widest">Loading sessions...</p>
        </div>
      </div>
    );
  }

  const job = selectedInterview ? getJobDetails(selectedInterview.job_id) : null;
  const messages = selectedInterview?.messages || [];
  const visibleMessages = hideAIMessages ? messages.filter((m) => m.role === "user") : messages;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="relative">
        {/* Ambient orb effect */}
        <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] bg-primary/7 rounded-full pointer-events-none z-0" />

        <div className="relative z-10 grid grid-cols-[280px_1fr_300px] grid-rows-[72px_1fr] h-screen gap-0 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_300px]">

          {/* ── Top bar ── */}
          <header className="col-span-full flex items-center justify-between px-8 py-0 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <span className="text-xl font-black tracking-tight">inter<span className="text-primary">view</span>.ai</span>
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/12 border border-primary/25 text-primary rounded">
                Voice AI
              </span>
              {isConnected && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/12 border border-primary/40 text-primary rounded">
                  ● WS Connected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-6 py-2 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all text-sm"
                onClick={() => setShowCreateModal(true)}
              >
                + New Session
              </button>
            </div>
          </header>

          {/* ── Sessions Sidebar ── */}
          <aside className="row-start-2 border-r border-zinc-800/50 overflow-y-auto p-6 bg-zinc-900/30 hidden lg:block">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pb-4 mb-4 border-b border-zinc-800/50">
              Sessions · {interviews.length}
            </div>
            {interviews.length === 0 && (
              <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                No sessions yet
              </div>
            )}
            <div className="space-y-3">
              {interviews.map((iv) => {
                const j = getJobDetails(iv.job_id);
                const active = selectedInterview?.id === iv.id;
                return (
                  <div
                    key={iv.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      active
                        ? "bg-primary/12 border-primary/25"
                        : "bg-zinc-800/30 border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50"
                    }`}
                    onClick={() => selectInterview(iv)}
                  >
                    <div className="font-bold text-sm mb-1 truncate">{j?.title || "Practice Session"}</div>
                    <div className="text-xs text-zinc-500 mb-3">{j?.company || "—"}</div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded-full tracking-wide ${
                        iv.status === "completed"
                          ? "bg-zinc-800/50 text-zinc-400"
                          : "bg-primary/12 text-primary border border-primary/25"
                      }`}>
                        {iv.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-zinc-500">{formatDate(iv.created_at)}</span>
                        <button
                          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          onClick={(e) => { e.stopPropagation(); handleDeleteInterview(iv.id); }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── Audio Stage ── */}
          <main className="row-start-2 flex flex-col overflow-hidden">
            {selectedInterview ? (
              <>
                {/* Audio Interview Area */}
                <div className="flex-1 relative bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center overflow-hidden">
                  <div className="flex flex-col items-center gap-6 text-white">
                    <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center transition-all duration-300">
                      {isStreaming ? (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-5 bg-primary rounded animate-pulse"></div>
                          <div className="w-1 h-8 bg-primary rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-5 bg-primary rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-8 bg-primary rounded animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-1 h-5 bg-primary rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      ) : (
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary opacity-70">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </div>
                    <div className="font-mono text-sm uppercase tracking-wider text-zinc-400">
                      {isStreaming ? "Listening..." : "Ready to Start"}
                    </div>
                  </div>

                  {audioCapture.error && (
                    <div className="absolute top-5 right-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 font-mono text-sm text-red-500">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p>{audioCapture.error}</p>
                    </div>
                  )}

                  {isStreaming && audioCapture.isListening && (
                    <div className="absolute top-5 left-5 flex items-center gap-3 bg-black/70 backdrop-blur-lg border border-red-500/30 rounded-lg px-4 py-2 font-mono text-xs text-red-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      🎤 LISTENING
                    </div>
                  )}
                  {isAiResponding && (
                    <div className="absolute top-5 left-5 flex items-center gap-3 bg-black/70 backdrop-blur-lg border border-primary/30 rounded-lg px-4 py-2 font-mono text-xs text-primary">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      🤖 AI SPEAKING
                    </div>
                  )}
                  <div className="absolute top-5 right-5 flex items-center gap-3 bg-black/70 backdrop-blur-lg border border-primary/30 rounded-lg px-4 py-2 font-mono text-xs text-primary">
                    <div className={`w-2 h-2 rounded-full ${isInterviewActive ? "bg-primary animate-pulse" : "bg-zinc-500"}`}></div>
                    <span>
                      {isInterviewActive
                        ? (isAiResponding
                            ? "AI RESPONDING"
                            : audioCapture.isListening
                              ? "LISTENING"
                              : "READY TO LISTEN")
                        : "STANDBY"}
                    </span>
                  </div>

                  {/* Job overlay */}
                  {job && (
                    <div className="absolute bottom-5 left-5 bg-black/70 backdrop-blur-lg border border-zinc-700/50 rounded-xl px-4 py-3">
                      <div className="font-bold text-sm">{job.title}</div>
                      <div className="font-mono text-xs text-zinc-500 mt-1">{job.company}</div>
                    </div>
                  )}
                </div>

                {/* Controls bar */}
                <div className="bg-zinc-900/50 border-t border-zinc-800/50 p-6 flex items-center gap-4">
                  {isInterviewActive ? (
                    <>
                      <div className="text-center mb-4 p-4 bg-black/30 border border-zinc-700/50 rounded-lg w-full">
                        <div className="text-sm font-semibold mb-2">
                          🎭 Conversational Interview Active
                        </div>
                        <div className="text-xs text-zinc-500 leading-relaxed">
                          Speak naturally when you hear the AI. The conversation flows automatically.
                        </div>
                      </div>

                      <button
                        className="w-full py-3 border border-red-500/30 bg-red-500/8 text-red-500 rounded-xl hover:bg-red-500/18 transition-all text-sm font-semibold"
                        onClick={stopAudioInterview}
                      >
                        🛑 End Interview
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-4">
                      <button
                        className="h-14 px-8 bg-gradient-to-r from-primary to-primary/80 text-black font-black rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-3 text-base tracking-tight"
                        onClick={startAudioInterview}
                        disabled={!!audioCapture.error}
                      >
                        <span>🎤</span> Start Audio Interview
                      </button>
                      {audioCapture.error && (
                        <div className="font-mono text-xs text-red-500">
                          Audio: {audioCapture.error}
                        </div>
                      )}
                      {connectionAttempted && !isConnected && (
                        <div className="font-mono text-xs text-orange-500 mt-2">
                          ⚠ HTTP audio processing unavailable. Backend needs audio endpoint support.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-4xl mb-2">
                  🎤
                </div>
                <h3 className="text-xl font-bold text-white">No Session Selected</h3>
                <p className="font-mono text-xs tracking-wide">Pick a session from the left or create one</p>
                <button
                  className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
                  onClick={() => setShowCreateModal(true)}
                >
                  New Interview
                </button>
              </div>
            )}
          </main>

          {/* ── Chat Transcript ── */}
          <aside className="row-start-2 border-l border-zinc-800/50 flex flex-col bg-zinc-900/30 hidden xl:flex">
            <div className="p-5 pb-4 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">Transcript</div>
                <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-1">REAL-TIME LOG</div>
              </div>
              <button
                className="font-mono text-[9px] px-3 py-1.5 uppercase tracking-wider bg-zinc-800/50 border border-zinc-700 rounded text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                onClick={() => setHideAIMessages(!hideAIMessages)}
              >
                {hideAIMessages ? "Show AI" : "Hide AI"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {visibleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-lg">
                    💬
                  </div>
                  <span className="font-mono text-xs tracking-wide">No messages yet</span>
                </div>
              ) : (
                visibleMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                      <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-black rounded-br-md"
                          : "bg-zinc-800/50 border border-zinc-700/50 rounded-bl-md"
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`font-mono text-[9px] mt-1 px-1 ${
                        msg.role === "user" ? "text-right text-zinc-500" : "text-zinc-500"
                      }`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </aside>

        </div>

        {/* ── Create Modal ── */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-5 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          >
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-3xl w-full max-w-md overflow-hidden">
              <div className="p-8 pb-6 border-b border-zinc-800/50">
                <h3 className="text-2xl font-black tracking-tight mb-2">New Interview Session</h3>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">SELECT A JOB POSITION TO PRACTICE</p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Job Position</label>
                  <select
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: '44px'
                    }}
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="">Choose a role…</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title} @ {job.company}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-6 py-3 border border-zinc-700/50 bg-transparent text-white font-semibold rounded-xl hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleCreateInterview}
                    disabled={!selectedJobId || isCreating}
                  >
                    {isCreating ? "Creating…" : "Create Session"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toasts ── */}
        {error && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-5 py-3 bg-red-500/12 border border-red-500/30 text-red-500 rounded-xl font-mono text-sm tracking-wide animate-in slide-in-from-bottom-2 duration-300 z-50">
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-5 py-3 bg-primary/12 border border-primary/30 text-primary rounded-xl font-mono text-sm tracking-wide animate-in slide-in-from-bottom-2 duration-300 z-50">
            ✓ {success}
          </div>
        )}
      </div>
    </div>
  );
}