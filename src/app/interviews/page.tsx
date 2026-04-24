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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedInterviewRef = useRef<Interview | null>(null);

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
  const isInterviewStartedRef = useRef(false);
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
    selectedInterviewRef.current = selectedInterview;
  }, [selectedInterview]);

  useEffect(() => {
    isInterviewStartedRef.current = isInterviewStarted;
  }, [isInterviewStarted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        let finalTranscript = '';
        let silenceSendTimer: NodeJS.Timeout | null = null;

        recognitionRef.current.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += t;
            } else {
              interim += t;
            }
          }

          // Show live transcript
          setNewMessage(finalTranscript + interim);

          // Clear previous silence timer
          if (silenceSendTimer) clearTimeout(silenceSendTimer);

          // Auto-send after 1.8s of silence
          if (finalTranscript.trim()) {
            silenceSendTimer = setTimeout(async () => {
              const msg = finalTranscript.trim();
              if (!msg) return;

              finalTranscript = '';
              setNewMessage('');

              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
              }
              setIsRecording(false);

              const interview = selectedInterviewRef.current;
              if (!interview) return;

              // Inject message and call AI
              const userMessage: InterviewMessage = {
                id: Date.now(),
                interview_id: interview.id,
                role: 'user',
                content: msg,
                created_at: new Date().toISOString()
              };

              setSelectedInterview(prev => prev
                ? { ...prev, messages: [...(prev.messages || []), userMessage] }
                : prev
              );

              try {
                setIsSending(true);
                const aiMessage = await interviewApi.sendMessage(
                  interview.id,
                  { role: 'user', content: msg }
                );

                setSelectedInterview(prev => {
                  if (!prev) return prev;
                  return { ...prev, messages: [...(prev.messages || []), aiMessage] };
                });

                if (aiMessage.content?.includes('[INTERVIEW_COMPLETE]')) {
                  const clean = aiMessage.content.replace('[INTERVIEW_COMPLETE]', '').trim();
                  aiMessage.content = clean;
                  await speakTextAndWait(clean);
                  await handleCompleteInterview(interview.id);
                  setIsInterviewStarted(false);
                  return;
                }

                await speakTextAndWait(aiMessage.content);
                setTimeout(() => startRecording(), 300);
              } catch (e) {
                setError('Failed to send message');
              } finally {
                setIsSending(false);
              }
            }, 1800);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          // Clear silence timeout on error
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
            setError('Speech recognition failed. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
          // Clear silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          // Auto-restart if we're supposed to be recording (keeps mic alive)
          // Don't auto-restart in AI-driven interview mode — recording is managed explicitly
          setTimeout(() => {
            if (recognitionRef.current && !isSocketConnected && !isInterviewStartedRef.current) {
              startRecording();
            }
          }, 500);
        };
      }
    }
  }, [isSocketConnected]);

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

      const tempInterview = {
        ...selectedInterview,
        messages: [...(selectedInterview.messages || []), userMessage]
      };
      setSelectedInterview(tempInterview);
      setNewMessage('');

      // Stop mic while AI is responding
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }

      const aiMessage = await interviewApi.sendMessage(
        selectedInterview.id,
        { role: 'user', content: userMessage.content }
      );

      const finalInterview = {
        ...tempInterview,
        messages: [...tempInterview.messages, aiMessage]
      };
      setSelectedInterview(finalInterview);
      setInterviews(prev =>
        prev.map(int => int.id === selectedInterview.id ? finalInterview : int)
      );

      // Check if AI is ending the interview
      if (aiMessage.content?.includes('[INTERVIEW_COMPLETE]')) {
        const cleanContent = aiMessage.content.replace('[INTERVIEW_COMPLETE]', '').trim();
        aiMessage.content = cleanContent;
        await speakTextAndWait(cleanContent);
        await handleCompleteInterview(selectedInterview.id);
        setIsInterviewStarted(false);
        return;
      }

      // Speak AI response then restart mic
      await speakTextAndWait(aiMessage.content);
      if (isInterviewStarted) {
        setTimeout(() => startRecording(), 300);
      }

    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to send message');
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

  const startStructuredInterview = async () => {
    if (!selectedInterview) return;

    setIsInterviewStarted(true);
    setIsStructuredMode(false); // use chat mode, AI controls questions
    setNewMessage('');

    // Send a hidden trigger message to start the interview
    try {
      setIsSending(true);

      const triggerMessage: InterviewMessage = {
        id: Date.now(),
        interview_id: selectedInterview.id,
        role: 'user',
        content: '__START_INTERVIEW__',
        created_at: new Date().toISOString()
      };

      const aiMessage = await interviewApi.sendMessage(
        selectedInterview.id,
        { role: 'user', content: '__START_INTERVIEW__' }
      );

      const updatedInterview = {
        ...selectedInterview,
        messages: [...(selectedInterview.messages || []), aiMessage]
      };
      setSelectedInterview(updatedInterview);
      setInterviews(prev =>
        prev.map(int => int.id === selectedInterview.id ? updatedInterview : int)
      );

      await speakTextAndWait(aiMessage.content);
      startRecording(); // mic on after greeting
    } catch (err) {
      setError('Failed to start interview');
    } finally {
      setIsSending(false);
    }
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
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      // Set silence timeout (stop after 30 seconds of no speech)
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isRecording) {
          recognitionRef.current.stop();
        }
      }, 30000);
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        if (error?.name === 'InvalidStateError') {
          // Already started, ignore
        } else {
          console.error('Error starting recognition:', error);
          setError('Failed to start speech recognition.');
          setIsRecording(false);
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
      }
    } else if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const speakTextAndWait = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  };

  // Keep old one for non-blocking calls
  const speakText = (text: string) => { speakTextAndWait(text); };

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

              {/* Start Interview Button - shown before interview starts */}
              {!isInterviewStarted && selectedInterview.status !== 'completed' && (
                <div className="px-7 py-6 border-t border-zinc-800/50 flex justify-center">
                  <button
                    onClick={startStructuredInterview}
                    disabled={isSending}
                    className="px-10 py-4 bg-[#00F29C] text-black font-bold rounded-2xl text-sm tracking-wide glow-btn disabled:opacity-40"
                  >
                    {isSending ? 'Starting...' : '▶ Start Interview'}
                  </button>
                </div>
              )}

              {/* Live interview controls - only shown after start */}
              {isInterviewStarted && selectedInterview.status !== 'completed' && (
                <div className="px-7 py-5 border-t border-zinc-800/50 bg-zinc-900/30">
                  <div className="flex flex-col items-center gap-3">

                    {/* Waveform */}
                    {(isRecording || isSpeaking) && (
                      <div className="flex gap-1 items-end h-7">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="waveform-bar"
                            style={{ height: `${Math.random() * 20 + 6}px`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    )}

                    {/* Status */}
                    <p className="mono text-[10px] tracking-widest uppercase text-zinc-500">
                      {isSending ? 'AI is thinking...' :
                       isRecording ? '🎙 Listening — speak now' :
                       'Waiting...'}
                    </p>

                    {/* Live transcript preview */}
                    {newMessage && (
                      <p className="text-zinc-400 text-xs italic text-center max-w-sm truncate">
                        {newMessage}
                      </p>
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