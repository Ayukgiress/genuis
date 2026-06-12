"use client";

import React from "react";
import type { Job } from "@/types";
import type { Phase } from "./_components";

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components for the interview page (part 2)
   Dark theme + brand primary (#00f29c) — matches globals.css
   ────────────────────────────────────────────────────────────────────────── */

const PRIMARY = "#00f29c";

/* ── INTERVIEW STAGE — 2-card centerpiece ────────────────────────────────── */

export function InterviewStage({
  phase,
  isInterviewActive,
  job,
  userInitial,
  userName,
  onToggle,
  disabled,
}: {
  phase: Phase;
  isInterviewActive: boolean;
  job: Job | null | undefined;
  userInitial: string;
  userName: string;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="w-full max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <ParticipantCard
          kind="ai"
          name="AI Interviewer"
          role={job?.title || "Recruiter"}
          avatar={<AIAvatar speaking={phase === "ai_speaking"} />}
          speaking={phase === "ai_speaking"}
          isActive={isInterviewActive}
        />
        <ParticipantCard
          kind="you"
          name={userName}
          role="Candidate"
          avatar={
            <div
              className={`
                w-20 h-20 sm:w-24 sm:h-24 rounded-full grid place-items-center
                text-2xl sm:text-3xl font-bold transition-all duration-300
                ${phase === "user_speaking"
                  ? "bg-amber-500/15 text-amber-300 ring-4 ring-amber-500/30"
                  : "bg-zinc-800 text-white"}
              `}
            >
              {userInitial}
            </div>
          }
          speaking={phase === "user_speaking"}
          isActive={isInterviewActive}
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

/* ── PARTICIPANT CARD ─────────────────────────────────────────────────────── */

function ParticipantCard({
  kind,
  name,
  role,
  avatar,
  speaking,
  isActive,
}: {
  kind: "ai" | "you";
  name: string;
  role: string;
  avatar: React.ReactNode;
  speaking: boolean;
  isActive: boolean;
}) {
  const isYou = kind === "you";
  // You: amber accent; AI: brand primary accent
  const accentRing = isYou ? "ring-amber-500/40" : "ring-primary/40";
  const accentBg = isYou ? "rgba(245,158,11,0.06)" : "rgba(0,242,156,0.06)";
  const accentBorder = isYou ? "border-amber-500/40" : "border-primary/40";
  const accentText = isYou ? "text-amber-300" : "text-primary";
  const accentDot = isYou ? "bg-amber-400" : "bg-primary";
  const speakingPill = isYou ? "You're speaking" : "AI is speaking";

  return (
    <div
      className={`
        relative rounded-2xl border bg-zinc-950 p-5 sm:p-6
        transition-all duration-300
        ${speaking
          ? `${accentBorder} shadow-[0_0_24px_rgba(0,242,156,0.08)]`
          : "border-zinc-800"}
        ${!isActive ? "opacity-60" : ""}
      `}
      style={speaking ? { backgroundColor: accentBg } : undefined}
    >
      {/* Top row: role label + live dot */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${accentText}`}>
          {isYou ? "You" : "AI Interviewer"}
        </span>
        {speaking && isActive && (
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${accentText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${accentDot} animate-pulse`} />
            speaking
          </span>
        )}
      </div>

      {/* Avatar with pulse rings when speaking */}
      <div className="relative w-full flex justify-center my-4 sm:my-6">
        {speaking && isActive && (
          <>
            <span
              className={`absolute inset-0 m-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full ${accentDot} opacity-30`}
              style={{ animation: "wf-pulse-ring 1.8s cubic-bezier(0.4,0,0.2,1) infinite" }}
            />
            <span
              className={`absolute inset-0 m-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full ${accentDot} opacity-20`}
              style={{ animation: "wf-pulse-ring 1.8s cubic-bezier(0.4,0,0.2,1) infinite 0.6s" }}
            />
          </>
        )}
        <div className="relative z-10">{avatar}</div>
      </div>

      {/* Name + role */}
      <div className="text-center">
        <p className="text-[15px] font-semibold text-white truncate">{name}</p>
        <p className="text-[12px] text-zinc-500 truncate mt-0.5">{role}</p>
      </div>

      {/* Waveform / status */}
      <div className="flex justify-center mt-4 h-7 items-end">
        {speaking && isActive ? (
          <div className="flex items-end gap-[3px] h-6">
            {[0.0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2, 0.12].map((delay, i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full ${accentDot}`}
                style={{
                  height: `${10 + (i % 3) * 8}px`,
                  animation: `wf-bar ${0.7 + (i % 3) * 0.15}s ease-in-out ${delay}s infinite`,
                  transformOrigin: "center",
                }}
              />
            ))}
          </div>
        ) : isActive ? (
          <span className="text-[11px] text-zinc-500">
            {isYou ? "Listening…" : "Waiting…"}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-600">Standby</span>
        )}
      </div>

      {/* Mobile speaking label */}
      {speaking && isActive && (
        <div className="mt-3 flex justify-center sm:hidden">
          <span className={`text-[10px] font-medium ${accentText}`}>{speakingPill}</span>
        </div>
      )}
    </div>
  );
}

/* ── AI AVATAR ────────────────────────────────────────────────────────────── */

function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div
      className={`
        w-20 h-20 sm:w-24 sm:h-24 rounded-full grid place-items-center transition-all duration-300
        ${speaking
          ? "bg-primary text-black ring-4 ring-primary/30"
          : "bg-zinc-800 text-zinc-300"}
      `}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
        <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ── PHASE CAPTION ────────────────────────────────────────────────────────── */

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
      <p className="mt-6 text-center text-[13px] text-primary font-medium">
        The AI interviewer is asking a question — listen carefully.
      </p>
    );
  }
  if (phase === "user_speaking") {
    return (
      <p className="mt-6 text-center text-[13px] text-amber-300 font-medium">
        You're speaking — your answer is being recorded.
      </p>
    );
  }
  return (
    <p className="mt-6 text-center text-[13px] text-zinc-400">
      Your turn — speak when you're ready.
    </p>
  );
}

/* ── NOTICE PILL ──────────────────────────────────────────────────────────── */

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

/* ── STAGE FOOTER ─────────────────────────────────────────────────────────── */

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

/* ── EMPTY STAGE ──────────────────────────────────────────────────────────── */

export function EmptyStage({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-2xl rotate-6" style={{ backgroundColor: "rgba(0,242,156,0.1)" }} />
        <div className="absolute inset-0 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white tracking-tight">Ready to practice?</h2>
      <p className="text-sm text-zinc-500 max-w-sm mt-2 leading-relaxed">
        Start a session to do a voice mock interview with our AI. Get instant feedback on your answers.
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

/* ── CREATE MODAL ─────────────────────────────────────────────────────────── */

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
                You don't have any jobs saved yet. Add some from the Jobs page first.
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
