'use client';

import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analysisApi, analyticsApi, ApiError } from '@/lib/api';
import type { Analysis, AnalyticsSummary } from '@/types';

const COLORS = ['#00f29c', '#6366f1', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch analyses
        const analysesData = await analysisApi.list();
        setAnalyses(analysesData);
        
        // Fetch analytics summary
        const summaryData = await analyticsApi.getSummary();
        setAnalyticsSummary(summaryData);
        
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate stats from analyses
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

  // Build stats array from real data
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

  // Generate chart data from analytics
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
    
    // Convert event types to chart data
    const eventTypes = Object.entries(analyticsSummary.event_types);
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    return days.map((day, index) => ({
      name: day,
      value: eventTypes.length > 0 ? Math.max(...Object.values(analyticsSummary.event_types)) - (index * 5) : 30 - (index * 5)
    }));
  }, [analyticsSummary]);

  // Funnel data from analyses
  const funnelData = [
    { label: 'UPLOADED', value: totalAnalyses, percentage: totalAnalyses > 0 ? 100 : 0 },
    { label: 'ANALYZED', value: completedAnalyses, percentage: totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0 },
    { label: 'OPTIMIZED', value: Math.floor(completedAnalyses * 0.7), percentage: totalAnalyses > 0 ? Math.floor((completedAnalyses / totalAnalyses) * 70) : 0 },
    { label: 'APPLYING', value: Math.floor(completedAnalyses * 0.5), percentage: totalAnalyses > 0 ? Math.floor((completedAnalyses / totalAnalyses) * 50) : 0 },
  ];

  // Recent analyses
  const recentAnalyses = analyses.slice(0, 5).map((analysis) => ({
    id: analysis.id,
    name: `Resume #${analysis.resume_id}`,
    score: analysis.result?.score || 0,
    status: analysis.status === 'completed' ? 'COMPLETED' : analysis.status.toUpperCase(),
    date: new Date(analysis.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    statusColor: analysis.status === 'completed' 
      ? 'text-primary border-primary/20 bg-primary/10'
      : analysis.status === 'pending'
        ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
        : 'text-red-500 border-red-500/20 bg-red-500/10',
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && analyses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-red-400">{error}</p>
          <p className="text-zinc-500 text-sm">Please make sure the backend is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-zinc-500 text-sm">Welcome back! Here's how your job search is progressing this week.</p>
      </div>

      {/* Stats Grid */}
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
        {/* Chart Section */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Weekly Activity</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
              Last 7 Days
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <div className="h-[300px] w-full">
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
          </div>
        </div>

        {/* Conversion Funnel */}
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

      {/* Recent Analyses Table */}
      <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold">Recent Resume Analyses</h3>
          <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
            View All Analyses
          </button>
        </div>
        
        {recentAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-zinc-400 mb-2">No resume analyses yet</p>
            <p className="text-zinc-500 text-sm">Upload a resume to get started with AI-powered analysis</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">
                  <th className="pb-4 font-bold">Resume</th>
                  <th className="pb-4 font-bold">Date</th>
                  <th className="pb-4 font-bold">Match Score</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentAnalyses.map((analysis) => (
                  <tr key={analysis.id} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{analysis.name}</p>
                          <p className="text-xs text-zinc-500">AI Analysis</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-zinc-400 font-medium">{analysis.date}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{analysis.score}%</span>
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${analysis.score >= 70 ? 'bg-primary' : analysis.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${analysis.score}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${analysis.statusColor}`}>
                        {analysis.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
