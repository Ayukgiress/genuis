"use client";

import React from "react";
import type { Job } from "@/types";
import type { Phase } from "./_components";

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components for the interview page (part 2)
   - InterviewStage, ParticipantCard, AIAvatar
   - PhaseCaption, Notice, StageFooter
   - EmptyStage, CreateModal
   ────────────────────────────────────────────────────────────────────────── */

/* ── INTERVIEW STAGE — the 2-card centerpiece ────────────────────────────── */

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
                  ? "bg-amber-100 text-amber-800 ring-4 ring-amber-300"
                  : "bg-zinc-100 text-zinc-700"}
              `}
            >
              {userInitial}
            </div>
          }
          speaking={phase === "user_speaking"}
          isActive={isInterviewActive}
        />
      </div>

      {/* Central play/stop button */}
      <div className="mt-8 sm:mt-10 flex justify-center">
        <button
          onClick={onToggle}
          disabled={disabled}
          aria-label={isInterviewActive ? "End session" : "Start session"}
          className={`
            group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center
            transition-all duration-200 shadow-sm
            ${isInterviewActive
              ? "bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:shadow"
              : "bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 hover:scale-105 hover:shadow-lg"}
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
  const accentBg = isYou ? "bg-amber-50" : "bg-emerald-50";
  const accentBorder = isYou ? "border-amber-200" : "border-emerald-200";
  const accentText = isYou ? "text-amber-700" : "text-emerald-700";
  const accentDot = isYou ? "bg-amber-500" : "bg-emerald-500";
  const speakingPill = isYou ? "You're speaking" : "AI is speaking";

  return (
    <div
      className={`
        relative rounded-2xl border bg-white p-5 sm:p-6
        transition-all duration-300
        ${speaking
          ? `${accentBorder} ${accentBg} shadow-sm`
          : "border-zinc-200"}
        ${!isActive ? "opacity-70" : ""}
      `}
    >
      {/* Top row: role pill + live dot */}
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
        <p className="text-[15px] font-semibold text-zinc-900 truncate">{name}</p>
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
          <span className="text-[11px] text-zinc-400">
            {isYou ? "Listening…" : "Waiting…"}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-400">Standby</span>
        )}
      </div>

      {/* Speaking pill (mobile-friendly larger label) */}
      {speaking && isActive && (
        <div className="mt-3 flex justify-center sm:hidden">
          <span className={`text-[10px] font-medium ${accentText}`}>{speakingPill}</span>
        </div>
      )}
    </div>
  );
}

/* ── AI AVATAR (the circular brain icon) ──────────────────────────────────── */

function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div
      className={`
        w-20 h-20 sm:w-24 sm:h-24 rounded-full grid place-items-center transition-all duration-300
        ${speaking
          ? "bg-emerald-600 text-white ring-4 ring-emerald-300"
          : "bg-zinc-100 text-zinc-700"}
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

/* ── PHASE CAPTION (text under the cards) ─────────────────────────────────── */

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
        Press <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700">Start session</kbd> to begin your practice interview for {jobTitle ? `the ${jobTitle} role` : "this position"}.
      </p>
    );
  }
  if (phase === "ai_speaking") {
    return (
      <p className="mt-6 text-center text-[13px] text-emerald-700 font-medium">
        The AI interviewer is asking a question — listen carefully.
      </p>
    );
  }
  if (phase === "user_speaking") {
    return (
      <p className="mt-6 text-center text-[13px] text-amber-700 font-medium">
        You're speaking — your answer is being recorded.
      </p>
    );
  }
  return (
    <p className="mt-6 text-center text-[13px] text-zinc-600">
      Your turn — speak when you're ready.
    </p>
  );
}

/* ── NOTICE / ERROR PILL ──────────────────────────────────────────────────── */

export function Notice({ tone, msg }: { tone: "warn" | "error" | "info"; msg: string }) {
  const colors =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : tone === "error"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-zinc-50 border-zinc-200 text-zinc-700";

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
    <div className="border-t border-zinc-200/70 px-4 sm:px-8 py-3 flex items-center gap-3 flex-wrap text-[12px] text-zinc-500">
      <span className="font-medium text-zinc-600">Session #{interviewId}</span>
      <span>·</span>
      <span>{new Date(createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
      <span>·</span>
      <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>

      {status === "completed" ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md text-[11px] font-medium">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Completed
        </span>
      ) : (
        <button
          onClick={onComplete}
          className="ml-auto text-[12px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
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
        <div className="absolute inset-0 rounded-2xl bg-emerald-100 rotate-6" />
        <div className="absolute inset-0 rounded-2xl bg-white border border-zinc-200 grid place-items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-700">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Ready to practice?</h2>
      <p className="text-sm text-zinc-500 max-w-sm mt-2 leading-relaxed">
        Start a session to do a voice mock interview with our AI. Get instant feedback on your answers.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
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
      className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">New session</p>
              <h3 className="text-base font-semibold text-zinc-900 mt-0.5">Choose a job position</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-700 mb-2">
              Job position
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer"
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
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 text-[14px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={!selectedJobId || isCreating}
              className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-[14px] font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
