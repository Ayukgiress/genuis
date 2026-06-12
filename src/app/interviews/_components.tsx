"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Interview, Job } from "@/types";

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components for the interview page (part 1)
   Uses the global dark theme (bg-card, text-white, primary = #00f29c)
   ────────────────────────────────────────────────────────────────────────── */

export type Phase = "idle" | "ai_speaking" | "user_speaking" | "processing" | "ready";

const PRIMARY = "#00f29c";

/* ── SESSION PICKER — clean dropdown replacing the old sidebar ───────────── */

export function SessionPicker({
  interviews,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onComplete,
  getJob,
  formatRelative,
}: {
  interviews: Interview[];
  selectedId: number | null;
  onSelect: (i: Interview) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  getJob: (jobId: string) => Job | undefined;
  formatRelative: (d: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = interviews.find((i) => i.id === selectedId) || null;
  const job = selected ? getJob(selected.job_id) : null;
  const title = job?.title || "Practice session";
  const company = job?.company || "";
  const initial = (company || title || "?")[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900/70 transition-colors group max-w-[260px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div
          className="w-7 h-7 shrink-0 rounded-lg grid place-items-center text-[12px] font-semibold text-black"
          style={{ backgroundColor: PRIMARY }}
        >
          {initial}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-[13px] font-semibold text-white truncate leading-tight">
            {title}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {company || "Practice session"}
          </p>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[320px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
          role="listbox"
        >
          <div className="px-3 py-2.5 border-b border-zinc-800/70 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Your sessions · {interviews.length}
            </p>
            <button
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              className="text-[11px] font-semibold text-primary hover:opacity-80 inline-flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto wf-scrollbar py-1">
            {interviews.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-zinc-500">No sessions yet</p>
                <button
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                  className="mt-2 text-[12px] font-semibold text-primary hover:opacity-80"
                >
                  Start your first session →
                </button>
              </div>
            ) : (
              interviews.map((iv) => {
                const j = getJob(iv.job_id);
                const isActive = selectedId === iv.id;
                const isCompleted = iv.status === "completed";
                const hasMessages = (iv.messages?.length ?? 0) > 0;
                const t = j?.title || "Practice session";
                const c = j?.company || "";
                const ini = (c || t || "?")[0].toUpperCase();

                return (
                  <div
                    key={iv.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSelect(iv);
                      setOpen(false);
                    }}
                    className={`
                      group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                      ${isActive ? "bg-zinc-900" : "hover:bg-zinc-900/60"}
                    `}
                  >
                    <div
                      className={`
                        w-8 h-8 shrink-0 rounded-lg grid place-items-center text-[12px] font-semibold
                        ${isActive
                          ? "text-black"
                          : isCompleted
                            ? "bg-zinc-800 text-zinc-500"
                            : "bg-zinc-800 text-zinc-300"}
                      `}
                      style={isActive ? { backgroundColor: PRIMARY } : undefined}
                    >
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate leading-tight ${isActive ? "text-white" : "text-zinc-200"}`}>
                        {t}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {c ? `${c} · ` : ""}
                        {formatRelative(iv.created_at)}
                        {isCompleted ? " · Completed" : hasMessages ? " · In progress" : " · Not started"}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0 transition-opacity">
                      {!isCompleted && hasMessages && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onComplete(iv.id);
                          }}
                          className="w-6 h-6 grid place-items-center rounded-md text-zinc-500 hover:text-primary hover:bg-zinc-800 transition-colors"
                          title="Mark complete"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(iv.id);
                        }}
                        className="w-6 h-6 grid place-items-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CLEAN STAGE HEADER ─────────────────────────────────────────────────── */

export function StageHeader({
  interviews,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onComplete,
  getJob,
  formatRelative,
  job,
  isInterviewActive,
  phase,
  elapsed,
  formatElapsed,
  onToggle,
  disabled,
}: {
  interviews: Interview[];
  selectedId: number | null;
  onSelect: (i: Interview) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
  getJob: (jobId: string) => Job | undefined;
  formatRelative: (d: string) => string;
  job: Job | null | undefined;
  isInterviewActive: boolean;
  phase: Phase;
  elapsed: number;
  formatElapsed: (s: number) => string;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-b border-zinc-800/70 px-4 sm:px-8 py-3.5 flex items-center gap-3">
      {/* Session picker (replaces sidebar) */}
      <SessionPicker
        interviews={interviews}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreate={onCreate}
        onDelete={onDelete}
        onComplete={onComplete}
        getJob={getJob}
        formatRelative={formatRelative}
      />

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
