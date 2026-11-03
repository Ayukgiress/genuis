'use client';

import React from 'react';
import Link from 'next/link';
import { useApplicationStore } from '@/store/applicationStore';
import { ApplicationStatus } from '@/types';

interface ApplicationTrackerProps {
  className?: string;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  wishlist: { label: 'Wishlist', color: 'text-zinc-400', bgColor: 'bg-zinc-800' },
  applied: { label: 'Applied', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  screening: { label: 'Screening', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
  interview: { label: 'Interview', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  offer: { label: 'Offer', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  rejected: { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
};

export function ApplicationTracker({ className = '' }: ApplicationTrackerProps) {
  const { applications, isLoading } = useApplicationStore();

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

  return (
    <div className={`space-y-4 ${className}`}>
      {applications.map((app) => {
        const config = statusConfig[app.status];
        return (
          <div
            key={app.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-primary/30 transition-all"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{app.title}</h4>
              <p className="text-sm text-zinc-400 truncate">{app.company}</p>
              {app.appliedAt && (
                <p className="text-xs text-zinc-500 mt-1">
                  Applied {new Date(app.appliedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${config.bgColor} ${config.color}`}>
              {config.label}
            </div>
            {app.status === 'interview' && (
              <Link href="/interviews">
                <button className="px-3 py-1.5 text-xs font-bold text-primary hover:underline whitespace-nowrap">
                  Prep Now
                </button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}