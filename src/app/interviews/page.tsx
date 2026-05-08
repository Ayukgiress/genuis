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

// ─── Inline styles ────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

  :root {
    --green: #00F29C;
    --green-dim: rgba(0,242,156,0.12);
    --green-border: rgba(0,242,156,0.25);
    --red: #FF4757;
    --bg: #080A0E;
    --surface: #0E1117;
    --surface2: #13181F;
    --border: rgba(255,255,255,0.06);
    --text: #E8EAF0;
    --muted: #5A6070;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  .iv-root { background: var(--bg); min-height: 100vh; font-family: var(--font-display); color: var(--text); position: relative; overflow-x: hidden; }
  
  /* Ambient orb */
  .iv-orb { position: fixed; top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(0,242,156,0.07) 0%, transparent 70%); pointer-events: none; z-index: 0; }

  /* Layout */
  .iv-layout { position: relative; z-index: 1; display: grid; grid-template-columns: 280px 1fr 300px; grid-template-rows: 72px 1fr; height: 100vh; gap: 0; }

  /* Top bar */
  .iv-topbar { grid-column: 1 / -1; display: flex; align-items: center; padding: 0 32px; border-bottom: 1px solid var(--border); background: rgba(8,10,14,0.8); backdrop-filter: blur(20px); gap: 16px; }
  .iv-topbar-logo { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .iv-topbar-logo span { color: var(--green); }
  .iv-topbar-badge { font-family: var(--font-mono); font-size: 10px; padding: 3px 8px; background: var(--green-dim); border: 1px solid var(--green-border); border-radius: 4px; color: var(--green); text-transform: uppercase; letter-spacing: 1px; }
  .iv-topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }

  /* Sidebar */
  .iv-sidebar { grid-row: 2; border-right: 1px solid var(--border); overflow-y: auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; background: var(--surface); }
  .iv-sidebar-header { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); padding: 0 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
  .iv-session { padding: 14px 12px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
  .iv-session:hover { background: var(--surface2); border-color: var(--border); }
  .iv-session.active { background: var(--green-dim); border-color: var(--green-border); }
  .iv-session-title { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .iv-session-company { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .iv-session-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
  .iv-pill { font-family: var(--font-mono); font-size: 9px; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  .iv-pill.active { background: var(--green-dim); color: var(--green); border: 1px solid var(--green-border); }
  .iv-pill.done { background: rgba(255,255,255,0.05); color: var(--muted); border: 1px solid var(--border); }
  .iv-session-del { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 16px; color: var(--muted); hover: color: var(--red); transition: all 0.15s; }
  .iv-session-del:hover { background: rgba(255,71,87,0.1); color: var(--red); }

  /* Center — audio stage */
  .iv-stage { grid-row: 2; display: flex; flex-direction: column; overflow: hidden; }
  .iv-audio-area { flex: 1; position: relative; background: linear-gradient(135deg, #0a0e14 0%, #0e1117 100%); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .iv-audio-visualizer { display: flex; flex-direction: column; align-items: center; gap: 24px; color: var(--text); }
  .iv-audio-icon { width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0,242,156,0.1); border: 2px solid rgba(0,242,156,0.3); transition: all 0.3s ease; }
  .iv-audio-icon svg { width: 48px; height: 48px; color: var(--green); opacity: 0.7; }
  .iv-waveform { display: flex; align-items: center; gap: 4px; animation: pulse 2s ease-in-out infinite; }
  .iv-wave-bar { width: 4px; height: 20px; background: var(--green); border-radius: 2px; animation: wave 1.5s ease-in-out infinite; }
  .iv-wave-bar:nth-child(1) { animation-delay: 0s; }
  .iv-wave-bar:nth-child(2) { animation-delay: 0.1s; }
  .iv-wave-bar:nth-child(3) { animation-delay: 0.2s; }
  .iv-wave-bar:nth-child(4) { animation-delay: 0.3s; }
  .iv-wave-bar:nth-child(5) { animation-delay: 0.4s; }
  .iv-audio-status { font-family: var(--font-mono); font-size: 14px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; }
  .iv-audio-error { position: absolute; top: 20px; right: 20px; display: flex; align-items: center; gap: 8px; background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; padding: 8px 12px; font-family: var(--font-mono); font-size: 12px; color: var(--red); }
  .iv-audio-error svg { width: 16px; height: 16px; }
  .iv-rec-badge { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; padding: 6px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--red); }
  .iv-rec-dot { width: 8px; height: 8px; background: var(--red); border-radius: 50%; animation: blink 1s ease-in-out infinite; }
  .iv-status-badge { position: absolute; top: 20px; right: 20px; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid var(--green-border); border-radius: 8px; padding: 6px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--green); }
  .iv-status-dot { width: 7px; height: 7px; background: var(--green); border-radius: 50%; }
  .iv-status-dot.pulse { animation: pulse 2s ease-in-out infinite; }

  /* Bottom bar */
  .iv-controls { background: var(--surface); border-top: 1px solid var(--border); padding: 20px 28px; display: flex; align-items: center; gap: 16px; }
  .iv-transcript-input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text); font-family: var(--font-display); font-size: 14px; resize: none; height: 48px; line-height: 24px; transition: border-color 0.2s; outline: none; }
  .iv-transcript-input:focus { border-color: var(--green-border); }
  .iv-transcript-input::placeholder { color: var(--muted); }
  .iv-ctrl-btn { width: 48px; height: 48px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background: var(--surface2); color: var(--muted); font-size: 18px; }
  .iv-ctrl-btn:hover { border-color: rgba(255,255,255,0.15); color: var(--text); }
  .iv-ctrl-btn.danger { border-color: rgba(255,71,87,0.3); color: var(--red); background: rgba(255,71,87,0.08); }
  .iv-ctrl-btn.danger:hover { background: rgba(255,71,87,0.18); }
  .iv-send-btn { height: 48px; padding: 0 24px; border-radius: 12px; background: var(--green); color: #000; font-family: var(--font-display); font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; white-space: nowrap; }
  .iv-send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,242,156,0.3); }
  .iv-send-btn:disabled { opacity: 0.4; transform: none; box-shadow: none; cursor: not-allowed; }
  .iv-start-btn { height: 56px; padding: 0 36px; border-radius: 14px; background: linear-gradient(135deg, var(--green) 0%, #00d4a0 100%); color: #000; font-family: var(--font-display); font-weight: 800; font-size: 16px; letter-spacing: -0.3px; cursor: pointer; transition: all 0.25s; border: none; display: flex; align-items: center; gap: 10px; }
  .iv-start-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,242,156,0.35); }
  .iv-start-btn:disabled { opacity: 0.4; transform: none; box-shadow: none; cursor: not-allowed; }

  /* Right panel — chat */
  .iv-chat { grid-row: 2; border-left: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
  .iv-chat-header { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .iv-chat-title { font-weight: 700; font-size: 15px; }
  .iv-chat-sub { font-family: var(--font-mono); font-size: 10px; color: var(--muted); margin-top: 2px; letter-spacing: 0.5px; }
  .iv-chat-toggle { font-family: var(--font-mono); font-size: 9px; padding: 4px 8px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.15s; }
  .iv-chat-toggle:hover { color: var(--text); border-color: rgba(255,255,255,0.15); }
  .iv-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .iv-chat-messages::-webkit-scrollbar { width: 4px; }
  .iv-chat-messages::-webkit-scrollbar-track { background: transparent; }
  .iv-chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .iv-msg { max-width: 100%; }
  .iv-msg.user { align-self: flex-end; }
  .iv-msg.ai { align-self: flex-start; }
  .iv-msg-bubble { padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; }
  .iv-msg.user .iv-msg-bubble { background: var(--green); color: #000; border-bottom-right-radius: 4px; font-weight: 500; }
  .iv-msg.ai .iv-msg-bubble { background: var(--surface2); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .iv-msg-time { font-family: var(--font-mono); font-size: 9px; color: var(--muted); margin-top: 4px; padding: 0 2px; }
  .iv-msg.user .iv-msg-time { text-align: right; }
  .iv-chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--muted); }
  .iv-chat-empty-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 20px; }

  /* Empty state */
  .iv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; color: var(--muted); }
  .iv-empty-icon { width: 80px; height: 80px; border-radius: 24px; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 8px; }
  .iv-empty h3 { font-size: 18px; font-weight: 700; color: var(--text); }
  .iv-empty p { font-size: 13px; font-family: var(--font-mono); letter-spacing: 0.3px; }

  /* Buttons */
  .iv-btn-primary { padding: 12px 24px; border-radius: 10px; background: var(--green); color: #000; font-family: var(--font-display); font-weight: 700; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; }
  .iv-btn-primary:hover { box-shadow: 0 6px 20px rgba(0,242,156,0.3); transform: translateY(-1px); }
  .iv-btn-primary:disabled { opacity: 0.4; transform: none; box-shadow: none; cursor: not-allowed; }
  .iv-btn-ghost { padding: 12px 24px; border-radius: 10px; background: transparent; color: var(--text); font-family: var(--font-display); font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; }
  .iv-btn-ghost:hover { border-color: rgba(255,255,255,0.15); background: var(--surface2); }

  /* Modal */
  .iv-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .iv-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 440px; overflow: hidden; }
  .iv-modal-header { padding: 28px 28px 24px; border-bottom: 1px solid var(--border); }
  .iv-modal-header h3 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .iv-modal-header p { font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin-top: 4px; }
  .iv-modal-body { padding: 28px; display: flex; flex-direction: column; gap: 20px; }
  .iv-select-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); margin-bottom: 8px; display: block; }
  .iv-select { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; color: var(--text); font-family: var(--font-display); font-size: 14px; outline: none; cursor: pointer; transition: border-color 0.2s; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235A6070' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
  .iv-select:focus { border-color: var(--green-border); }
  .iv-select option { background: var(--surface2); }
  .iv-modal-actions { display: flex; gap: 12px; }

  /* Toast */
  .iv-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.5px; z-index: 200; animation: slideUp 0.3s ease; }
  .iv-toast.error { background: rgba(255,71,87,0.12); border: 1px solid rgba(255,71,87,0.3); color: var(--red); }
  .iv-toast.success { background: var(--green-dim); border: 1px solid var(--green-border); color: var(--green); }

  /* Animations */
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,242,156,0.4); } 50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(0,242,156,0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes wave { 0%,100% { height: 20px; opacity: 0.7; } 50% { height: 40px; opacity: 1; } }
  .iv-stage, .iv-chat, .iv-sidebar { animation: fadeIn 0.4s ease; }

  /* Audio responsive adjustments */
  @media (max-width: 1100px) {
    .iv-layout { grid-template-columns: 260px 1fr; }
    .iv-chat { display: none; }
    .iv-audio-visualizer { gap: 16px; }
    .iv-audio-icon { width: 100px; height: 100px; }
    .iv-audio-icon svg { width: 40px; height: 40px; }
  }
  @media (max-width: 700px) {
    .iv-layout { grid-template-columns: 1fr; }
    .iv-sidebar { display: none; }
    .iv-audio-visualizer { gap: 12px; }
    .iv-audio-icon { width: 80px; height: 80px; }
    .iv-audio-icon svg { width: 32px; height: 32px; }
  }
`;

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

  const startAudioInterview = () => {
    if (!selectedInterview || isInterviewActive) return;
    connect();
    setTimeout(() => startAudioStream(), 1000);
    setIsInterviewActive(true);
    setNewMessage("");
    showToast("🎤 Conversational interview started - speak naturally!", "success");
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
      <div style={{ background: "#080A0E", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#5A6070", fontFamily: "monospace" }}>
          <div style={{ width: 40, height: 40, border: "2px solid #00F29C", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Loading sessions...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const job = selectedInterview ? getJobDetails(selectedInterview.job_id) : null;
  const messages = selectedInterview?.messages || [];
  const visibleMessages = hideAIMessages ? messages.filter((m) => m.role === "user") : messages;

  return (
    <>
      <style>{css}</style>
      <div className="iv-root">
        <div className="iv-orb" />
        <div className="iv-layout">

          {/* ── Top bar ── */}
          <header className="iv-topbar">
            <span className="iv-topbar-logo">inter<span>view</span>.ai</span>
            <span className="iv-topbar-badge">Voice AI</span>
            {isConnected && <span className="iv-topbar-badge" style={{ borderColor: "rgba(0,242,156,0.4)", color: "#00F29C" }}>● WS Connected</span>}
            <div className="iv-topbar-actions">
              <button className="iv-btn-primary" onClick={() => setShowCreateModal(true)} style={{ padding: "8px 20px", fontSize: 13 }}>
                + New Session
              </button>
            </div>
          </header>

          {/* ── Sessions Sidebar ── */}
          <aside className="iv-sidebar">
            <div className="iv-sidebar-header">Sessions · {interviews.length}</div>
            {interviews.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 8px", color: "#5A6070", fontFamily: "monospace", fontSize: 11 }}>
                No sessions yet
              </div>
            )}
            {interviews.map((iv) => {
              const j = getJobDetails(iv.job_id);
              const active = selectedInterview?.id === iv.id;
              return (
                <div key={iv.id} className={`iv-session ${active ? "active" : ""}`} onClick={() => selectInterview(iv)}>
                  <div className="iv-session-title">{j?.title || "Practice Session"}</div>
                  <div className="iv-session-company">{j?.company || "—"}</div>
                  <div className="iv-session-meta">
                    <span className={`iv-pill ${iv.status === "completed" ? "done" : "active"}`}>
                      {iv.status}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#5A6070" }}>{formatDate(iv.created_at)}</span>
                      <button
                        className="iv-session-del"
                        onClick={(e) => { e.stopPropagation(); handleDeleteInterview(iv.id); }}
                        title="Delete"
                      >×</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </aside>

          {/* ── Video Stage ── */}
          <main className="iv-stage">
            {selectedInterview ? (
              <>
                {/* Audio Interview Area */}
                <div className="iv-audio-area">
                  <div className="iv-audio-visualizer">
                    <div className="iv-audio-icon">
                      {isStreaming ? (
                        <div className="iv-waveform">
                          <div className="iv-wave-bar"></div>
                          <div className="iv-wave-bar"></div>
                          <div className="iv-wave-bar"></div>
                          <div className="iv-wave-bar"></div>
                          <div className="iv-wave-bar"></div>
                        </div>
                      ) : (
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </div>
                    <div className="iv-audio-status">
                      {isStreaming ? "Listening..." : "Ready to Start"}
                    </div>
                  </div>

                  {audioCapture.error && (
                    <div className="iv-audio-error">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <p>{audioCapture.error}</p>
                    </div>
                  )}

                  {isStreaming && audioCapture.isListening && (
                    <div className="iv-rec-badge">
                      <div className="iv-rec-dot pulse-red" /> 🎤 LISTENING
                    </div>
                  )}
                  {isAiResponding && (
                    <div className="iv-rec-badge ai-speaking">
                      <div className="iv-rec-dot pulse-green" /> 🤖 AI SPEAKING
                    </div>
                  )}
                  <div className="iv-status-badge">
                    <div className={`iv-status-dot ${isInterviewActive ? "pulse" : ""}`} style={{ background: isInterviewActive ? "#00F29C" : "#5A6070" }} />
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
                    <div style={{ position: "absolute", bottom: 20, left: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{job.title}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#5A6070", marginTop: 2 }}>{job.company}</div>
                    </div>
                  )}
                </div>

                {/* Controls bar */}
                <div className="iv-controls">
                  {isInterviewActive ? (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 16, padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                          🎭 Conversational Interview Active
                        </div>
                        <div style={{ fontSize: 12, color: "#5A6070", lineHeight: 1.4 }}>
                          Speak naturally when you hear the AI. The conversation flows automatically.
                        </div>
                      </div>

                      <button
                        className="iv-ctrl-btn danger"
                        onClick={stopAudioInterview}
                        style={{ width: "100%", padding: "12px" }}
                      >
                        🛑 End Interview
                      </button>
                    </>
                  ) : (
                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                      <button className="iv-start-btn" onClick={startAudioInterview} disabled={!!audioCapture.error}>
                        <span>🎤</span> Start Audio Interview
                      </button>
                      {audioCapture.error && (
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#FF4757" }}>
                          Audio: {audioCapture.error}
                        </div>
                      )}
                      {connectionAttempted && !isConnected && (
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#FFA500", marginTop: 8 }}>
                          ⚠ HTTP audio processing unavailable. Backend needs audio endpoint support.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="iv-empty">
                <div className="iv-empty-icon">🎤</div>
                <h3>No Session Selected</h3>
                <p>Pick a session from the left or create one</p>
                <button className="iv-btn-primary" onClick={() => setShowCreateModal(true)}>New Interview</button>
              </div>
            )}
          </main>

          {/* ── Chat Transcript ── */}
          <aside className="iv-chat">
            <div className="iv-chat-header">
              <div>
                <div className="iv-chat-title">Transcript</div>
                <div className="iv-chat-sub">REAL-TIME LOG</div>
              </div>
              <button className="iv-chat-toggle" onClick={() => setHideAIMessages(!hideAIMessages)}>
                {hideAIMessages ? "Show AI" : "Hide AI"}
              </button>
            </div>
            <div className="iv-chat-messages">
              {visibleMessages.length === 0 ? (
                <div className="iv-chat-empty">
                  <div className="iv-chat-empty-icon">💬</div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5A6070", letterSpacing: 0.5 }}>No messages yet</span>
                </div>
              ) : (
                visibleMessages.map((msg) => (
                  <div key={msg.id} className={`iv-msg ${msg.role === "user" ? "user" : "ai"}`}>
                    <div className="iv-msg-bubble">{msg.content}</div>
                    <div className="iv-msg-time">{formatTime(msg.created_at)}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </aside>

        </div>

        {/* ── Create Modal ── */}
        {showCreateModal && (
          <div className="iv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
            <div className="iv-modal">
              <div className="iv-modal-header">
                <h3>New Interview Session</h3>
                <p>SELECT A JOB POSITION TO PRACTICE</p>
              </div>
              <div className="iv-modal-body">
                <div>
                  <label className="iv-select-label">Job Position</label>
                  <select className="iv-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                    <option value="">Choose a role…</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title} @ {job.company}</option>
                    ))}
                  </select>
                </div>
                <div className="iv-modal-actions">
                  <button className="iv-btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button className="iv-btn-primary" style={{ flex: 1 }} onClick={handleCreateInterview} disabled={!selectedJobId || isCreating}>
                    {isCreating ? "Creating…" : "Create Session"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toasts ── */}
        {error && <div className="iv-toast error">⚠ {error}</div>}
        {success && <div className="iv-toast success">✓ {success}</div>}
      </div>
    </>
  );
}