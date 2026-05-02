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
import { analysisApi, analyticsApi, jobApi, kanbanApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Analysis, AnalyticsSummary, Job, KanbanBoard } from '@/types';
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
  
  // Job Discovery state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilters, setJobFilters] = useState({ remote: false, location: '' });

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

      {/* Job Discovery Section */}
      <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Job Discovery</h3>
              <p className="text-xs text-zinc-500">AI-matched jobs based on your resume</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary"
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
            <Link 
              href="/kanban"
              className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-all"
            >
              View Pipeline
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
              placeholder="Search jobs (e.g., Software Engineer, React, Remote)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={fetchJobs}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all text-xs"
          >
            Search
          </button>
        </div>

        {/* Filter Tags */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setJobFilters(prev => ({ ...prev, remote: !prev.remote }))}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              jobFilters.remote 
                ? 'bg-primary text-black' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Remote
            </span>
          </button>
          <input
            type="text"
            value={jobFilters.location}
            onChange={(e) => setJobFilters(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Location"
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary w-40"
          />
        </div>

        {/* Jobs Grid */}
        {isLoadingJobs ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <p className="text-zinc-400 mb-2">No jobs found</p>
            <p className="text-zinc-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-primary/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                
                <div className="relative space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                      <p className="text-sm text-zinc-500">{job.company}</p>
                    </div>
                    {job.match_score !== undefined && (
                      <div className={`px-3 py-1.5 rounded-xl border ${getMatchBg(job.match_score)}`}>
                        <span className={`text-sm font-bold ${getMatchColor(job.match_score)}`}>
                          {job.match_score}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {job.location}
                    {job.job_type && (
                      <>
                        <span className="text-zinc-700">•</span>
                        {job.job_type}
                      </>
                    )}
                  </div>

                  {job.matched_skills && job.matched_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.matched_skills.slice(0, 3).map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">
                          {skill}
                        </span>
                      ))}
                      {job.matched_skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-lg">
                          +{job.matched_skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                    <span className="text-[10px] text-zinc-600 font-bold">
                      {formatDate(job.posted_at)} • {job.source}
                    </span>
                    <button
                      onClick={() => handleAddToKanban(job)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-primary hover:text-black text-xs font-bold rounded-lg transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="mt-6 text-center">
            <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
              View All Jobs →
            </button>
          </div>
        )}
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
          <div className="h-[300px] w-full min-h-[300px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
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

        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Analysis Funnel</h3>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="space-y-6 flex-1">
            {funnelData.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-zinc-500 tracking-widest uppercase">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-zinc-800/50 flex justify-between items-end">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Success Rate</p>
            <p className="text-3xl font-bold text-primary">{funnelData[1].percentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}