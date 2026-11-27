import type { Analysis, AuthUser } from '@/types';

// Set this only when it matches the Free allowance enforced by the API.
const configuredFreeLimit = Number.parseInt(process.env.NEXT_PUBLIC_FREE_RESUME_ANALYSIS_LIMIT || '', 10);
export const FREE_RESUME_ANALYSIS_LIMIT = Number.isFinite(configuredFreeLimit) && configuredFreeLimit > 0
  ? configuredFreeLimit
  : null;

export function isProActive(user: AuthUser | null | undefined) {
  return user?.subscription_plan === 'pro' && user.subscription_status === 'active';
}

export function countCurrentMonthAnalyses(analyses: Analysis[], now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return analyses.filter((analysis) => {
    const createdAt = Date.parse(analysis.created_at);
    return analysis.status !== 'failed' && Number.isFinite(createdAt) && createdAt >= monthStart && createdAt < nextMonthStart;
  }).length;
}

export function isUsageLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const status = 'status' in error ? Number(error.status) : 0;
  return status === 402 || ((status === 403 || status === 429) && /limit|quota|plan|upgrade|subscription/i.test(error.message));
}
