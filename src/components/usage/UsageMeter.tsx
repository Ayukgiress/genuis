'use client';

import type { Analysis, AuthUser } from '@/types';
import { countCurrentMonthAnalyses, FREE_RESUME_ANALYSIS_LIMIT, isProActive } from '@/lib/usage';
import { UpgradePrompt } from './UpgradePrompt';

export function UsageMeter({ analyses, user }: { analyses: Analysis[]; user: AuthUser | null }) {
  const used = countCurrentMonthAnalyses(analyses);
  const isPro = isProActive(user);
  const reachedLimit = !isPro && FREE_RESUME_ANALYSIS_LIMIT !== null && used >= FREE_RESUME_ANALYSIS_LIMIT;
  const percent = isPro || FREE_RESUME_ANALYSIS_LIMIT === null ? 0 : Math.min(100, Math.round((used / FREE_RESUME_ANALYSIS_LIMIT) * 100));

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5 sm:p-6" aria-labelledby="usage-meter-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Plan usage</p><h2 id="usage-meter-title" className="mt-1 text-base font-bold text-white">Resume analyses this month</h2></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isPro ? 'bg-primary/10 text-primary' : 'bg-zinc-800 text-zinc-300'}`}>{isPro ? 'Pro · Unlimited' : 'Free plan'}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3"><p className="text-2xl font-black text-white">{used}<span className="text-sm font-medium text-zinc-500">{isPro ? ' used' : FREE_RESUME_ANALYSIS_LIMIT === null ? ' this month' : ` / ${FREE_RESUME_ANALYSIS_LIMIT}`}</span></p><p className="text-xs text-zinc-500">{isPro ? 'No monthly analysis cap' : FREE_RESUME_ANALYSIS_LIMIT === null ? 'Service plan limits apply' : `${Math.max(0, FREE_RESUME_ANALYSIS_LIMIT - used)} remaining`}</p></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800" role="meter" aria-label="Monthly resume analyses" aria-valuemin={0} aria-valuemax={isPro ? Math.max(used, 1) : FREE_RESUME_ANALYSIS_LIMIT ?? Math.max(used, 1)} aria-valuenow={FREE_RESUME_ANALYSIS_LIMIT === null ? 0 : used}>
        <div className={`h-full rounded-full transition-[width] ${reachedLimit ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
      </div>
      {reachedLimit && <div className="mt-4"><UpgradePrompt title="Free analyses used" message="You’ve used this month’s resume analysis allowance. Upgrade to keep running AI analyses." /></div>}
    </section>
  );
}
