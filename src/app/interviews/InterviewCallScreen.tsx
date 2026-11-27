'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AiTurnMedia } from '@/hooks/useInterviewWebSocket';
import { useInterviewPresenceMetrics, type PresenceMetrics } from '@/hooks/useInterviewPresenceMetrics';
import type { Phase } from './_components';
import { AIVideoPanel } from './_components2';

export function InterviewCallScreen({
  phase, elapsed, durationMinutes, questionCount, totalQuestions, userInitial,
  userName, attachVideo, isCameraOn, cameraError, aiMedia, audioAmplitude,
  captionsEnabled,
  onToggleCaptions, muted, onToggleMute, onToggleCamera, onEnd, isTextMode,
  transcript, onSubmitText, connectionLabel,
  onPresenceMetrics,
  lowBandwidth = false,
}: {
  phase: Phase;
  elapsed: number;
  durationMinutes: number;
  questionCount: number;
  totalQuestions: number;
  userInitial: string;
  userName: string;
  attachVideo: (el: HTMLVideoElement | null) => void;
  isCameraOn: boolean;
  cameraError: string | null;
  aiMedia: AiTurnMedia;
  audioAmplitude: number;
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
  isTextMode: boolean;
  transcript: string;
  onSubmitText: (text: string) => Promise<void>;
  connectionLabel: string;
  onPresenceMetrics: (metrics: PresenceMetrics) => void;
  lowBandwidth?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [selfPosition, setSelfPosition] = useState({ x: 0.76, y: 0.06 });
  const [isDragging, setIsDragging] = useState(false);
  const [chatOpen, setChatOpen] = useState(isTextMode);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [selfVideo, setSelfVideo] = useState<HTMLVideoElement | null>(null);
  const { metrics: presenceMetrics, error: presenceError } = useInterviewPresenceMetrics(selfVideo, presenceEnabled && isCameraOn && !lowBandwidth);
  const attachSelfVideo = useCallback((element: HTMLVideoElement | null) => {
    setSelfVideo(element);
    attachVideo(element);
  }, [attachVideo]);
  const secondsLeft = Math.max(0, durationMinutes * 60 - elapsed);
  const timer = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const remaining = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (isTextMode) setChatOpen(true);
  }, [isTextMode]);

  useEffect(() => {
    onPresenceMetrics(presenceMetrics);
  }, [onPresenceMetrics, presenceMetrics]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.min(0.82, Math.max(0.02, (event.clientX - rect.left - 100) / rect.width));
    const y = Math.min(0.76, Math.max(0.02, (event.clientY - rect.top - 70) / rect.height));
    setSelfPosition({ x, y });
  };

  const submitText = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      await onSubmitText(text);
      setDraft('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4 sm:px-7 sm:py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Live practice</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-white">{timer}</span>
            <span className="text-xs text-zinc-600">{remaining} left</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">
            <span className={`h-2 w-2 rounded-full ${phase === 'ai_speaking' ? 'animate-pulse bg-primary' : 'bg-primary'}`} />
            {connectionLabel}
          </span>
          <div className="hidden min-w-36 sm:block">
            <div className="flex justify-between text-[10px] text-zinc-500"><span>Question {Math.min(questionCount, totalQuestions)} of {totalQuestions}</span><span>{Math.round(Math.min(1, questionCount / totalQuestions) * 100)}%</span></div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (questionCount / totalQuestions) * 100)}%` }} /></div>
          </div>
        </div>
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-800 bg-[#070a09]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,242,156,0.07),transparent_58%)]" />
        <div className="relative flex h-full min-h-105 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-4xl">
            <AIVideoPanel phase={phase} isActive media={aiMedia} audioAmplitude={audioAmplitude} />
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span className={`h-1.5 w-1.5 rounded-full ${phase === 'ai_speaking' ? 'bg-primary' : 'bg-zinc-600'}`} />
              {phase === 'ai_speaking' ? 'Interviewer speaking' : phase === 'processing' ? 'Preparing your next question' : phase === 'user_speaking' ? 'Listening to your answer' : 'Your turn to respond'}
            </div>
          </div>
        </div>

        <div
          className={`absolute z-20 w-40 cursor-grab touch-none overflow-hidden rounded-2xl border bg-zinc-950 shadow-2xl sm:w-56 ${isDragging ? 'cursor-grabbing border-primary/70' : 'border-white/20'}`}
          style={{ left: `${selfPosition.x * 100}%`, top: `${selfPosition.y * 100}%` }}
          onPointerDown={(event) => { setIsDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          aria-label="Draggable self-view"
        >
          <div className="relative aspect-video bg-zinc-900">
            {isCameraOn ? <video ref={attachSelfVideo} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" /> : <div className="absolute inset-0 grid place-items-center text-xl font-bold text-primary">{userInitial}</div>}
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">{userName}{muted ? ' · muted' : ''}</span>
            {!isCameraOn && cameraError && <span className="absolute inset-x-1 bottom-8 text-center text-[9px] text-amber-300">Audio only</span>}
          </div>
        </div>

        {captionsEnabled && (aiMedia.transcript || transcript) && (
          <div aria-live="polite" className="absolute bottom-24 left-1/2 z-10 w-[min(90%,44rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-black/75 px-4 py-3 text-center text-sm leading-relaxed text-white shadow-xl backdrop-blur">
            {aiMedia.transcript || transcript}
          </div>
        )}

        {chatOpen && (
          <div className="absolute bottom-24 left-4 right-4 z-30 mx-auto max-w-2xl rounded-2xl border border-zinc-700 bg-black/90 p-3 shadow-xl backdrop-blur sm:left-1/2 sm:right-auto sm:w-[min(90%,38rem)] sm:-translate-x-1/2">
            {isTextMode && <p className="mb-2 text-xs text-amber-300">Speech recognition is unavailable. Continue by typing your answer.</p>}
            <form onSubmit={submitText} className="flex gap-2">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your answer…" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50" aria-label="Type answer" />
              <button type="submit" disabled={!draft.trim() || isSending} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-black disabled:opacity-40">{isSending ? 'Sending…' : 'Send'}</button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px]">
        <button type="button" onClick={() => { if (presenceEnabled) onPresenceMetrics({}); setPresenceEnabled(!presenceEnabled); }} aria-pressed={presenceEnabled} className={`rounded-lg border px-3 py-2 font-semibold transition ${presenceEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'}`}>
          {presenceEnabled ? 'On-device eye & posture feedback: on' : 'Enable optional eye & posture feedback'}
        </button>
        {presenceEnabled && <span className="text-zinc-500">Video is analyzed in this browser only; frames are not uploaded or saved.</span>}
        {presenceEnabled && (presenceMetrics.eyeContactPercent !== undefined || presenceMetrics.postureScore !== undefined) && <span className="text-zinc-300">{presenceMetrics.eyeContactPercent !== undefined ? `Eye-contact estimate ${presenceMetrics.eyeContactPercent}%` : ''}{presenceMetrics.eyeContactPercent !== undefined && presenceMetrics.postureScore !== undefined ? ' · ' : ''}{presenceMetrics.postureScore !== undefined ? `Posture ${presenceMetrics.postureScore}/100` : ''}</span>}
        {presenceEnabled && presenceError && <span role="status" className="text-amber-300">{presenceError}</span>}
      </div>

      <footer className="mt-4 flex items-center justify-center gap-2 sm:mt-5 sm:gap-3" aria-label="Interview controls">
        <ControlButton label={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={onToggleMute} active={muted}>
          {muted ? '🎙' : '🎤'}<span className="hidden sm:inline">{muted ? 'Unmute' : 'Mute'}</span>
        </ControlButton>
        <ControlButton label={lowBandwidth ? 'Camera disabled in low-bandwidth mode' : isCameraOn ? 'Turn camera off' : 'Turn camera on'} onClick={onToggleCamera} active={!isCameraOn} disabled={lowBandwidth && !isCameraOn}>
          {isCameraOn ? '▣' : '▧'}<span className="hidden sm:inline">{isCameraOn ? 'Camera' : 'Camera off'}</span>
        </ControlButton>
        <ControlButton label={captionsEnabled ? 'Turn captions off' : 'Turn captions on'} onClick={onToggleCaptions} active={captionsEnabled}>
          CC<span className="hidden sm:inline">Captions</span>
        </ControlButton>
        <ControlButton label={chatOpen ? 'Close text chat' : 'Open text chat'} onClick={() => setChatOpen((open) => !open)} active={chatOpen || isTextMode}>
          ▤<span className="hidden sm:inline">{isTextMode ? 'Text mode' : 'Chat'}</span>
        </ControlButton>
        <button type="button" onClick={onEnd} className="ml-1 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-xs font-bold text-white transition hover:bg-red-400 sm:px-5" aria-label="End interview">End call</button>
      </footer>
      {cameraError && !isCameraOn && <p className="mt-2 text-center text-[11px] text-zinc-600">Camera unavailable — interview continues in audio-only mode.</p>}
    </section>
  );
}

function ControlButton({ label, onClick, active, children, disabled = false }: { label: string; onClick: () => void; active: boolean; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} disabled={disabled} className={`inline-flex min-w-11 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition sm:min-w-0 disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'}`}>{children}</button>;
}
