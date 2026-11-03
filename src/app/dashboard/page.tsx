'use client';

import React, { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from 'recharts';
import { getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useApplicationStore } from '@/store/applicationStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { createOrReuseInterview, interviewKeys, normalizeInterviewJobId } from '@/hooks/useInterviewsData';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { loadInterviewReport, type InterviewReportData } from '@/lib/interview-report';
import { UsageMeter } from '@/components/usage/UsageMeter';

const COLORS = ['#00f29c', '#6366f1', '#f59e0b', '#ef4444'];
// used by recharts gradient stops above
void COLORS;
const subscribeToNothing = () => () => {};
const getClientMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;
const WEEKLY_GOAL_KEY = 'genuis:weekly-action-goal';
const subscribeToWeeklyGoal = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('genuis:weekly-goal-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('genuis:weekly-goal-updated', callback);
  };
};
const getWeeklyGoalSnapshot = () => window.localStorage.getItem(WEEKLY_GOAL_KEY) ?? '5';
const getWeeklyGoalServerSnapshot = () => '5';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const { applications } = useApplicationStore();
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
  const [interviewPage, setInterviewPage] = useState(0);
  const [creatingJobId, setCreatingJobId] = useState<string | null>(null);
  const [interviewReports, setInterviewReports] = useState<InterviewReportData[]>([]);
  const interviewsPerPage = 3;

  const queryEnabled = !authLoading && isAuthenticated && !!getAuthToken();

  const {
    analyses,
    analyticsSummary,
    interviewMap: remoteInterviewMap,
    interviews,
    appliedJobs,
    isLoading,
    isInterviewDataReady,
    error,
  } = useDashboardData(queryEnabled);

  const interviewMap = remoteInterviewMap;
  const weeklyGoalSnapshot = useSyncExternalStore(subscribeToWeeklyGoal, getWeeklyGoalSnapshot, getWeeklyGoalServerSnapshot);
  const weeklyGoal = Math.min(20, Math.max(1, Number.parseInt(weeklyGoalSnapshot, 10) || 5));

  useEffect(() => {
    if (!mounted) return;
    setInterviewReports(interviews
      .filter((interview) => interview.status === 'completed')
      .map((interview) => loadInterviewReport(interview.id))
      .filter((report): report is InterviewReportData => report !== null));
  }, [interviews, mounted]);

  // Auth redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) { router.push('/login'); return; }
  }, [authLoading, isAuthenticated, router]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getMatchColor = (score?: number) => {
    if (!score) return 'text-zinc-500';
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getMatchBg = (score?: number) => {
    if (!score) return 'bg-zinc-800';
    if (score >= 80) return 'bg-primary/20 border-primary/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalAnalyses = analyses.length;
  const completedAnalyses = analyses.filter(a => a.status === 'completed').length;
  const averageScore = analyses.length > 0 
    ? Math.round(
        analyses
          .filter(a => a.result?.score)
          .reduce((sum, a) => sum + (a.result?.score || 0), 0) / 
        analyses.filter(a => a.result?.score).length || 0
      )
    : 0;

  const stats = [
    { 
      label: 'Total Resumes', 
      value: totalAnalyses.toString(), 
      change: totalAnalyses > 0 ? '+1' : '0%', 
      trend: 'up' as const,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    { 
      label: 'Analyzed', 
      value: completedAnalyses.toString(), 
      change: completedAnalyses > 0 ? '+100%' : '0%', 
      trend: 'up' as const,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    { 
      label: 'Avg Score', 
      value: `${averageScore}%`, 
      change: averageScore >= 70 ? '+5%' : '-2%', 
      trend: averageScore >= 70 ? 'up' as const : 'down' as const,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    },
    { 
      label: 'Events', 
      value: analyticsSummary?.total_events?.toString() || '0', 
      change: '+12%', 
      trend: 'up' as const,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    },
  ];

  const chartData = useMemo(() => {
    // Generate last 7 days
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        name: dayNames[d.getDay()],
        fullDate: d.toISOString().split('T')[0],
        resumes: 0,
        jobs: 0,
        interviews: 0
      });
    }

    // Group resume analyses by date
    const resumeCounts = analyses.reduce((acc, analysis) => {
      if (analysis.created_at) {
        const date = analysis.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Group jobs applied by date (from application store)
    const jobCounts = applications.reduce((acc, app) => {
      if (app.appliedAt) {
        const date = new Date(app.appliedAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Group interviews by date
    const interviewCounts = Array.from(interviewMap.values()).reduce((acc, interview) => {
      if (interview.created_at) {
        const date = interview.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return days.map(day => ({
      name: day.name,
      resumes: resumeCounts[day.fullDate] || 0,
      jobs: jobCounts[day.fullDate] || 0,
      interviews: interviewCounts[day.fullDate] || 0
    }));
  }, [analyses, applications, interviewMap]);

  const scoreTrendData = useMemo(() => {
    const byDate = new Map<string, { behavioral?: number[]; technical?: number[]; general?: number[] }>();
    for (const report of interviewReports) {
      const interview = interviews.find((item) => item.id === report.interviewId);
      if (!interview?.created_at) continue;
      const date = new Date(interview.created_at).toISOString().slice(0, 10);
      const row = byDate.get(date) ?? {};
      const scores = row[report.interviewType] ?? [];
      scores.push(report.metrics.overallScore);
      row[report.interviewType] = scores;
      byDate.set(date, row);
    }
    const average = (scores?: number[]) => scores?.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null;
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({
      date: new Date(`${date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      behavioral: average(row.behavioral),
      technical: average(row.technical),
      general: average(row.general),
    }));
  }, [interviewReports, interviews]);

  const applicationFunnel = useMemo(() => {
    const applied = applications.filter((application) => application.status !== 'wishlist' && application.status !== 'rejected').length;
    const applicationJobIds = new Set(applications.map((application) => application.jobId));
    const interviewedIds = new Set(interviews
      .filter((interview) => applicationJobIds.has(String(interview.job_id)))
      .map((interview) => String(interview.job_id)));
    const interviewCount = Math.min(applied, Math.max(interviewedIds.size, applications.filter((application) => application.status === 'interview' || application.status === 'offer').length));
    const offerCount = Math.min(interviewCount, applications.filter((application) => application.status === 'offer').length);
    const rate = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;
    return {
      stages: [
        { name: 'Applied', value: applied, fill: '#00f29c' },
        { name: 'Interview', value: interviewCount, fill: '#818cf8' },
        { name: 'Offer', value: offerCount, fill: '#fbbf24' },
      ],
      conversions: [
        { stage: 'Applied → interview', rate: rate(interviewCount, applied) },
        { stage: 'Interview → offer', rate: rate(offerCount, interviewCount) },
      ],
    };
  }, [applications, interviews]);

  const weakPracticeItems = useMemo(() => interviewReports
    .flatMap((report) => report.weakAreas.slice(0, 2).map((area) => ({ ...area, report })))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3), [interviewReports]);

  const activitySummary = useMemo(() => {
    const activityDates: string[] = [];
    analyses.filter((analysis) => analysis.status === 'completed').forEach((analysis) => {
      if (analysis.created_at) activityDates.push(dateKey(new Date(analysis.created_at)));
    });
    applications.forEach((application) => {
      if (application.appliedAt) activityDates.push(dateKey(new Date(application.appliedAt)));
    });
    interviews.filter((interview) => interview.status === 'completed').forEach((interview) => {
      const completedAt = interview.updated_at || interview.created_at;
      if (completedAt) activityDates.push(dateKey(new Date(completedAt)));
    });
    const uniqueDays = new Set(activityDates);
    const today = new Date();
    const todayKey = dateKey(today);
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const mondayOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    const actionsThisWeek = activityDates.filter((day) => day >= dateKey(weekStart) && day <= todayKey).length;
    const cursor = new Date(today);
    if (!uniqueDays.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (uniqueDays.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { actionsThisWeek, streak, progress: Math.min(100, Math.round((actionsThisWeek / weeklyGoal) * 100)) };
  }, [analyses, applications, interviews, weeklyGoal]);

  const setWeeklyGoal = (goal: number) => {
    const safeGoal = Math.min(20, Math.max(1, goal));
    window.localStorage.setItem(WEEKLY_GOAL_KEY, String(safeGoal));
    window.dispatchEvent(new Event('genuis:weekly-goal-updated'));
  };

  const startTodayInterview = async () => {
    const job = appliedJobs[0];
    if (!job) {
      router.push('/interviews?action=new');
      return;
    }
    const requestedJobId = normalizeInterviewJobId(job.id);
    if (!requestedJobId || creatingJobId) return;
    setCreatingJobId(requestedJobId);
    try {
      const interview = await createOrReuseInterview(queryClient, requestedJobId);
      if (normalizeInterviewJobId(interview.job_id) !== requestedJobId) throw new Error('The saved interview does not match the selected role.');
      router.push(`/interviews?id=${interview.id}`);
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Could not start interview practice.', { toastId: 'today-interview-error' });
    } finally {
      setCreatingJobId(null);
    }
  };

  const followUpHref = (() => {
    const params = new URLSearchParams({ type: 'follow_up_letter' });
    if (appliedJobs[0]?.id) params.set('jobId', appliedJobs[0].id);
    return `/letters?${params.toString()}`;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Your career workspace</p>
        <h1 className="text-3xl font-bold tracking-tight">Today</h1>
        <p className="text-zinc-500 text-sm">A short list of high-impact moves to keep your search moving.</p>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Some dashboard data is unavailable.</p>
          <section className="grid gap-6 rounded-3xl border border-zinc-800/70 bg-zinc-900/40 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)] sm:p-8" aria-labelledby="interview-trends-title">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Interview practice</p><h2 id="interview-trends-title" className="mt-1 text-lg font-bold text-white">Score trends by interview type</h2></div>
                <span className="text-xs text-zinc-500">Completed sessions · local report data</span>
              </div>
              <div className="mt-5 h-64 w-full">
                {mounted && scoreTrendData.length ? <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrendData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} formatter={(value) => [`${Math.round(Number(value))}%`, 'Score']} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="behavioral" name="Behavioral" stroke="#00f29c" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="technical" name="Technical" stroke="#818cf8" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="general" name="General" stroke="#fbbf24" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-center"><p className="text-sm font-semibold text-zinc-300">Your score trend starts with a completed report</p><p className="mt-1 text-xs text-zinc-600">Complete a practice session to see scores by interview type.</p><button onClick={() => router.push('/interviews?action=new')} className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black">Start practice</button></div>}
              </div>
            </div>
            <div className="border-t border-zinc-800 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Keep improving</p>
              <h3 className="mt-1 text-base font-bold text-white">Practice a weak area</h3>
              <div className="mt-4 space-y-3">
                {weakPracticeItems.length ? weakPracticeItems.map(({ label, score, report }) => <div key={`${report.interviewId}-${label}`} className="rounded-xl border border-zinc-800 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-zinc-200">{label}</p><span className="text-xs font-mono text-amber-300">{score}%</span></div><button onClick={() => { const params = new URLSearchParams({ action: 'new', jobId: report.jobId, type: report.interviewType, focus: label }); router.push(`/interviews?${params.toString()}`); }} className="mt-2 text-[11px] font-bold text-primary hover:underline">Practice again →</button></div>) : <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-xs leading-relaxed text-zinc-500">Complete an interview and save its report to get focused practice suggestions here.</p>}
              </div>
            </div>
          </section>

          </div>
          <button
            onClick={() => void Promise.all([
              queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
              queryClient.invalidateQueries({ queryKey: interviewKeys.list }),
              queryClient.invalidateQueries({ queryKey: interviewKeys.boards }),
            ])}
            className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-400/20"
          >
            Retry loading
          </button>
        </div>
      )}

      <section aria-labelledby="prep-journey-title" className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/8 via-zinc-900/70 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Your next steps</p>
            <h2 id="prep-journey-title" className="mt-2 text-xl font-bold text-white">Turn an application into interview confidence</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">Prepare for a role, practice with the AI interviewer, then review your session and keep improving.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-200"><span className="mr-2 text-primary">01</span>Choose a role</span>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-primary"><span className="mr-2">02</span>Practice</span>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-zinc-200"><span className="mr-2 text-zinc-500">03</span>Review</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="today-actions-title" className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,0.9fr)]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Next actions</p><h2 id="today-actions-title" className="mt-1 text-xl font-bold text-white">Make today count</h2></div><span className="text-xs text-zinc-600">One click to get moving</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <TodayAction icon="✦" title="Start mock interview" description={appliedJobs[0] ? `Practice for ${appliedJobs[0].title}` : 'Choose a role and rehearse out loud'} actionLabel={creatingJobId ? 'Opening…' : 'Start practice'} onClick={() => void startTodayInterview()} disabled={creatingJobId !== null} />
            <TodayAction icon="↗" title="Draft follow-up" description={appliedJobs[0] ? `Reconnect with ${appliedJobs[0].company}` : 'Write a thoughtful post-interview note'} actionLabel="Draft letter" href={followUpHref} />
            <TodayAction icon="⌁" title="Fix your resume" description="Run a fresh check and focus your next edits" actionLabel="Review resume" href="/resumes?fix=1" />
          </div>
        </div>

        <div className="rounded-3xl border border-primary/15 bg-linear-to-br from-primary/8 to-zinc-950 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Weekly rhythm</p><h2 className="mt-1 text-xl font-bold text-white">Build momentum</h2></div><div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-center"><p className="text-2xl font-black text-primary">{activitySummary.streak}</p><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">day streak</p></div></div>
          <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-zinc-200">{activitySummary.actionsThisWeek} of {weeklyGoal} actions this week</p><label className="flex items-center gap-2 text-[10px] text-zinc-500">Goal <select aria-label="Weekly action goal" value={weeklyGoal} onChange={(event) => setWeeklyGoal(Number(event.target.value))} className="rounded-lg border border-zinc-700 bg-black px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-primary/50">{[3, 5, 7, 10, 14].map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select></label></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${activitySummary.progress}%` }} /></div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">Progress counts completed practice, resume analyses, and applications logged this week.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-primary/20 transition-colors">
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${stat.trend === 'up' ? 'text-primary' : 'text-red-500'}`}>
                {stat.change}
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                  {stat.trend === 'up' ? (
                    <polyline points="18 15 12 9 6 15" />
                  ) : (
                    <polyline points="6 9 12 15 18 9" />
                  )}
                </svg>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <UsageMeter analyses={analyses} user={user} />

      <section aria-labelledby="conversion-title" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Pipeline health</p><h2 id="conversion-title" className="mt-1 text-lg font-bold text-white">Application funnel</h2></div>
            <span className="text-xs text-zinc-600">From your saved applications</span>
          </div>
          <div className="mt-4 h-64">
            {mounted && applicationFunnel.stages[0].value > 0 ? <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                <Funnel dataKey="value" data={applicationFunnel.stages} isAnimationActive>
                  <LabelList position="right" fill="#d4d4d8" stroke="none" dataKey="name" fontSize={11} />
                  {applicationFunnel.stages.map((stage) => <Cell key={stage.name} fill={stage.fill} />)}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-center"><p className="text-sm font-semibold text-zinc-300">Your funnel starts with an application</p><p className="mt-1 text-xs text-zinc-600">Log applications to track progress from applied to offer.</p><Link href="/jobs" className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black">Explore jobs</Link></div>}
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Stage conversion</p><h2 className="mt-1 text-lg font-bold text-white">Where momentum builds</h2></div><span className="text-xs text-zinc-600">Conversion rate</span></div>
          <div className="mt-5 h-56">
            {mounted ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applicationFunnel.conversions} layout="vertical" margin={{ top: 8, right: 22, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="stage" width={142} axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} formatter={(value) => [`${Number(value)}%`, 'Conversion']} />
                <Bar dataKey="rate" fill="#00f29c" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer> : <div className="h-full" />}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">Rates use locally saved applications and interview sessions. Offers are capped to recorded interviews for a consistent funnel.</p>
        </div>
      </section>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Weekly Progress</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
              Last 7 Days
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <div className="h-62.5 w-full">
            {mounted ? (
               <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorResumes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f29c" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00f29c" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                    cursor={{ stroke: '#00f29c', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="resumes"
                    stackId="1"
                    stroke="#00f29c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResumes)"
                    animationDuration={1500}
                    name="Resumes Analyzed"
                  />
                  <Area
                    type="monotone"
                    dataKey="jobs"
                    stackId="1"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorJobs)"
                    animationDuration={1500}
                    name="Jobs Applied"
                  />
                  <Area
                    type="monotone"
                    dataKey="interviews"
                    stackId="1"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInterviews)"
                    animationDuration={1500}
                    name="Interview Sessions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">AI Interview Coach</h3>
                <p className="text-xs text-zinc-500">Practice behavioral questions for your applications</p>
              </div>
            </div>
          </div>

          {appliedJobs.length > 0 ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Applied jobs ready for interview prep ({appliedJobs.length})</p>
              <div className="grid gap-3 flex-1">
                {appliedJobs.slice(interviewPage * interviewsPerPage, (interviewPage + 1) * interviewsPerPage).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{job.title}</p>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-tighter">
                            Interview Alert
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{job.company}</p>
                      </div>
                    </div>
                    <button
                      disabled={!isInterviewDataReady || creatingJobId !== null}
                      onClick={async () => {
                        const requestedJobId = normalizeInterviewJobId(job.id);
                        if (!requestedJobId || creatingJobId) return;
                        setCreatingJobId(requestedJobId);
                        try {
                          const interview = await createOrReuseInterview(queryClient, requestedJobId);
                          if (normalizeInterviewJobId(interview.job_id) !== requestedJobId) {
                            throw new Error('The saved interview does not match this job.');
                          }
                          router.push(`/interviews?id=${interview.id}`);
                        } catch (createError) {
                          const message = createError instanceof Error
                            ? createError.message
                            : 'Could not start interview prep. Please try again.';
                          toast.error(message, { toastId: 'dashboard-interview-prep-error' });
                        } finally {
                          setCreatingJobId(null);
                        }
                      }}
                      className="px-4 py-2 bg-primary text-black font-bold text-[10px] rounded-lg hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingJobId === normalizeInterviewJobId(job.id)
                        ? 'Opening…'
                        : isInterviewDataReady ? 'Start Prep' : 'Retry data above'}
                    </button>
                  </div>
                ))}
              </div>
              {appliedJobs.length > interviewsPerPage && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                  <button
                    onClick={() => setInterviewPage(Math.max(0, interviewPage - 1))}
                    disabled={interviewPage === 0}
                    className="px-3 py-1.5 text-[10px] font-bold bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] text-zinc-500">
                    Page {interviewPage + 1} of {Math.ceil(appliedJobs.length / interviewsPerPage)}
                  </span>
                  <button
                    onClick={() => setInterviewPage(Math.min(Math.ceil(appliedJobs.length / interviewsPerPage) - 1, interviewPage + 1))}
                    disabled={interviewPage >= Math.ceil(appliedJobs.length / interviewsPerPage) - 1}
                    className="px-3 py-1.5 text-[10px] font-bold bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
              <div className="pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => router.push('/interviews?action=new')}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 text-white font-bold rounded-lg hover:bg-zinc-700 transition-all text-[10px]"
                >
                  + New Interview Session
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 inline-flex mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-zinc-200 text-sm font-semibold">No applied jobs yet</p>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto">Save a role you&apos;ve applied to and it will appear here, ready for a tailored practice session.</p>
              <Link href="/jobs" className="inline-block mt-4 px-4 py-2 bg-zinc-800 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-700 transition-all">
                Find Jobs to Apply
              </Link>
            </div>
          )}
        </div>
        </div>
    </div>
  );
}

function TodayAction({ icon, title, description, actionLabel, onClick, href, disabled = false }: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const content = <>
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-lg text-primary">{icon}</span>
    <span className="mt-4 block text-sm font-bold text-white">{title}</span>
    <span className="mt-1 block min-h-10 text-xs leading-relaxed text-zinc-500">{description}</span>
    <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-primary">{actionLabel} <span aria-hidden="true">→</span></span>
  </>;
  const className = `rounded-2xl border border-zinc-800 bg-black/25 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 ${disabled ? 'cursor-wait opacity-70' : ''}`;
  return href ? <Link href={href} className={className}>{content}</Link> : <button type="button" onClick={onClick} disabled={disabled} className={`w-full ${className}`}>{content}</button>;
}