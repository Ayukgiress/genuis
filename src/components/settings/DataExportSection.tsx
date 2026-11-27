'use client';

import React, { useState } from 'react';
import * as Icons from '@radix-ui/react-icons';

const exportOptions = [
  {
    id: 'profile',
    label: 'Profile & Career Data',
    description: 'Your profile, career preferences, and account settings.',
    icon: Icons.PersonIcon,
  },
  {
    id: 'resumes',
    label: 'Resumes',
    description: 'All saved resumes and optimized versions.',
    icon: Icons.FileTextIcon,
  },
  {
    id: 'applications',
    label: 'Job Applications',
    description: 'Application history, statuses, and notes.',
    icon: Icons.ArchiveIcon,
  },
  {
    id: 'interviews',
    label: 'Interview Reports',
    description: 'Session transcripts, scores, and feedback.',
    icon: Icons.ChatBubbleIcon,
  },
  {
    id: 'letters',
    label: 'Cover Letters',
    description: 'All generated and saved cover letters.',
    icon: Icons.EnvelopeClosedIcon,
  },
];

export const DataExportSection = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set(['profile', 'resumes', 'applications']));
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) return;
    setIsExporting(true);
    setSuccess(null);
    // Simulate export
    await new Promise((r) => setTimeout(r, 1500));
    setIsExporting(false);
    setSuccess(`Export ready! Your ${format.toUpperCase()} file will download shortly.`);
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Export Your Data</h2>
        <p className="text-sm text-zinc-500">Download a copy of your data in your preferred format.</p>
      </div>

      {success && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
          {success}
        </div>
      )}

      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Select data to export</h3>
          <div className="space-y-2">
            {exportOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-black/30 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                  <opt.icon className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white">{opt.label}</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">{opt.description}</span>
                </div>
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => toggle(opt.id)}
                  className="h-4 w-4 accent-[#00f29c] shrink-0"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-zinc-800/70">
          <h3 className="text-sm font-bold text-white">Export format</h3>
          <div className="flex gap-3">
            {(['json', 'csv', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all uppercase ${
                  format === f
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 pt-0 flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting || selected.size === 0}
          className="px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Icons.DownloadIcon className="w-4 h-4" />
              Export Data
            </>
          )}
        </button>
      </div>
    </div>
  );
};
