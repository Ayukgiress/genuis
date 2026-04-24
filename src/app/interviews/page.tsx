'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { useRouter } from 'next/navigation';
import { interviewApi, jobApi, kanbanApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useInterviewSocket } from '@/hooks/useInterviewSocket';
import type { Interview, InterviewMessageCreate, InterviewMessage, Job } from '@/types';
import { generateInterviewQuestions, calculateInterviewRating } from '@/utils/interviewQuestions';
import '@/styles/interview.css';



export default function InterviewsPage() {
  const router = useRouter();
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
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Speech-to-Speech Socket
  const {
    isConnected: isSocketConnected,
    isListening: isSocketListening,
    isSpeaking: isSocketSpeaking,
    transcript: socketTranscript,
    error: socketError,
    connect: connectSocket,
    disconnect: disconnectSocket,
    startRecording: startSocketRecording,
    stopRecording: stopSocketRecording
  } = useInterviewSocket(selectedInterview?.id || null);

  // Update transcript from socket
  useEffect(() => {
    if (socketTranscript) {
      setNewMessage(socketTranscript);
    }
  }, [socketTranscript]);

  // Handle socket errors
  useEffect(() => {
    if (socketError) {
      setError(socketError);
    }
  }, [socketError]);

  // Structured interview state
  const [isStructuredMode, setIsStructuredMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [interviewRating, setInterviewRating] = useState<number | null>(null);
  const [structuredResponses, setStructuredResponses] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [interviewsData, jobsData, boardsData] = await Promise.all([
        interviewApi.list(),
        jobApi.search({ limit: 50 }),
        kanbanApi.listBoards()
      ]);
      setInterviews(interviewsData);
      setJobs(jobsData);
      setBoards(boardsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load interviews. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInterviewMessages = useCallback(async (interviewId: number) => {
    try {
      const messages = await interviewApi.getMessages(interviewId);
      setInterviews(prev => prev.map(int => int.id === interviewId ? { ...int, messages } : int));
      if (selectedInterview?.id === interviewId) {
        setSelectedInterview(prev => prev ? { ...prev, messages } : null);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [selectedInterview]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) { router.push('/login'); return; }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  useEffect(() => {
    if (interviews.length > 0 && !selectedInterview) {
      const firstInterview = interviews[0];
      fetchInterviewMessages(firstInterview.id);
      setSelectedInterview(firstInterview);
    }
  }, [interviews, selectedInterview, fetchInterviewMessages]);

  useEffect(() => { scrollToBottom(); }, [selectedInterview?.messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setNewMessage(transcript);
          setIsRecording(false);
          if (transcript.trim()) await handleSendMessage();
        };
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error !== 'no-speech') setError('Speech recognition failed. Please try again.');
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, []);

  const handleCreateInterview = async () => {
    if (!selectedJobId) return;
    try {
      setIsCreating(true);
      setError(null);
      if (boards.length > 0) await jobApi.addToKanban(selectedJobId, boards[0].id, 'review');
      const newInterview = await interviewApi.create({ job_id: selectedJobId });
      setInterviews(prev => [newInterview, ...prev]);
      setSelectedInterview(newInterview);
      setShowCreateModal(false);
      setSelectedJobId('');
      setSuccess('Interview created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to create interview');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (isStructuredMode && isInterviewStarted) {
      await handleStructuredResponse();
    } else {
      await handleChatMessage();
    }
  };

  const handleChatMessage = async () => {
    if (!selectedInterview || !newMessage.trim()) return;
    try {
      setIsSending(true);
      setError(null);
      const userMessage: InterviewMessage = {
        id: Date.now(),
        interview_id: selectedInterview.id,
        role: 'user',
        content: newMessage.trim(),
        created_at: new Date().toISOString()
      };
      const tempInterview = { ...selectedInterview, messages: [...(selectedInterview.messages || []), userMessage] };
      setSelectedInterview(tempInterview);
      const aiMessage = await interviewApi.sendMessage(selectedInterview.id, { role: 'user', content: newMessage.trim() });
      const finalInterview = { ...tempInterview, messages: [...tempInterview.messages, aiMessage] };
      setSelectedInterview(finalInterview);
      setInterviews(prev => prev.map(int => int.id === selectedInterview.id ? finalInterview : int));
      setNewMessage('');
      if (aiMessage.content) speakText(aiMessage.content);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to send message');
      setSelectedInterview(selectedInterview);
    } finally {
      setIsSending(false);
    }
  };

  const handleCompleteInterview = async (interviewId: number) => {
    try {
      await interviewApi.complete(interviewId);
      setInterviews(prev => prev.map(int => int.id === interviewId ? { ...int, status: 'completed' } : int));
      if (selectedInterview?.id === interviewId) setSelectedInterview(prev => prev ? { ...prev, status: 'completed' } : null);
      setSuccess('Interview completed!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to complete interview');
    }
  };

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm('Are you sure you want to delete this interview?')) return;
    try {
      await interviewApi.delete(interviewId);
      setInterviews(prev => prev.filter(int => int.id !== interviewId));
      if (selectedInterview?.id === interviewId) setSelectedInterview(null);
      setSuccess('Interview deleted!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete interview');
    }
  };

  const selectInterview = async (interview: Interview) => {
    if (selectedInterview?.id === interview.id) return;
    
    // Disconnect previous socket if any
    disconnectSocket();
    
    setSelectedInterview(interview);
    if (!interview.messages) await fetchInterviewMessages(interview.id);
    // Reset structured interview state
    setIsStructuredMode(false);
    setCurrentQuestionIndex(0);
    setInterviewQuestions([]);
    setIsInterviewStarted(false);
    setInterviewRating(null);
    setStructuredResponses([]);
  };

  const toggleSpeechMode = () => {
    if (isSocketConnected) {
      disconnectSocket();
    } else {
      connectSocket();
    }
  };

  const startStructuredInterview = () => {
    if (!selectedInterview) return;
    const job = getJobDetails(selectedInterview.job_id);
    if (!job) return;

    const questions = generateInterviewQuestions(job);
    setInterviewQuestions(questions);
    setIsStructuredMode(true);
    setCurrentQuestionIndex(0);
    setIsInterviewStarted(true);
    setInterviewRating(null);
    setStructuredResponses([]);

    // Ask first question
    setTimeout(() => {
      speakText(questions[0]);
    }, 1000);
  };

  const handleStructuredResponse = async () => {
    if (!selectedInterview || !newMessage.trim() || !isStructuredMode) return;

    try {
      setIsSending(true);
      setError(null);

      // Add user response to messages (without AI response since we're not calling backend)
      const userMessage: InterviewMessage = {
        id: Date.now(),
        interview_id: selectedInterview.id,
        role: 'user',
        content: newMessage.trim(),
        created_at: new Date().toISOString()
      };
      const tempInterview = { ...selectedInterview, messages: [...(selectedInterview.messages || []), userMessage] };
      setSelectedInterview(tempInterview);

      // Collect response for rating calculation
      setStructuredResponses(prev => [...prev, newMessage.trim()]);

      setNewMessage('');

      // Move to next question or finish
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < interviewQuestions.length) {
        setCurrentQuestionIndex(nextIndex);
        setTimeout(() => {
          speakText(interviewQuestions[nextIndex]);
        }, 1000);
      } else {
        // Interview finished, provide rating
        setTimeout(() => {
          const rating = calculateInterviewRating(structuredResponses);
          setInterviewRating(rating);
          speakText(`Thank you for completing the interview. Based on your responses, I would rate your performance as ${rating} out of 10. ${rating >= 8 ? 'Excellent work!' : rating >= 6 ? 'Good job!' : 'Keep practicing!'}`);
        }, 1000);
      }
    } catch (err) {
      console.error('Error in structured response:', err);
      setError('Failed to process response');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      setError(null);
      recognitionRef.current.start();
    } else if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) recognitionRef.current.stop();
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getJobDetails = (jobId: number) => jobs.find(job => job.id === jobId.toString());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#00F29C]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-[#00F29C] border-t-transparent animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm tracking-widest uppercase text-[10px]">Loading sessions</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="noise-overlay" />

      <div className="interview-page min-h-screen text-white">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase mb-2">Session Manager</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              AI Interview <span className="text-[#00F29C]">Studio</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1 mono">Voice-powered practice sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="glow-btn px-6 py-3 bg-[#00F29C] text-black font-bold rounded-xl text-sm tracking-wide"
          >
            + New Session
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm mono">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-[#00F29C]/5 border border-[#00F29C]/20 rounded-xl flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00F29C] flex-shrink-0" />
            <p className="text-[#00F29C] text-sm mono">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* ── Left Panel: Sessions List ── */}
          <div className="space-y-3">
            <p className="mono text-[9px] tracking-[0.35em] text-zinc-600 uppercase px-1">
              {interviews.length} Session{interviews.length !== 1 ? 's' : ''}
            </p>

            {interviews.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm">No sessions yet</p>
                <p className="text-zinc-700 text-xs mt-1 mono">Create your first practice session</p>
              </div>
            ) : (
              interviews.map((interview) => {
                const job = getJobDetails(interview.job_id);
                const isActive = selectedInterview?.id === interview.id;
                return (
                  <div
                    key={interview.id}
                    onClick={() => selectInterview(interview)}
                    className={`interview-card cursor-pointer rounded-xl border p-5 ${
                      isActive
                        ? 'active bg-[#00F29C]/5 border-[#00F29C]/25'
                        : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/70 hover:border-zinc-700/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-bold text-white text-sm truncate">{job?.title || 'Unknown Position'}</h4>
                        <p className="text-zinc-500 text-xs mt-0.5 mono">{job?.company || 'Unknown Company'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {interview.status !== 'completed' && <div className="status-dot" />}
                        <span className={`mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md ${
                          interview.status === 'completed'
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-[#00F29C]/15 text-[#00F29C]'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="mono text-zinc-700 text-[10px]">{formatDate(interview.created_at)}</span>
                      <div className="flex gap-2">
                        {interview.status !== 'completed' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCompleteInterview(interview.id); }}
                            className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-[#00F29C]/20 hover:text-[#00F29C] text-zinc-500 flex items-center justify-center transition-all text-xs"
                            title="Complete"
                          >✓</button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteInterview(interview.id); }}
                          className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 flex items-center justify-center transition-all text-sm"
                          title="Delete"
                        >×</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right Panel: Chat ── */}
          {selectedInterview ? (
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden" style={{ height: '620px' }}>

              {/* Chat Header */}
              <div className="px-7 py-5 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00F29C]/10 border border-[#00F29C]/20 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#00F29C]" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{getJobDetails(selectedInterview.job_id)?.title || 'Interview Session'}</h3>
                    <p className="mono text-zinc-500 text-[11px]">{getJobDetails(selectedInterview.job_id)?.company || 'Company'}</p>
                    {isStructuredMode && isInterviewStarted && (
                      <p className="mono text-zinc-400 text-[10px] mt-1">
                        Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                        {interviewRating && ` • Rating: ${interviewRating}/10`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInterview.status !== 'completed' && <div className="status-dot" />}
                  <span className={`mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border ${
                    selectedInterview.status === 'completed'
                      ? 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'
                      : 'bg-[#00F29C]/10 text-[#00F29C] border-[#00F29C]/25'
                  }`}>
                    {selectedInterview.status}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-hidden px-7 py-6 space-y-5">
                {(!selectedInterview.messages || selectedInterview.messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                    <div className="flex gap-1 items-end h-8">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="waveform-bar" style={{ height: `${[14, 22, 28, 18, 12][i]}px`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="mono text-zinc-500 text-xs tracking-widest uppercase">Press mic to begin session</p>
                  </div>
                )}

                {selectedInterview.messages?.map((message, idx) => (
                  <div
                    key={message.id}
                    className={`message-in flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-[#00F29C]/10 border border-[#00F29C]/20 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#00F29C]" />
                      </div>
                    )}
                    <div className={`max-w-[72%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-[#00F29C] text-black font-medium rounded-tr-sm'
                          : 'bg-zinc-800/70 text-zinc-200 border border-zinc-700/50 rounded-tl-sm'
                      }`}>
                        {message.content}
                      </div>
                      <p className="mono text-zinc-700 text-[10px] px-1">{formatDate(message.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Voice Controls */}
              {selectedInterview.status !== 'completed' && (
                <div className="px-7 py-6 border-t border-zinc-800/50 bg-zinc-900/30">
                  <div className="flex flex-col items-center gap-4">

                    {/* Waveform / Status display */}
                    {(isRecording || isSocketListening || isSocketSpeaking) && (
                      <div className="flex gap-1 items-end h-8">
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="waveform-bar"
                            style={{
                              height: isSocketSpeaking 
                                ? `${Math.random() * 24 + 8}px` 
                                : isSocketListening 
                                ? `${Math.random() * 12 + 4}px` 
                                : `${Math.random() * 16 + 8}px`,
                              animationDelay: `${i * 0.1}s`,
                              backgroundColor: isSocketSpeaking ? '#00D4FF' : '#00F29C',
                              animationDuration: `${0.8 + Math.random() * 0.4}s`
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-6">
                      {/* Legacy Mic Button (Optional Fallback) */}
                      {!isSocketConnected && (
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            isRecording ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                          </svg>
                        </button>
                      )}

                      {/* Speech-to-Speech Toggle Button */}
                      <div className="relative">
                        {(isSocketListening || isSocketSpeaking) && (
                          <>
                            <div className="mic-ring" style={{ '--opacity': 0.8 } as any} />
                            <div className="mic-ring" style={{ '--opacity': 0.5 } as any} />
                          </>
                        )}
                        <button
                          onClick={toggleSpeechMode}
                          className={`relative z-10 w-20 h-20 rounded-full font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            isSocketConnected
                              ? 'bg-[#00F29C] text-black scale-110 shadow-[0_0_30px_rgba(0,242,156,0.4)]'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                            <path d="M12 3v18M3 12h18M5 16.5a8.5 8.5 0 0 1 14 0M7.5 14a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                          </svg>
                          <span className="text-[8px] uppercase tracking-tighter font-black">
                            {isSocketConnected ? 'LIVE' : 'S2S'}
                          </span>
                        </button>
                      </div>

                      {/* Manual Send Button */}
                      {!isSocketConnected && (
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSending}
                          className="w-12 h-12 rounded-full bg-[#00F29C]/10 text-[#00F29C] border border-[#00F29C]/20 flex items-center justify-center hover:bg-[#00F29C]/20 disabled:opacity-30"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="mono text-[10px] tracking-widest uppercase text-zinc-500">
                        {isSocketSpeaking ? 'AI is speaking...' : isSocketListening ? 'Listening...' : isSocketConnected ? 'Waiting for AI...' : 'Tap S2S for Speech-to-Speech'}
                      </p>
                    </div>

                    {/* Text Input Fallback */}
                    {!isSocketConnected && (
                      <div className="w-full max-w-lg flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00F29C]/30"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedInterview.status === 'completed' && (
                <div className="px-7 py-5 border-t border-zinc-800/50 bg-zinc-900/20 flex items-center justify-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="mono text-zinc-500 text-xs tracking-widest uppercase">Session completed</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-5" style={{ height: '620px' }}>
              <div className="flex gap-1 items-end h-8 opacity-30">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="waveform-bar" style={{ height: `${[10, 18, 26, 32, 26, 18, 10][i]}px`, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-sm font-medium">Select a session</p>
                <p className="mono text-zinc-700 text-xs mt-1">or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="mb-6">
                <p className="mono text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-2">New Session</p>
                <h3 className="font-bold text-white text-xl">Configure Interview</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mono text-[10px] tracking-widest text-zinc-500 uppercase block mb-2">
                    Job Position
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#00F29C]/50 transition-colors appearance-none"
                  >
                    <option value="">Choose a position...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title} at {job.company}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInterview}
                    disabled={!selectedJobId || isCreating}
                    className="flex-1 px-4 py-3.5 bg-[#00F29C] text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm glow-btn"
                  >
                    {isCreating ? 'Creating...' : 'Start Session'}
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