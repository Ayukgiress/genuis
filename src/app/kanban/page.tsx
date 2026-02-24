'use client';

import React from 'react';

const kanbanData = [
  {
    title: 'WISHLIST',
    count: 12,
    cards: [
      {
        id: 1,
        role: 'Senior Systems Architect',
        company: 'TechCorp',
        location: 'Mountain View, CA',
        match: 92,
        priority: 'HIGH PRIORITY',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
      },
      {
        id: 2,
        role: 'UX Researcher',
        company: 'Traveler',
        location: 'Remote',
        match: 85,
        priority: 'STANDARD',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
            <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M12 7l0 2" />
            <path d="M12 15l0 2" />
            <path d="M7 12l2 0" />
            <path d="M15 12l2 0" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'APPLIED',
    count: 8,
    cards: [
      {
        id: 3,
        role: 'Staff Platform Engineer',
        company: 'FinStream',
        location: 'San Francisco',
        match: 95,
        status: 'ACTIVE',
        time: '2D AGO',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'INTERVIEW',
    count: 3,
    cards: [
      {
        id: 4,
        role: 'Design Systems Lead',
        company: 'CreativeCloud',
        location: 'SF',
        match: 89,
        event: 'ON-SITE TOMORROW',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )
      }
    ]
  },
  {
    title: 'OFFER',
    count: 1,
    cards: [
      {
        id: 5,
        role: 'Principal Product Designer',
        company: 'WebSphere',
        location: 'Remote',
        match: 96,
        expires: 'EXPIRES IN 3 DAYS',
        icon: (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        )
      }
    ]
  }
];

export default function KanbanPage() {
  return (
    <div className="p-8 space-y-10 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Application Pipeline</h1>
          <p className="text-zinc-500 text-lg">Real-time AI matching and career stage tracking.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button className="px-6 py-2 bg-zinc-800 text-primary text-xs font-black rounded-lg uppercase tracking-widest">Board</button>
            <button className="px-6 py-2 text-zinc-500 text-xs font-black uppercase tracking-widest hover:text-zinc-300">List</button>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-widest text-xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Application
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kanbanData.map((column) => (
          <div key={column.title} className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,242,156,0.5)]" />
                <h2 className="text-xs font-black tracking-[0.2em] text-zinc-400">{column.title} <span className="ml-2 text-zinc-600 font-bold">{column.count}</span></h2>
              </div>
              <button className="text-zinc-600 hover:text-zinc-400">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {column.cards.map((card: any) => (
                <div key={card.id} className="group p-6 rounded-[2rem] bg-zinc-950 border border-zinc-900 hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="relative space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary group-hover:border-primary/20 transition-colors">
                        {card.icon}
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary tracking-wider">
                        {card.match}% MATCH
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{card.role}</h3>
                      <p className="text-sm text-zinc-500 font-medium">{card.company} • {card.location}</p>
                    </div>

                    <div className="pt-6 border-t border-zinc-900/50 flex justify-between items-center">
                      {card.priority && (
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-500">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-yellow-500" fill="currentColor">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          {card.priority}
                        </div>
                      )}
                      
                      {card.status && (
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {card.status}
                          <span className="ml-2 text-zinc-600 uppercase">{card.time}</span>
                        </div>
                      )}

                      {card.event && (
                        <div className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black tracking-widest text-primary">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {card.event}
                        </div>
                      )}

                      {card.expires && (
                        <div className="w-full text-center py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black tracking-widest text-primary group-hover:border-primary/30 transition-colors">
                          {card.expires}
                        </div>
                      )}

                      {card.id === 1 && (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 overflow-hidden ml-auto">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {column.title === 'WISHLIST' && (
                <button className="w-full py-4 border-2 border-dashed border-zinc-900 rounded-[2rem] text-xs font-black tracking-[0.2em] text-zinc-600 hover:border-zinc-800 hover:text-zinc-400 transition-all uppercase flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Lead
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
