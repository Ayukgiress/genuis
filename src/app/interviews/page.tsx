"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

import { useRouter } from "next/navigation";
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
import { generateInterviewQuestions } from "@/utils/interviewQuestions";
import "@/styles/interview.css";

export default function InterviewsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(
    null,
  );
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

  // Video WebSocket
  const {
    isConnected,
    isStreaming,
    videoCapture,
    transcript,
    connect,
    disconnect,
    startVideoStream,
    stopVideoStream,
  } = useInterviewWebSocket(selectedInterview?.id || null);

  // Update message from video transcript
  useEffect(() => {
    if (transcript) {
      setNewMessage(transcript);
    }
  }, [transcript]);

  const [isInterviewActive, setIsInterviewActive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [interviewsData, jobsData, boardsData] = await Promise.all([
        interviewApi.list(),
        jobApi.search({ limit: 50 }),
        kanbanApi.listBoards(),
      ]);
      setInterviews(interviewsData);
      setJobs(jobsData);
      setBoards(boardsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load interviews. Backend required.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInterviewMessages = useCallback(
    async (interviewId: number) => {
      try {
        const messages = await interviewApi.getMessages(interviewId);
        setInterviews((prev) =>
          prev.map((int) =>
            int.id === interviewId ? { ...int, messages } : int,
          ),
        );
        if (selectedInterview?.id === interviewId) {
          setSelectedInterview((prev) => (prev ? { ...prev, messages } : null));
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    },
    [selectedInterview],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  useEffect(() => {
    if (interviews.length > 0 && !selectedInterview) {
      const first = interviews[0];
      fetchInterviewMessages(first.id);
      setSelectedInterview(first);
    }
  }, [interviews, fetchInterviewMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedInterview?.messages]);

  const handleCreateInterview = async () => {
    if (!selectedJobId) return;
    try {
      setIsCreating(true);
      setError(null);
      if (boards.length > 0)
        await jobApi.addToKanban(selectedJobId, boards[0].id, "review");
      const newInterview = await interviewApi.create({ job_id: selectedJobId });
      setInterviews((prev) => [newInterview, ...prev]);
      setSelectedInterview(newInterview);
      setShowCreateModal(false);
      setSelectedJobId("");
      setSuccess("Video interview created!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedInterview || !newMessage.trim()) return;
    try {
      setIsSending(true);
      const userMessage: InterviewMessage = {
        id: Date.now(),
        interview_id: selectedInterview.id,
        role: "user",
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
      };
      const tempInterview = {
        ...selectedInterview,
        messages: [...(selectedInterview.messages || []), userMessage],
      };
      setSelectedInterview(tempInterview);
      setNewMessage("");

      const aiMessage = await interviewApi.sendMessage(selectedInterview.id, {
        role: "user",
        content: userMessage.content,
      });

      const finalInterview = {
        ...tempInterview,
        messages: [...tempInterview.messages, aiMessage],
      };
      setSelectedInterview(finalInterview);
      setInterviews((prev) =>
        prev.map((int) =>
          int.id === selectedInterview.id ? finalInterview : int,
        ),
      );

      if (aiMessage.content?.includes("[INTERVIEW_COMPLETE]")) {
        await interviewApi.complete(selectedInterview.id);
        setSuccess("Interview completed!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteInterview = async (interviewId: number) => {
    try {
      await interviewApi.complete(interviewId);
      setInterviews((prev) =>
        prev.map((int) =>
          int.id === interviewId ? { ...int, status: "completed" } : int,
        ),
      );
      setSuccess("Completed!");
    } catch (err) {
      setError("Failed to complete");
    }
  };

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm("Delete?")) return;
    try {
      await interviewApi.delete(interviewId);
      setInterviews((prev) => prev.filter((int) => int.id !== interviewId));
      setSelectedInterview(null);
      setSuccess("Deleted!");
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const selectInterview = (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    disconnect();
    setSelectedInterview(interview);
    if (!interview.messages) fetchInterviewMessages(interview.id);
  };

  const startVideoInterview = async () => {
    if (!selectedInterview || isInterviewActive) return;
    try {
      connect();
      setTimeout(() => startVideoStream(), 1000); // Wait for WS ready
      setIsInterviewActive(true);
      setNewMessage("");
      setSuccess("Video interview started! Look at camera to speak.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError("Failed to start video");
    }
  };

  const stopVideoInterview = () => {
    stopVideoStream();
    disconnect();
    setIsInterviewActive(false);
  };

  const getJobDetails = (jobId: number) =>
    jobs.find((job) => job.id === jobId.toString());

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00F29C]" />
      </div>
    );
  }

  return (
    <>
      <div className="noise-overlay" />
      <div className="interview-page min-h-screen p-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between mb-10">
            <h1 className="text-3xl font-bold">Video AI Interviews</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="glow-btn px-6 py-3 bg-[#00F29C] text-black font-bold rounded-xl"
            >
              NEW INTERVIEW
            </button>
          </div>

          {(error || success) && (
            <div className="mb-6 space-y-2">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-4 bg-[#00F29C]/10 border border-[#00F29C]/25 rounded-xl">
                  <p className="text-[#00F29C]">{success}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-[320px_1fr] gap-8">
            {/* Sessions */}
            <div className="space-y-4">
              <h3 className="mono text-xs uppercase tracking-wider text-zinc-500">
                Sessions
              </h3>
              {interviews.map((interview) => {
                const job = getJobDetails(interview.job_id);
                const active = selectedInterview?.id === interview.id;
                return (
                  <div
                    key={interview.id}
                    onClick={() => selectInterview(interview)}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                      active
                        ? "bg-[#00F29C]/5 border-[#00F29C]/30 ring-2 ring-[#00F29C]/20"
                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <div>
                        <h4 className="font-bold">
                          {job?.title || "Practice"}
                        </h4>
                        <p className="text-zinc-500 text-sm">{job?.company}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          interview.status === "completed"
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-[#00F29C]/20 text-[#00F29C]"
                        }`}
                      >
                        {interview.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{formatDate(interview.created_at)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInterview(interview.id);
                          }}
                          className="p-1 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Panel */}
            {selectedInterview ? (
              <div className="space-y-6">
                {/* Video Preview */}
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Camera Preview</h3>
                    <div className="flex gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${isStreaming ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`}
                      />
                      <span className="text-sm mono uppercase tracking-wider">
                        {videoCapture.error ||
                          (isStreaming ? "RECORDING" : "READY")}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <video
                      ref={videoCapture.videoRef}
                      className="w-full max-w-md rounded-xl bg-black border-4 border-zinc-800 object-cover video-preview"
                      muted
                      playsInline
                    />
                    <canvas
                      ref={videoCapture.canvasRef}
                      className="hidden"
                      width="640"
                      height="480"
                    />
                    {isStreaming && (
                      <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full rec-dot" />
                    )}
                  </div>
                </div>

                {/* Chat */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl h-[500px] flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00F29C]/10 rounded-xl border border-[#00F29C]/20 flex items-center justify-center">
                        <div className="w-5 h-5 bg-[#00F29C] rounded-full animate-ping" />
                      </div>
                      <div>
                        <h4 className="font-bold">
                          {getJobDetails(selectedInterview.job_id)?.title}
                        </h4>
                        <p className="text-zinc-500 text-sm">
                          Video AI Interview
                        </p>
                      </div>
                      <button
                        onClick={() => setHideAIMessages(!hideAIMessages)}
                        className="ml-auto px-3 py-1 bg-zinc-800 text-xs rounded-lg hover:bg-zinc-700"
                      >
                        {hideAIMessages ? "Show AI" : "Hide AI"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {!selectedInterview.messages ||
                    selectedInterview.messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </div>
                        <p>Start your video interview</p>
                      </div>
                    ) : (
                      selectedInterview.messages
                        .filter((m) => !hideAIMessages || m.role === "user")
                        .map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-md p-4 rounded-2xl ${
                                message.role === "user"
                                  ? "bg-[#00F29C] text-black rounded-tr-sm"
                                  : "bg-zinc-800 border rounded-tl-sm"
                              }`}
                            >
                              <p>{message.content}</p>
                              <p className="text-xs opacity-75 mt-1">
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Controls */}
                  {!isInterviewActive ? (
                    <div className="p-6 border-t border-zinc-800 bg-gradient-to-r from-zinc-900/50 to-transparent">
                      <button
                        onClick={startVideoInterview}
                        disabled={!isConnected || !!videoCapture.error}
                        className="w-full py-4 px-8 bg-gradient-to-r from-[#00F29C] to-green-500 text-black font-bold rounded-2xl text-lg shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        🎥 Start Video Interview
                      </button>
                      {videoCapture.error && (
                        <p className="text-red-400 text-xs mt-2 text-center">
                          {videoCapture.error}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 border-t border-zinc-800">
                      <div className="flex gap-3">
                        <button
                          onClick={handleSendMessage}
                          disabled={isSending || !newMessage.trim()}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                          {isSending ? "Sending..." : "Send Response"}
                        </button>
                        <button
                          onClick={stopVideoInterview}
                          className="px-4 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all"
                        >
                          Stop Video
                        </button>
                      </div>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type response or speak to camera..."
                        className="w-full mt-3 p-4 bg-zinc-950 border border-zinc-700 rounded-xl resize-none h-20 focus:border-[#00F29C] focus:outline-none"
                        disabled={isSending}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center h-[600px] flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  No Interview Selected
                </h3>
                <p className="text-zinc-500">
                  Choose from your sessions or create new
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8 border-b border-zinc-800">
                <h3 className="text-2xl font-bold">New Video Interview</h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3 mono uppercase tracking-wider text-zinc-400">
                    Job Position
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-white focus:border-[#00F29C] focus:outline-none"
                  >
                    <option value="">Select job...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} @ {job.company}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    className="flex-1 py-3 px-6 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-3 px-6 bg-[#00F29C] text-black font-bold rounded-xl hover:scale-105 transition-all glow-btn disabled:opacity-50"
                    onClick={handleCreateInterview}
                    disabled={!selectedJobId || isCreating}
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
