"use client";

import React, { useEffect, useRef } from "react";
import type { Job } from "@/types";
import type { Phase } from "./_components";
import type { AiTurnMedia } from "@/hooks/useInterviewSession";

const PRIMARY = "#00f29c";

/* ── AI VIDEO PANEL ─────────────────────────────────────────────────────── */

export function AIVideoPanel({
  phase,
  isActive,
  media,
}: {
  phase: Phase;
  isActive: boolean;
  media?: AiTurnMedia;
}) {
  const speaking = phase === "ai_speaking";
  const processing = phase === "processing";
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/pause the avatar video clip in sync with the speaking phase
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (speaking) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [speaking]);

  // Resolve which video source to use (URL preferred over base64)
  const videoSrc = media?.videoUrl
    ? media.videoUrl
    : media?.videoData
      ? `data:video/webm;base64,${media.videoData}`
      : null;

  return (
    <div
      className={`
        relative w-full aspect-video rounded-2xl overflow-hidden border transition-all duration-300
        ${speaking ? "border-primary/50 shadow-[0_0_32px_rgba(0,242,156,0.15)]" : "border-zinc-800"}
        bg-zinc-950
      `}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: speaking
            ? "radial-gradient(ellipse at 50% 40%, rgba(0,242,156,0.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 40%, rgba(0,242,156,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Avatar video clip — shown when backend provides video */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          loop
          muted={false}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        /* Fallback: animated avatar (audio-only mode) */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            {speaking && (
              <>
                <span
                  className="absolute inset-0 m-auto rounded-full bg-primary opacity-20"
                  style={{ width: 80, height: 80, animation: "wf-pulse-ring 1.8s cubic-bezier(0.4,0,0.2,1) infinite" }}
                />
                <span
                  className="absolute inset-0 m-auto rounded-full bg-primary opacity-10"
                  style={{ width: 80, height: 80, animation: "wf-pulse-ring 1.8s cubic-bezier(0.4,0,0.2,1) infinite 0.6s" }}
                />
              </>
            )}
            <div
              className={`relative z-10 w-20 h-20 rounded-full grid place-items-center transition-all duration-300
                ${speaking ? "bg-primary text-black" : "bg-zinc-800 text-zinc-300"}`}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-[3px] h-6">
            {[0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2, 0.12].map((delay, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full transition-all duration-300"
                style={{
                  height: speaking ? `${10 + (i % 3) * 8}px` : "4px",
                  backgroundColor: speaking ? PRIMARY : "#3f3f46",
                  animation: speaking ? `wf-bar ${0.7 + (i % 3) * 0.15}s ease-in-out ${delay}s infinite` : undefined,
                  transformOrigin: "center",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-3 left-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            color: speaking ? PRIMARY : "#71717a",
            border: `1px solid ${speaking ? "rgba(0,242,156,0.3)" : "rgba(63,63,70,0.5)"}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: speaking ? PRIMARY : processing ? "#f59e0b" : "#52525b",
              animation: (speaking || processing) ? "wf-pulse-ring 1.2s ease-in-out infinite" : undefined,
            }}
          />
          {speaking ? "AI speaking" : processing ? "Processing…" : isActive ? "Listening" : "AI Interviewer"}
        </span>
      </div>

      <div className="absolute bottom-3 right-3">
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">AI</span>
      </div>
    </div>
  );
}

/* ── USER VIDEO PANEL ───────────────────────────────────────────────────── */

export function UserVideoPanel({
  phase,
  isActive,
  userInitial,
  userName,
  attachVideo,
  isCameraOn,
  cameraError,
}: {
  phase: Phase;
  isActive: boolean;
  userInitial: string;
  userName: string;
  attachVideo: (el: HTMLVideoElement | null) => void;
  isCameraOn: boolean;
  cameraError: string | null;
}) {
  const speaking = phase === "user_speaking";

  return (
    <div
      className={`
        relative w-full aspect-video rounded-2xl overflow-hidden border transition-all duration-300
        ${speaking ? "border-amber-500/50 shadow-[0_0_32px_rgba(245,158,11,0.12)]" : "border-zinc-800"}
        bg-zinc-950
      `}
    >
      {/* Live webcam feed */}
      {isCameraOn && (
        <video
          ref={attachVideo}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
      )}

      {/* Overlay when camera is off */}
      {!isCameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className={`
              w-20 h-20 rounded-full grid place-items-center text-2xl font-bold transition-all duration-300
              ${speaking ? "bg-amber-500/20 text-amber-300 ring-4 ring-amber-500/30" : "bg-zinc-800 text-white"}
            `}
          >
            {userInitial}
          </div>
          {cameraError && (
            <p className="text-[11px] text-zinc-500 text-center px-4">{cameraError}</p>
          )}
        </div>
      )}

      {/* Speaking pulse overlay */}
      {speaking && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ border: "2px solid rgba(245,158,11,0.4)", borderRadius: "inherit" }}
        />
      )}

      {/* Status badge */}
      <div className="absolute top-3 left-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            color: speaking ? "#fcd34d" : "#71717a",
            border: `1px solid ${speaking ? "rgba(245,158,11,0.3)" : "rgba(63,63,70,0.5)"}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: speaking ? "#f59e0b" : isActive ? "#52525b" : "#3f3f46",
              animation: speaking ? "wf-pulse-ring 1.2s ease-in-out infinite" : undefined,
            }}
          />
          {speaking ? "You're speaking" : isActive ? "Mic active" : "You"}
        </span>
      </div>

      {/* Name label */}
      <div className="absolute bottom-3 left-3">
        <span
          className="text-[11px] font-semibold px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#a1a1aa" }}
        >
          {userName}
        </span>
      </div>

      {/* Camera off indicator */}
      {!isCameraOn && isActive && (
        <div className="absolute bottom-3 right-3">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">CAM OFF</span>
        </div>
      )}
    </div>
  );
}

/* ── INTERVIEW STAGE ────────────────────────────────────────────────────── */

export function InterviewStage({
  phase,
  isInterviewActive,
  job,
  userInitial,
  userName,
  onToggle,
  disabled,
  attachVideo,
  isCameraOn,
  cameraError,
  aiMedia,
}: {
  phase: Phase;
  isInterviewActive: boolean;
  job: Job | null | undefined;
  userInitial: string;
  userName: string;
  onToggle: () => void;
  disabled: boolean;
  attachVideo: (el: HTMLVideoElement | null) => void;
  isCameraOn: boolean;
  cameraError: string | null;
  aiMedia?: AiTurnMedia;
}) {
  return (
    <div className="w-full max-w-4xl">
      {/* Video grid — 2 columns on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <AIVideoPanel phase={phase} isActive={isInterviewActive} media={aiMedia} />
        <UserVideoPanel
          phase={phase}
          isActive={isInterviewActive}
          userInitial={userInitial}
          userName={userName}
          attachVideo={attachVideo}
          isCameraOn={isCameraOn}
          cameraError={cameraError}
        />
      </div>

      {/* Central play/stop */}
      <div className="mt-8 sm:mt-10 flex justify-center">
        <button
          onClick={onToggle}
          disabled={disabled}
          aria-label={isInterviewActive ? "End session" : "Start session"}
          className={`
            group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center
            transition-all duration-200
            ${isInterviewActive
              ? "bg-zinc-900 border-2 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
              : "bg-primary text-black border-2 border-primary hover:scale-105 hover:shadow-[0_0_30px_rgba(0,242,156,0.4)]"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isInterviewActive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── PHASE CAPTION ──────────────────────────────────────────────────────── */

export function PhaseCaption({
  phase,
  isActive,
  jobTitle,
}: {
  phase: Phase;
  isActive: boolean;
  jobTitle?: string;
}) {
  if (!isActive) {
    return (
      <p className="mt-6 text-center text-[13px] text-zinc-500 max-w-md">
        Press{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-[11px] font-medium text-zinc-300">
          Start session
        </kbd>{" "}
        to begin your practice interview{jobTitle ? ` for the ${jobTitle} role` : ""}.
      </p>
    );
  }
  if (phase === "ai_speaking") {
    return (
      <p className="mt-6 text-center text-[13px] font-medium" style={{ color: PRIMARY }}>
        The AI interviewer is asking a question — listen carefully.
      </p>
    );
  }
  if (phase === "processing") {
    return (
      <p className="mt-6 text-center text-[13px] text-amber-400 font-medium">
        Processing your answer…
      </p>
    );
  }
  if (phase === "user_speaking") {
    return (
      <p className="mt-6 text-center text-[13px] text-amber-300 font-medium">
        You&apos;re speaking — your answer is being recorded.
      </p>
    );
  }
  return (
    <p className="mt-6 text-center text-[13px] text-zinc-400">
      Your turn — speak when you&apos;re ready.
    </p>
  );
}

/* ── NOTICE PILL ────────────────────────────────────────────────────────── */

export function Notice({ tone, msg }: { tone: "warn" | "error" | "info"; msg: string }) {
  const colors =
    tone === "warn"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
      : tone === "error"
        ? "bg-red-500/10 border-red-500/30 text-red-400"
        : "bg-zinc-900 border-zinc-800 text-zinc-400";

  return (
    <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg border ${colors}`}>
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

/* ── STAGE FOOTER ───────────────────────────────────────────────────────── */

export function StageFooter({
  interviewId,
  createdAt,
  messageCount,
  status,
  onComplete,
}: {
  interviewId: number;
  createdAt: string;
  messageCount: number;
  status: string;
  onComplete: () => void;
}) {
  return (
    <div className="border-t border-zinc-800/70 px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap text-[12px] text-zinc-500">
      <span className="font-medium text-zinc-400">Session #{interviewId}</span>
      <span>·</span>
      <span>{new Date(createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
      <span>·</span>
      <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>

      {status === "completed" ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-md text-[11px] font-medium">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Completed
        </span>
      ) : (
        <button
          onClick={onComplete}
          className="ml-auto text-[12px] font-medium text-primary hover:opacity-80"
        >
          Mark as complete →
        </button>
      )}
    </div>
  );
}

/* ── EMPTY STAGE ────────────────────────────────────────────────────────── */

export function EmptyStage({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-2xl rotate-6" style={{ backgroundColor: "rgba(0,242,156,0.1)" }} />
        <div className="absolute inset-0 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
            <rect x="2" y="7" width="13" height="10" rx="2" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white tracking-tight">Ready to practice?</h2>
      <p className="text-sm text-zinc-500 max-w-sm mt-2 leading-relaxed">
        Start a video interview session with our AI interviewer. Your camera and mic will be used for a realistic experience.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Start a session
      </button>
    </div>
  );
}

/* ── CREATE MODAL ───────────────────────────────────────────────────────── */

export function CreateModal({
  jobs,
  selectedJobId,
  setSelectedJobId,
  isCreating,
  onClose,
  onCreate,
}: {
  jobs: Job[];
  selectedJobId: string;
  setSelectedJobId: (s: string) => void;
  isCreating: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">New session</p>
              <h3 className="text-base font-semibold text-white mt-0.5">Choose a job position</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-400 mb-2">
              Job position
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-[14px] text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2371717a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: "36px",
              }}
            >
              <option value="">Select a role…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} @ {j.company}
                </option>
              ))}
            </select>
            {jobs.length === 0 && (
              <p className="mt-2 text-[12px] text-zinc-500">
                You don&apos;t have any jobs saved yet. Add some from the Jobs page first.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-800 text-[14px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={!selectedJobId || isCreating}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-black text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                  Creating…
                </span>
              ) : (
                "Create session"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
