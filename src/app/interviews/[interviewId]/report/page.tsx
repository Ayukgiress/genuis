'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { interviewApi } from '@/lib/api';
import { calculateInterviewMetrics, getInterviewQuestions, getWeakAreas, isInterviewSetupMessage, loadInterviewReport, scoreInterview } from '@/lib/interview-report';

const formatTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function InterviewReportPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const interviewId = Number(params.interviewId);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['interviews', interviewId, 'report'],
    queryFn: async () => {
      const [interview, messages] = await Promise.all([
        interviewApi.get(interviewId),
        interviewApi.getMessages(interviewId),
      ]);
      return { interview, messages };
    },
    enabled: Number.isSafeInteger(interviewId) && interviewId > 0,
  });

  const reportKey = `genuis:interview-report:${interviewId}`;
  const subscribeToReport = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== reportKey) return;
      onStoreChange();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('genuis:interview-report-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('genuis:interview-report-updated', handleStorage);
    };
  }, [reportKey]);
  const getReportSnapshot = useCallback(() => window.localStorage.getItem(reportKey), [reportKey]);
  const reportSnapshot = useSyncExternalStore(subscribeToReport, getReportSnapshot, () => null);
  const savedReport = useMemo(() => {
    if (!reportSnapshot) return null;
    try {
      const report = JSON.parse(reportSnapshot) as ReturnType<typeof loadInterviewReport>;
      return report?.interviewId === interviewId ? report : null;
    } catch {
      return null;
    }
  }, [interviewId, reportSnapshot]);
  const questions = useMemo(() => getInterviewQuestions(data?.messages ?? []), [data?.messages]);
  const overallScore = savedReport?.metrics.overallScore ?? scoreInterview(data?.messages ?? []);
  const weakAreas = savedReport?.weakAreas ?? getWeakAreas(data?.messages ?? []);
  const durationSeconds = savedReport?.metrics.durationSeconds ?? Math.max(0, Math.round((Date.parse(data?.interview.updated_at || '') - Date.parse(data?.interview.created_at || '')) / 1000));
  const fallbackMetrics = useMemo(() => calculateInterviewMetrics(data?.messages ?? [], durationSeconds), [data?.messages, durationSeconds]);
  const metrics = savedReport?.metrics ?? fallbackMetrics;
  const interviewType = savedReport?.interviewType ?? 'general';
  const scoreColor = overallScore >= 80 ? 'text-primary' : overallScore >= 60 ? 'text-amber-300' : 'text-rose-300';

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">Preparing your interview report…</div>;
  if (error || !data) return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-white">Report unavailable</h1>
      <p className="mt-2 text-sm text-zinc-400">We couldn’t load this interview transcript.</p>
      <button onClick={() => router.push('/interviews')} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black">Back to interviews</button>
    </main>
  );

  const practiceAgain = (focus: string) => {
    const query = new URLSearchParams({ action: 'new', jobId: data.interview.job_id, type: interviewType, focus });
    router.push(`/interviews?${query.toString()}`);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/interviews" className="text-xs font-semibold text-primary hover:underline">← All interviews</Link>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Session report · #{data.interview.id}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Your practice, reviewed</h1>
          <p className="mt-2 text-sm text-zinc-400">{new Date(data.interview.created_at).toLocaleDateString([], { dateStyle: 'long' })} · {interviewType} interview</p>
        </div>
        <button onClick={() => practiceAgain(weakAreas[0]?.label ?? 'overall answer quality')} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:brightness-95">Practice a weak area again ↗</button>
      </div>

      <section className="grid gap-4 md:grid-cols-[1.05fr_2fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Overall practice score</p>
          <div className="mt-6 flex items-center gap-5">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#00f29c ${overallScore * 3.6}deg, #27272a 0deg)` }}>
              <div className="grid h-26 w-26 place-items-center rounded-full bg-zinc-950"><span className={`text-4xl font-black ${scoreColor}`}>{overallScore}<span className="text-base">%</span></span></div>
            </div>
            <div><p className="text-sm font-bold text-white">{overallScore >= 80 ? 'Strong session' : overallScore >= 60 ? 'Good foundation' : 'Room to grow'}</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">A practice estimate based on answer structure and detail—not a hiring assessment.</p></div>
          </div>
          <div className="mt-7 space-y-3">
            {['Relevance', 'Structure', 'Specific evidence', 'Concision'].map((label) => {
              const related = questions.flatMap((item) => item.rubric).filter((item) => item.label === label);
              const score = related.length ? Math.round(related.reduce((sum, item) => sum + item.score, 0) / related.length) : 0;
              return <div key={label}>
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-zinc-300">{label}</span><span className="font-mono text-zinc-500">{score}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div>
              </div>;
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Speaking & presence metrics</p><p className="mt-1 text-xs text-zinc-600">Calculated in your browser; the report stores numbers only.</p></div>
            {(metrics.eyeContactPercent !== undefined || metrics.postureScore !== undefined) && <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">Optional video feedback enabled</span>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Metric label="Words / min · est." value={metrics.wordsPerMinute} />
            <Metric label="Filler words" value={metrics.fillerWords} />
            <Metric label="Estimated pauses" value={metrics.pauses} />
            <Metric label="Duration" value={`${Math.floor(metrics.durationSeconds / 60)}m ${metrics.durationSeconds % 60}s`} />
            {metrics.eyeContactPercent !== undefined && <Metric label="Eye-contact estimate" value={`${metrics.eyeContactPercent}%`} />}
            {metrics.postureScore !== undefined && <Metric label="Posture estimate" value={`${metrics.postureScore}/100`} />}
          </div>
          <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">Speaking pace and pauses are estimates based on message timing and session length. Eye-contact and posture are approximate signals, not judgments. Webcam frames are processed locally and never stored or uploaded.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Focus next</p><h2 className="mt-1 text-lg font-bold text-white">Weak areas</h2></div><span className="text-xs text-zinc-600">{weakAreas.length} areas</span></div>
          <div className="mt-5 space-y-3">
            {weakAreas.length ? weakAreas.slice(0, 4).map((area) => <div key={area.label} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 p-3"><div><p className="text-sm font-semibold text-white">{area.label}</p><p className="mt-0.5 text-[11px] text-zinc-500">Session estimate: {area.score}%</p></div><button onClick={() => practiceAgain(area.label)} className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary hover:bg-primary/15">Practice again</button></div>) : <p className="text-sm text-zinc-500">Answer a few questions to see tailored practice areas.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Transcript timeline</p><h2 className="mt-1 text-lg font-bold text-white">Conversation</h2></div><span className="text-xs text-zinc-600">{data.messages.length} messages</span></div>
          <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {data.messages.filter((message) => !isInterviewSetupMessage(message)).map((message, index, visibleMessages) => <div key={`${message.id}-${index}`} className="relative pl-7">
              <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${message.role === 'assistant' ? 'bg-primary' : 'bg-amber-400'}`} />
              {index < visibleMessages.length - 1 && <span className="absolute bottom-[-14px] left-[4px] top-5 w-px bg-zinc-800" />}
              <div className="flex items-center gap-2"><span className={`text-[10px] font-bold uppercase tracking-widest ${message.role === 'assistant' ? 'text-primary' : 'text-amber-300'}`}>{message.role === 'assistant' ? 'Interviewer' : 'You'}</span><time className="text-[10px] text-zinc-600">{formatTime(message.created_at)}</time></div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{message.transcript?.trim() || message.content}</p>
            </div>)}
            {!data.messages.length && <p className="text-sm text-zinc-500">No transcript was saved for this session.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Answer by answer</p><h2 className="mt-1 text-xl font-bold text-white">Question breakdown</h2></div><p className="text-xs text-zinc-600">Open an answer to see its rubric.</p></div>
        <div className="mt-5 space-y-3">
          {questions.map((item, index) => <article key={item.question.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/20">
            <button type="button" aria-expanded={expandedQuestion === index} onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)} className="flex w-full items-center justify-between gap-4 p-4 text-left"><span className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300">{index + 1}</span><span className="truncate text-sm font-semibold text-white">{item.question.content}</span></span><span className="shrink-0 font-mono text-sm text-primary">{item.score}%</span></button>
            {expandedQuestion === index && <div className="grid gap-4 border-t border-zinc-800 p-4 lg:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{item.answer.transcript?.trim() || item.answer.content || 'No answer transcript available.'}</p><button onClick={() => practiceAgain(item.weakArea)} className="mt-4 text-xs font-bold text-primary hover:underline">Practice {item.weakArea.toLowerCase()} again →</button></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Rubric estimate</p><div className="mt-3 space-y-3">{item.rubric.map((criterion) => <div key={criterion.label}><div className="mb-1 flex justify-between text-xs"><span className="text-zinc-300">{criterion.label}</span><span className="text-zinc-500">{criterion.score}/100</span></div><div className="h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-primary" style={{ width: `${criterion.score}%` }} /></div></div>)}</div></div></div>}
          </article>)}
          {!questions.length && <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">There are no complete question-and-answer pairs to score yet.</p>}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>;
}
