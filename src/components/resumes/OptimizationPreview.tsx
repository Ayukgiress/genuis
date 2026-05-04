import React from 'react';
import { AnalysisResult } from '@/types';

interface OptimizationPreviewProps {
  result: AnalysisResult;
}

export function OptimizationPreview({ result }: OptimizationPreviewProps) {
  const beforeIssues = result.weaknesses || [];
  const afterImprovements = result.suggestions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Optimization Preview</h3>
        <span className="text-xs text-zinc-500">Before → After transformation</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Problems */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-red-500/20">
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Current Resume Issues
          </h4>
          {beforeIssues.length > 0 ? (
            <ul className="space-y-3">
              {beforeIssues.map((issue, i) => (
                <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  {issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 italic">No significant issues found. Great job!</p>
          )}
        </div>

        {/* AI Improvements */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-green-500/20">
          <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            AI Optimized Version
          </h4>
          {afterImprovements.length > 0 ? (
            <ul className="space-y-3">
              {afterImprovements.map((improvement, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  {improvement}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 italic">Click "Generate" to see AI suggestions.</p>
          )}
        </div>
      </div>

      {(beforeIssues.length > 0 || afterImprovements.length > 0) && (
        <div className="flex justify-end gap-3">
          <button 
            className="px-6 py-3 border border-zinc-700 text-zinc-400 font-bold rounded-xl hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2"
            onClick={() => {
              alert('Download feature coming soon! This will provide your optimized resume in PDF format.');
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Optimized Version
          </button>
        </div>
      )}
    </div>
  );
}
