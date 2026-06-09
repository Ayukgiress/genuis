"use client";

import React from "react";
import type { Interview, Job } from "@/types";

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components for the interview page (part 1)
   Uses the global dark theme (bg-card, text-white, primary = #00f29c)
   ────────────────────────────────────────────────────────────────────────── */

export type Phase = "idle" | "ai_speaking" | "user_speaking" | "processing" | "ready";

const PRIMARY = "#00f29c";


export function SessionList({
  interviews,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onComplete,
  getJob,
  formatRelative,
  panelOpen,
  closePanel,
}: {
  interviews: Interview[];
  selectedId: number | null;
  onSelect: (i: Interview) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  getJob: (jobId: string) => Job | undefined;
  formatRelative: (d: string) => string;
  panelOpen: boolean;
  closePanel: () => void;
}) {
  return (
    <>
      {panelOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closePanel}
        />
      )}

      <aside
        className={`
          w-[280px] shrink-0 bg-zinc-950 border-r border-zinc-800
          flex flex-col z-50 transition-transform duration-300
          fixed lg:relative inset-y-0 left-0 lg:top-0
          ${panelOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ top: 0 }}
      >
        <div className="px-5 pt-5 pb-3 border-b border-zinc-800/70 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Practice sessions</h2>
            <button
              onClick={onCreate}
              className="w-7 h-7 rounded-lg bg-primary text-black grid place-items-center hover:opacity-90 transition-opacity"
              title="New session (⌘N)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            {interviews.length} session{interviews.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto wf-scrollbar px-2 py-2">
          {interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">No sessions yet</p>
                <p className="text-xs text-zinc-500 mt-0.5">Start a new one to begin practicing.</p>
              </div>
              <button
                onClick={onCreate}
                className="mt-1 text-xs font-semibold text-primary hover:opacity-80"
              >
                Start a session →
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {interviews.map((iv) => {
                const job = getJob(iv.job_id);
                const isActive = selectedId === iv.id;
                const isCompleted = iv.status === "completed";
                const hasMessages = (iv.messages?.length ?? 0) > 0;
                const company = job?.company || "";
                const title = job?.title || "Practice session";
                const initial = (company || title || "?")[0].toUpperCase();

                return (
                  <li
                    key={iv.id}
                    onClick={() => onSelect(iv)}
                    className={`
                      group relative flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer
                      transition-colors duration-100
                      ${isActive ? "bg-zinc-900" : "hover:bg-zinc-900/60"}
                    `}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                        style={{ backgroundColor: PRIMARY }}
                      />
                    )}

                    <div
                      className={`
                        w-9 h-9 shrink-0 rounded-lg grid place-items-center text-[13px] font-semibold
                        ${isActive
                          ? "text-black"
                          : isCompleted
                            ? "bg-zinc-800 text-zinc-500"
                            : "bg-zinc-800 text-zinc-300"}
                      `}
                      style={isActive ? { backgroundColor: PRIMARY } : undefined}
                    >
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate leading-tight ${isActive ? "text-white" : "text-zinc-200"}`}>
                        {title}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {company ? `${company} · ` : ""}{formatRelative(iv.created_at)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isCompleted ? (
                          <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                            Completed
                          </span>
                        ) : hasMessages ? (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ color: PRIMARY, backgroundColor: "rgba(0,242,156,0.1)" }}
                          >
                            In progress
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Not started
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 shrink-0 transition-opacity">
                      {!isCompleted && hasMessages && (
                        <button
                          className="w-6 h-6 grid place-items-center rounded-md text-zinc-500 hover:text-primary hover:bg-zinc-800 transition-colors"
                          onClick={(e) => { e.stopPropagation(); onComplete(iv.id); }}
                          title="Mark complete"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="w-6 h-6 grid place-items-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDelete(iv.id); }}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800/70 shrink-0">
          <p className="text-[11px] text-zinc-600">⌘N · new session</p>
        </div>
      </aside>
    </>
  );
}

/* ── MINIMAL STAGE HEADER (no in-page top bar) ───────────────────────────── */

export function StageHeader({
  job,
  isInterviewActive,
  phase,
  elapsed,
  formatElapsed,
  onToggle,
  onMobileSessions,
  disabled,
}: {
  job: Job | null | undefined;
  isInterviewActive: boolean;
  phase: Phase;
  elapsed: number;
  formatElapsed: (s: number) => string;
  onToggle: () => void;
  onMobileSessions: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-b border-zinc-800/70 px-4 sm:px-8 py-4 flex items-center gap-3">
      {/* Mobile sessions toggle */}
      <button
        onClick={onMobileSessions}
        className="lg:hidden w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center text-zinc-400 hover:text-white"
        aria-label="Open sessions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Job context */}
      {job && (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center text-[12px] font-bold text-zinc-300 shrink-0">
            {(job.company || job.title || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white truncate leading-tight">
              {job.title}
            </p>
            <p className="text-[12px] text-zinc-500 truncate">
              {job.company}{job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Phase pill (compact) */}
        <PhaseChip phase={phase} isActive={isInterviewActive} />

        {/* Timer */}
        {isInterviewActive && (
          <div className="hidden sm:flex items-center text-[12px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">
            {formatElapsed(elapsed)}
          </div>
        )}

        {/* Start / End */}
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`
            inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold
            transition-all duration-150
            ${isInterviewActive
              ? "bg-zinc-900 border border-red-500/30 text-red-400 hover:bg-red-500/10"
              : "bg-primary text-black hover:opacity-90"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isInterviewActive ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
              End
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start session
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PhaseChip({ phase, isActive }: { phase: Phase; isActive: boolean }) {
  if (!isActive) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        Ready
      </div>
    );
  }
  if (phase === "ai_speaking") {
    return (
      <div
        className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border"
        style={{ color: PRIMARY, backgroundColor: "rgba(0,242,156,0.08)", borderColor: "rgba(0,242,156,0.3)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: PRIMARY }} />
        AI speaking
      </div>
    );
  }
  if (phase === "user_speaking") {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        You're speaking
      </div>
    );
  }
  return (
    <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
      Listening
    </div>
  );
}
