'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const stats = [
  { 
    label: 'Total Apps', 
    value: '128', 
    change: '+12%', 
    trend: 'up',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  { 
    label: 'Interviews', 
    value: '12', 
    change: '+5%', 
    trend: 'up',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  { 
    label: 'Offers', 
    value: '3', 
    change: '+1%', 
    trend: 'up',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  },
  { 
    label: 'Match Score', 
    value: '92%', 
    change: '-2%', 
    trend: 'down',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
];

const chartData = [
  { name: 'MON', value: 30 },
  { name: 'TUE', value: 25 },
  { name: 'WED', value: 35 },
  { name: 'THU', value: 55 },
  { name: 'FRI', value: 30 },
  { name: 'SAT', value: 65 },
  { name: 'SUN', value: 45 },
];

const funnelData = [
  { label: 'APPLIED', value: 128, percentage: 100 },
  { label: 'SCREENED', value: 42, percentage: 32 },
  { label: 'INTERVIEWED', value: 12, percentage: 9 },
  { label: 'OFFERED', value: 3, percentage: 2.3 },
];

const applications = [
  {
    company: 'Stripe',
    role: 'Senior UX Designer',
    logo: 'https://logo.clearbit.com/stripe.com',
    date: 'Oct 12, 2023',
    score: 98,
    status: 'INTERVIEWING',
    statusColor: 'text-primary border-primary/20 bg-primary/10',
  },
  {
    company: 'Linear',
    role: 'Product Designer',
    logo: 'https://logo.clearbit.com/linear.app',
    date: 'Oct 10, 2023',
    score: 94,
    status: 'APPLIED',
    statusColor: 'text-zinc-400 border-zinc-800 bg-zinc-900',
  },
  {
    company: 'Figma',
    role: 'Design Systems Eng',
    logo: 'https://logo.clearbit.com/figma.com',
    date: 'Oct 08, 2023',
    score: 88,
    status: 'OFFER SENT',
    statusColor: 'text-primary border-primary/20 bg-primary/10',
  },
];

export default function DashboardPage() {
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
            <h3 className="font-bold">Conversion Funnel</h3>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Overall Success</p>
            <p className="text-3xl font-bold text-primary">2.3%</p>
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold">Recent Applications</h3>
          <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
            View All Applications
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">
                <th className="pb-4 font-bold">Company & Role</th>
                <th className="pb-4 font-bold">Date Applied</th>
                <th className="pb-4 font-bold">Match Score</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {applications.map((app) => (
                <tr key={app.company} className="group">
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                        <img src={app.logo} alt={app.company} className="w-6 h-6 object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{app.company}</p>
                        <p className="text-xs text-zinc-500">{app.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-xs text-zinc-400 font-medium">{app.date}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{app.score}%</span>
                      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${app.score}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${app.statusColor}`}>
                      {app.status}
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
      </div>
    </div>
  );
}
