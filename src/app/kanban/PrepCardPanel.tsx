'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { interviewApi, jobApi, letterApi } from '@/lib/api';
import { loadInterviewReport } from '@/lib/interview-report';
import type { Interview, Job, KanbanCard, Letter } from '@/types';
import type { InterviewReportData } from '@/lib/interview-report';

type PrepSection = 'research' | 'interview' | 'letters' | 'reports';
const tabs: { id: PrepSection; label: string }[] = [
  { id: 'research', label: 'Research brief' },
  { id: 'interview', label: 'Mock interview' },
  { id: 'letters', label: 'Letters' },
  { id: 'reports', label: 'Report history' },
];

export function PrepCardPanel({ card, onClose }: { card: KanbanCard; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<PrepSection>('research');
  const [job, setJob] = useState<Job | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [reports, setReports] = useState<InterviewReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      jobApi.search({ query: card.title, limit: 25 }),
      letterApi.list(),
      interviewApi.list(),
    ]).then(([jobsResult, lettersResult, interviewsResult]) => {
      if (cancelled) return;
      if (jobsResult.status === 'fulfilled') {
        const normalizedTitle = card.title.trim().toLowerCase();
        const normalizedCompany = (card.company || '').trim().toLowerCase();
        const match = jobsResult.value.find((candidate) =>
          candidate.title.trim().toLowerCase() === normalizedTitle &&
          (!normalizedCompany || candidate.company.trim().toLowerCase() === normalizedCompany)
        ) || null;
        setJob(match);
      }
      if (lettersResult.status === 'fulfilled') setLetters(lettersResult.value);
      if (interviewsResult.status === 'fulfilled') {
        const relevant = interviewsResult.value;
        setInterviews(relevant);
        setReports(relevant.map((interview) => loadInterviewReport(interview.id)).filter((report): report is InterviewReportData => report !== null));
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [card.id, card.title, card.company]);

  const relevantLetters = useMemo(() => letters.filter((letter) => {
    const search = `${letter.title} ${letter.recipient}`.toLowerCase();
    return search.includes(card.company?.toLowerCase() || card.title.toLowerCase()) || search.includes(card.title.toLowerCase());
  }), [letters, card.company, card.title]);
  const jobReports = useMemo(() => reports.filter((report) => job && report.jobId === job.id), [reports, job]);
  const reportInterviews = useMemo(() => interviews.filter((interview) => job && String(interview.job_id) === job.id), [interviews, job]);
  const interviewHref = job ? `/interviews?action=new&jobId=${encodeURIComponent(job.id)}` : '/interviews?action=new';
  const letterHref = `/letters?compose=1&jobTitle=${encodeURIComponent(card.title)}&company=${encodeURIComponent(card.company || '')}`;

  return (
    <div className="fixed inset-0 z-60 flex justify-end bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prep-panel-title">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close application preparation" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        <header className="border-b border-zinc-800 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Application prep</p><h2 id="prep-panel-title" className="mt-1 truncate text-xl font-bold text-white">{card.title}</h2><p className="mt-1 text-sm text-zinc-500">{card.company || 'Company not specified'} · {card.location || 'Location not specified'}</p></div>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white">Close</button>
          </div>
          <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-black/40 p-1" aria-label="Preparation sections">
            {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeTab === tab.id ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>{tab.label}</button>)}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeTab === 'research' && <section className="space-y-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Role snapshot</p><h3 className="mt-2 text-lg font-bold text-white">{job?.title || card.title}</h3><p className="mt-1 text-sm text-zinc-400">{job?.company || card.company || 'Company not specified'}{(job?.location || card.location) ? ` · ${job?.location || card.location}` : ''}</p></div>
            {isLoading ? <div className="rounded-2xl border border-zinc-800 p-5 text-sm text-zinc-500">Building your role brief…</div> : job ? <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"><h4 className="text-sm font-bold text-white">Opportunity brief</h4><p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">{job.description || 'No role description was supplied with this listing.'}</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"><h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Requirements to review</h4><ul className="mt-3 space-y-2 text-sm text-zinc-400">{(Array.isArray(job.requirements) ? job.requirements : [job.requirements]).filter(Boolean).slice(0, 6).map((requirement, index) => <li key={`${index}-${requirement}`} className="flex gap-2"><span className="text-primary">•</span><span>{requirement}</span></li>)}</ul></div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"><h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Before you apply</h4><p className="mt-3 text-sm leading-6 text-zinc-400">Prepare one measurable example for the core responsibilities, note questions about team scope and success measures, and verify compensation and work-mode details with the employer.</p>{job.salary_range && <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-xs text-zinc-300">Listed range: {job.salary_range}</p>}</div>
              </div>
            </> : <div className="rounded-2xl border border-dashed border-zinc-800 p-5"><h4 className="text-sm font-semibold text-zinc-200">Saved role details</h4><p className="mt-2 text-sm leading-6 text-zinc-500">We couldn’t match this application to a live job listing. Use the role, company, location, and notes saved on your card as the source for your research.</p>{card.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-400">{card.description}</p>}</div>}
            <p className="text-[11px] leading-relaxed text-zinc-600">Brief generated from your saved listing and application details; confirm company and role information before relying on it.</p>
          </section>}

          {activeTab === 'interview' && <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Practice plan</p><h3 className="mt-2 text-lg font-bold text-white">Rehearse for this role</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Run a focused mock interview and practice examples that connect your experience to the role’s requirements.</p><ul className="mt-4 space-y-2 text-sm text-zinc-400"><li>• Prepare a concise career introduction.</li><li>• Build two STAR stories using measurable outcomes.</li><li>• Prepare thoughtful questions for the hiring team.</li></ul><Link href={interviewHref} className="mt-6 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-bold text-black hover:brightness-95">Start mock interview <span className="ml-2">→</span></Link>{!job && <p className="mt-3 text-xs text-zinc-600">No linked job listing found, so practice will open without role-specific context.</p>}</section>}

          {activeTab === 'letters' && <section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Correspondence</p><h3 className="mt-1 text-lg font-bold text-white">Letters for this application</h3></div><Link href={letterHref} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black">Draft a letter</Link></div>{isLoading ? <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">Loading letters…</p> : relevantLetters.length ? <div className="space-y-3">{relevantLetters.map((letter) => <Link key={letter.id} href={`/letters/${letter.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-primary/30"><div className="flex items-center justify-between gap-3"><h4 className="truncate text-sm font-semibold text-white">{letter.title}</h4><span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{letter.letter_type.replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-zinc-500">To: {letter.recipient}</p><p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-400">{letter.content}</p></Link>)}</div> : <div className="rounded-xl border border-dashed border-zinc-800 p-5"><p className="text-sm text-zinc-300">No matching letters yet.</p><p className="mt-1 text-xs text-zinc-500">Start a draft with this role and company prefilled.</p></div>}</section>}

          {activeTab === 'reports' && <section className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Practice history</p><h3 className="mt-1 text-lg font-bold text-white">Interview reports</h3></div>{isLoading ? <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">Loading interview history…</p> : jobReports.length ? <div className="space-y-3">{jobReports.map((report) => <Link key={report.interviewId} href={`/interviews/${report.interviewId}/report`} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-primary/30"><div><p className="text-sm font-semibold capitalize text-white">{report.interviewType} interview</p><p className="mt-1 text-xs text-zinc-500">{reportInterviews.find((interview) => interview.id === report.interviewId)?.updated_at ? new Date(reportInterviews.find((interview) => interview.id === report.interviewId)!.updated_at!).toLocaleDateString() : 'Saved report'}</p></div><span className="text-lg font-black text-primary">{report.metrics.overallScore}%</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-zinc-800 p-5"><p className="text-sm text-zinc-300">No reports found for this role yet.</p><p className="mt-1 text-xs leading-5 text-zinc-500">Complete a mock interview and save its report to build a role-specific history.</p>{!job && <p className="mt-2 text-[11px] text-zinc-600">This card is not linked to a live job ID, so session reports cannot be matched automatically.</p>}</div>}</section>}
        </div>
      </aside>
    </div>
  );
}
