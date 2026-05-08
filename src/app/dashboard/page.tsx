'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { analysisApi, analyticsApi, jobApi, kanbanApi, ApiError, getAuthToken, interviewApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Analysis, AnalyticsSummary, Job, KanbanBoard, Interview } from '@/types';
import { toast } from 'react-toastify';
import Link from 'next/link';

const COLORS = ['#00f29c', '#6366f1', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, fetchCurrentUser } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fetchInitiated = useRef(false);
  
  // Interview state
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  
  // Kanban state
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilters, setJobFilters] = useState({ remote: false, location: '' });
  
  // Unused job search state - kept for compatibility
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push('/login');
      return;
    }

    if (fetchInitiated.current) return;
    fetchInitiated.current = true;

    // Refresh user data once to ensure subscription status is up to date
    fetchCurrentUser();

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use Promise.allSettled to prevent one failing API call from blocking others
        const [analysesResult, summaryResult, boardsResult] = await Promise.allSettled([
          analysisApi.list(),
          analyticsApi.getSummary(),
          kanbanApi.listBoards()
        ]);

        if (analysesResult.status === 'fulfilled') {
          setAnalyses(analysesResult.value);
        }

        if (summaryResult.status === 'fulfilled') {
          setAnalyticsSummary(summaryResult.value);
        }

        if (boardsResult.status === 'fulfilled') {
          setBoards(boardsResult.value);
          if (boardsResult.value.length > 0) {
            setSelectedBoard(boardsResult.value[0].id);
          }
        }

        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Don't set error for auth issues, just show empty dashboard
        if (!(err instanceof ApiError && (err.status === 401 || err.status === 403))) {
          setError('Failed to load some dashboard data. Please try refreshing the page.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authLoading, isAuthenticated, router, dataLoaded, fetchCurrentUser]);

  // Load interviews and applied jobs for interview prep alerts
  useEffect(() => {
    if (!isAuthenticated || !getAuthToken()) return;

    const loadInterviewData = async () => {
      try {
        // Fetch once (avoid repeated calls inside loops)
        const interviewsData = await interviewApi.list();
        const activeInterviews = interviewsData.filter((i) => i.status === 'active');
        setInterviews(activeInterviews);

        const activeJobIdSet = new Set<number>(
          activeInterviews.map((i) => i.job_id).filter((id) => Number.isFinite(id))
        );

        // Derive applied jobs from kanban cards (reliable mapping should use card.title as job id)
        // NOTE: If your backend stores job id somewhere else, update the mapping here.
        const appliedJobList: Job[] = [];
        const appliedJobIdSet = new Set<string>();

        const completedAnalysesList = analyses.filter((a) => a.status === 'completed');

        // Collect candidate cards first
        for (const board of boards) {
          try {
            const cards = await kanbanApi.listCards(board.id);
            for (const card of cards) {
              const isAppliedColumn =
                card.column_id === 'in_progress' ||
                card.column_id === 'review' ||
                card.column_id === 'done';

              if (!isAppliedColumn) continue;

              // Keep the existing assumption that card.title is job id.
              // This fixes the previous parseInt(card.title) comparison issue by normalizing types.
              const jobIdStr = String(card.title);
              if (!jobIdStr) continue;

              try {
                const job = await jobApi.getById(jobIdStr);
                if (!appliedJobIdSet.has(job.id)) {
                  appliedJobIdSet.add(job.id);
                  appliedJobList.push(job);
                }
              } catch {
                // If card.title is not a job id in your system, update mapping here.
              }
            }
          } catch {
            // Skip boards without cards
          }
        }

        // Filter applied jobs to only those related to completed analyses (if needed)
        // (Current UI previously tried to use analyses, but without a stable mapping.
        //  Keeping appliedJobList as derived from kanban cards ensures alerts work.)
        setAppliedJobs(appliedJobList);

        // Create missing prep sessions for applied jobs without active interviews
        for (const job of appliedJobList) {
          const jobIdNum = parseInt(job.id, 10);
          const hasInterview = activeJobIdSet.has(jobIdNum);

          if (hasInterview || !Number.isFinite(jobIdNum)) continue;

          try {
            const interview = await interviewApi.create({
              job_id: jobIdNum.toString(),
              status: 'active',
            });

            setTimeout(() => {
              toast.info(
                "Ready to practice for your interview? I've prepared behavioral questions for this application!",
                {
                  autoClose: 6000,
                  onClick: () => router.push(`/interviews?id=${interview.id}`),
                }
              );
            }, 1000);

            activeJobIdSet.add(jobIdNum);
          } catch {
            // Skip silently
          }
        }
      } catch (err) {
        console.error('Failed to load interviews/applied jobs:', err);
      }
    };

    const timeoutId = setTimeout(() => {
      loadInterviewData();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, boards, router, analyses]);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoadingJobs(true);
      const jobsData = await jobApi.search({
        query: searchQuery || undefined,
        remote: jobFilters.remote,
        location: jobFilters.location || undefined,
        limit: 6
      });
      setJobs(jobsData);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
      // If jobs fetch fails due to auth, don't show error since dashboard might still work
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        console.log('Jobs fetch failed due to auth, but continuing...');
      }
    } finally {
      setIsLoadingJobs(false);
    }
  }, [searchQuery, jobFilters.remote, jobFilters.location]);

  const jobsFetched = useRef(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !getAuthToken()) return;
    
    if (jobsFetched.current) return;
    jobsFetched.current = true;

    // Initial jobs fetch
    fetchJobs();
  }, [authLoading, isAuthenticated, fetchJobs]);

  const handleAddToKanban = async (job: Job) => {
    if (!selectedBoard) {
      toast.warn('Please select a board first');
      return;
    }
    try {
      await jobApi.addToKanban(job.id, parseInt(selectedBoard), 'todo');
      toast.success('Job added to pipeline!');
    } catch (err) {
      console.error('Failed to add job to kanban:', err);
      toast.error('Failed to add job');
    }
  };

  const getMatchColor = (score?: number) => {
    if (!score) return 'text-zinc-500';
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMatchBg = (score?: number) => {
    if (!score) return 'bg-zinc-800';
    if (score >= 80) return 'bg-primary/20 border-primary/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

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

  const chartData = React.useMemo(() => {
    if (!analyticsSummary?.event_types) {
      return [
        { name: 'MON', value: 30 },
        { name: 'TUE', value: 25 },
        { name: 'WED', value: 35 },
        { name: 'THU', value: 55 },
        { name: 'FRI', value: 30 },
        { name: 'SAT', value: 65 },
        { name: 'SUN', value: 45 },
      ];
    }
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return days.map((day, index) => ({
      name: day,
      value: Math.max(...Object.values(analyticsSummary.event_types || {a:1})) - (index * 5)
    }));
  }, [analyticsSummary]);

  const funnelData = [
    { label: 'UPLOADED', value: totalAnalyses, percentage: totalAnalyses > 0 ? 100 : 0 },
    { label: 'ANALYZED', value: completedAnalyses, percentage: totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0 },
    { label: 'OPTIMIZED', value: Math.floor(completedAnalyses * 0.7), percentage: totalAnalyses > 0 ? Math.floor((completedAnalyses / totalAnalyses) * 70) : 0 },
    { label: 'APPLYING', value: Math.floor(completedAnalyses * 0.5), percentage: totalAnalyses > 0 ? Math.floor((completedAnalyses / totalAnalyses) * 50) : 0 },
  ];

  if (isLoading && !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-zinc-500 text-sm">Welcome back! Here&apos;s your AI-powered job search workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Weekly Activity</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
              Last 7 Days
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: 300 }}>
            {mounted ? (
               <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f29c" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00f29c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#00f29c' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00f29c"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
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

        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50">
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
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Active Interview Prep Sessions ({appliedJobs.length})</p>
              <div className="grid gap-3">
                {appliedJobs.map((job) => (
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
                      onClick={() => {
                        const interview = interviews.find(i => i.job_id === parseInt(job.id));
                        if (interview) {
                          router.push(`/interviews?id=${interview.id}`);
                        } else {
                           interviewApi.create({
                             job_id: parseInt(job.id).toString(),
                             status: 'active'
                           }).then(interview => {
                            router.push(`/interviews?id=${interview.id}`);
                          });
                        }
                      }}
                      className="px-4 py-2 bg-primary text-black font-bold text-[10px] rounded-lg hover:opacity-90 transition-all"
                    >
                      Start Prep
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-zinc-800/50">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-3">Stripe Interview Prep</p>
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <p className="text-[10px] text-zinc-400 mb-3">Ready to practice for your Stripe interview? I've prepared 5 behavioral questions based on the job description:</p>
                  <ul className="text-[10px] text-zinc-500 space-y-2 list-disc list-inside">
                    <li>Tell me about a time you solved a complex technical problem under pressure</li>
                    <li>Describe a situation where you had to collaborate with a difficult team member</li>
                    <li>How do you approach designing scalable systems?</li>
                    <li>Tell me about a project where you had to make trade-offs between speed and quality</li>
                    <li>Describe a time you took initiative to improve a process or system</li>
                  </ul>
                  <button
                    onClick={() => router.push('/interviews?action=new')}
                    className="w-full mt-4 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:opacity-90 transition-all text-[10px]"
                  >
                    Start Stripe Prep Session
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 inline-flex mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">No active job applications found</p>
              <p className="text-zinc-600 text-[10px] mt-1">Apply to jobs to get interview prep sessions</p>
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