'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { resumeApi } from '@/lib/api';
import type { Job, Resume } from '@/types';

interface TailorResumeModalProps {
  isOpen: boolean;
  job: Job | null;
  resume: Resume | null;
  onClose: () => void;
  onSaved: (resume: Resume) => void;
}

function tailorContent(content: string, skills: string[]) {
  const terms = skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean);
  return content.split(/(\n\s*\n)/).map((block) => {
    if (!block.trim()) return block;
    const lines = block.split('\n');
    if (lines.length < 2) return block;
    const [heading, ...body] = lines;
    const bullets = body.map((line, index) => ({
      line,
      index,
      score: terms.reduce((score, term) => score + (line.toLowerCase().includes(term) ? 1 : 0), 0),
    }));
    if (!bullets.some((item) => item.score > 0)) return block;
    bullets.sort((a, b) => b.score - a.score || a.index - b.index);
    return [heading, ...bullets.map((item) => item.line)].join('\n');
  }).join('');
}

export function TailorResumeModal({ isOpen, job, resume, onClose, onSaved }: TailorResumeModalProps) {
  const [original, setOriginal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !resume) return;
    let cancelled = false;
    setError(null);
    setSaved(false);
    setIsLoading(true);
    resumeApi.get(resume.id).then((fullResume) => {
      if (!cancelled) setOriginal(fullResume.content || '');
    }).catch(() => {
      if (!cancelled) setError('Could not load the resume content. Please try again.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, resume]);

  const verifiedSkills = useMemo(() => {
    if (!job || !original) return [];
    const source = original.toLowerCase();
    const requestedSkills = [
      ...(job.matched_skills || []),
      ...(Array.isArray(job.requirements) ? job.requirements : [job.requirements || '']),
    ];
    return [...new Set(requestedSkills.map((value) => value.trim()).filter((value) => value.length > 1 && source.includes(value.toLowerCase())))].slice(0, 8);
  }, [job, original]);
  const tailored = useMemo(() => tailorContent(original, verifiedSkills), [original, verifiedSkills]);
  const originalLines = original.split('\n');
  const tailoredLines = tailored.split('\n');
  const movedLines = (lines: string[]) => lines.map((line, index) => {
    const otherIndex = (lines === originalLines ? tailoredLines : originalLines).indexOf(line);
    return otherIndex !== index;
  });
  const originalMoved = movedLines(originalLines);
  const tailoredMoved = movedLines(tailoredLines);

  const handleSave = async () => {
    if (!job || !resume || !tailored.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await resumeApi.create({
        file_name: `${resume.file_name.replace(/\.[^.]+$/, '')} - ${job.company} tailored.txt`,
        content: tailored,
      });
      onSaved(created);
      setSaved(true);
    } catch {
      setError('Could not save the tailored copy. Your original resume is unchanged.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="tailor-resume-title">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Resume tailoring · {job.company}</p>
            <h2 id="tailor-resume-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">Compare your role-focused draft</h2>
            <p className="mt-1 text-sm text-zinc-500">{job.title} · Only existing resume lines are reordered. No new qualifications are added.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white" aria-label="Close resume tailoring">Close</button>
        </header>

        {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-7">{error}</p>}
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 lg:grid-cols-2 sm:p-7">
          {[{ title: 'Original resume', content: original, changed: originalMoved }, { title: 'Tailored draft', content: tailored, changed: tailoredMoved }].map((panel) => (
            <section key={panel.title} className="flex min-h-75 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3"><h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">{panel.title}</h3><span className="text-[10px] text-zinc-600">{panel.content.split('\n').length} lines</span></div>
              <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-6">
                {isLoading ? <p className="p-3 text-zinc-500">Loading resume…</p> : panel.content ? panel.content.split('\n').map((line, index) => (
                  <div key={`${index}-${line}`} className={`flex min-h-6 gap-3 rounded px-2 ${panel.changed[index] ? panel.title === 'Tailored draft' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-100' : 'text-zinc-400'}`}>
                    <span className="w-7 shrink-0 select-none text-right text-zinc-700">{index + 1}</span><span className="whitespace-pre-wrap wrap-break-word">{line || ' '}</span>
                  </div>
                )) : <p className="p-3 text-zinc-500">This resume has no readable text content.</p>}
              </div>
            </section>
          ))}
        </div>
        <footer className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="max-w-2xl text-xs leading-relaxed text-zinc-500">{verifiedSkills.length ? `Role keywords already present: ${verifiedSkills.join(', ')}.` : 'No matching job keywords were found in this resume. The draft remains unchanged.'} Review every change before using this copy.</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900">Cancel</button>
            <button type="button" onClick={() => void handleSave()} disabled={isLoading || isSaving || !original.trim() || saved} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">{saved ? 'Saved as new resume' : isSaving ? 'Saving copy…' : 'Save tailored copy'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
