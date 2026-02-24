'use client';

import React from 'react';

const resumes = [
  {
    id: 1,
    name: 'Senior_Lead_Engineer_2024.pdf',
    type: 'MASTER',
    date: 'JAN 14, 2024',
    size: '1.42 MB',
  },
  {
    id: 2,
    name: 'Neural_Optimized_Fintech_Role....',
    type: 'AI VARIANT',
    date: 'JAN 15, 2024',
    size: '920 KB',
  },
];

export default function ResumesPage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 space-y-12 overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Resume Management</h1>
          <p className="text-zinc-500 max-w-2xl leading-relaxed text-lg">
            Precision-engineered AI resume optimization. Upload your master document to generate tailored career profiles.
          </p>
        </div>

        {/* Upload Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center space-y-8 bg-zinc-950/30">
            <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-primary/50 transition-colors duration-500">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <rect x="8" y="12" width="8" height="6" rx="1" strokeWidth="1" className="fill-primary/20" />
                <text x="9.5" y="16.5" className="fill-primary font-bold text-[6px]">PDF</text>
              </svg>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">Deploy your resume</h3>
              <p className="text-zinc-500">PDF or DOCX supported. Neural processing enabled.</p>
            </div>
            <button className="flex items-center gap-3 px-8 py-4 bg-primary text-black font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(0,242,156,0.4)] uppercase tracking-widest text-xs">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Select Document
            </button>
          </div>
        </div>

        {/* My Vault Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              My Vault
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                [03]
              </span>
            </h2>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                Filter
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                Sort
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {resumes.map((resume) => (
              <div key={resume.id} className="group p-6 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-primary/30 hover:bg-zinc-900/50 transition-all duration-300 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-primary/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-lg">{resume.name}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        resume.type === 'MASTER' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {resume.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {resume.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        {resume.size}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold hover:border-primary/50 transition-all text-primary uppercase tracking-widest">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </button>
                  <button className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 transition-all">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Preview */}
      <div className="w-[450px] border-l border-zinc-800 bg-zinc-950 flex flex-col p-6 space-y-8 sticky top-0 h-screen">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="font-bold text-sm tracking-tight">Vault Preview: Senior_Lead_Engineer_2024.pdf</h3>
          </div>
          <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview Skeleton */}
        <div className="flex-1 rounded-[2rem] bg-zinc-900/50 border border-zinc-800 p-12 space-y-12">
          <div className="space-y-8 flex flex-col items-center">
            <div className="w-32 h-4 bg-zinc-800 rounded-full" />
            <div className="w-full space-y-4">
              <div className="h-4 bg-zinc-800/50 rounded-full w-3/4 mx-auto" />
              <div className="h-4 bg-zinc-800/50 rounded-full w-1/2 mx-auto" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-3 bg-zinc-800/30 rounded-full w-full" />
            <div className="h-3 bg-zinc-800/30 rounded-full w-full" />
            <div className="h-3 bg-zinc-800/30 rounded-full w-5/6" />
            <div className="h-3 bg-zinc-800/30 rounded-full w-4/5" />
          </div>
          <div className="space-y-6 pt-12">
            <div className="w-24 h-4 bg-zinc-800/50 rounded-full" />
            <div className="space-y-4">
              <div className="h-3 bg-zinc-800/30 rounded-full w-full" />
              <div className="h-3 bg-zinc-800/30 rounded-full w-full" />
              <div className="h-3 bg-zinc-800/30 rounded-full w-2/3" />
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-8 opacity-50">
            <div className="w-12 h-6 bg-zinc-800 rounded-lg" />
            <div className="w-16 h-6 bg-zinc-800 rounded-lg" />
            <div className="w-20 h-6 bg-zinc-800 rounded-lg" />
            <div className="w-14 h-6 bg-zinc-800 rounded-lg" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button className="flex-1 py-4 bg-primary text-black font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs shadow-[0_0_30px_-5px_rgba(0,242,156,0.3)]">
            Generate Optimization
          </button>
          <button className="px-6 py-4 bg-zinc-900 border border-zinc-800 font-bold rounded-2xl hover:bg-zinc-800 transition-all uppercase tracking-widest text-xs">
            Edit Master
          </button>
        </div>
      </div>
    </div>
  );
}
