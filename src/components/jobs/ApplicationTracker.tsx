'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApplicationStore } from '@/store/applicationStore';
import { ApplicationStatus } from '@/types';

interface ApplicationTrackerProps {
  className?: string;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  wishlist: { label: 'Wishlist', color: 'text-zinc-400', bgColor: 'bg-zinc-800 border-zinc-700' },
  applied: { label: 'Applied', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  screening: { label: 'Screening', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
  interview: { label: 'Interview', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  offer: { label: 'Offer', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  rejected: { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
};

const ALL_STATUSES = Object.keys(statusConfig) as ApplicationStatus[];

export function ApplicationTracker({ className = '' }: ApplicationTrackerProps) {
  const { applications, isLoading, updateApplicationStatus } = useApplicationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 3V5a2 2 0 0 0 2 2h4" />
          </svg>
        </div>
        <p className="text-zinc-400 mb-2">No applications yet</p>
        <p className="text-zinc-500 text-sm">Apply to jobs to track your progress</p>
      </div>
    );
  }

  const filtered = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus);

  // Count per status for filter badges
  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
            filterStatus === 'all' ? 'bg-zinc-700 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All ({applications.length})
        </button>
        {ALL_STATUSES.filter(s => counts[s] > 0).map(s => {
          const cfg = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                filterStatus === s ? `${cfg.bgColor} ${cfg.color}` : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cfg.label} ({counts[s]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-4">No applications with this status.</p>
      )}

      {filtered.map((app) => {
        const config = statusConfig[app.status];
        const isExpanded = expandedId === app.id;
        return (
          <div
            key={app.id}
            className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{app.title}</h4>
                <p className="text-sm text-zinc-400 truncate">{app.company}</p>
                {app.appliedAt && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Status dropdown */}
              <select
                value={app.status}
                onChange={(e) => updateApplicationStatus(app.id, e.target.value as ApplicationStatus)}
                className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer bg-transparent focus:outline-none ${config.bgColor} ${config.color}`}
                title="Change status"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s} className="bg-zinc-900 text-white">
                    {statusConfig[s].label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setExpandedId(isExpanded ? null : app.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Notes"
              >
                <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {app.status === 'interview' && (
                <Link href="/interviews">
                  <button className="px-3 py-1.5 text-xs font-bold text-primary hover:underline whitespace-nowrap">
                    Prep Now
                  </button>
                </Link>
              )}
            </div>

            {/* Notes panel */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={notes[app.id] ?? ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                  placeholder="Interview date, recruiter name, salary discussed, follow-up reminders..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                />
                <div className="flex gap-2 mt-2">
                  {app.status !== 'offer' && app.status !== 'rejected' && (
                    <Link href={`/letters?compose=1&jobId=${app.jobId}&jobTitle=${encodeURIComponent(app.title)}&company=${encodeURIComponent(app.company)}&type=follow_up_letter`}>
                      <button className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
                        Write Follow-up
                      </button>
                    </Link>
                  )}
                  {app.status === 'interview' && (
                    <Link href={`/letters?compose=1&jobId=${app.jobId}&jobTitle=${encodeURIComponent(app.title)}&company=${encodeURIComponent(app.company)}&type=thank_you_letter`}>
                      <button className="px-3 py-1.5 text-xs font-bold text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
                        Thank You Letter
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
