import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { analysisApi, analyticsApi, kanbanApi, interviewApi } from '@/lib/api';
import { useApplicationStore } from '@/store/applicationStore';
import { interviewKeys, normalizeInterviewJobId } from '@/hooks/useInterviewsData';
import type { Job, Interview } from '@/types';

// ── Query keys ────────────────────────────────────────────────────────────────
export const dashboardKeys = {
  analyses: ['dashboard', 'analyses'] as const,
  analyticsSummary: ['dashboard', 'analyticsSummary'] as const,
  boards: interviewKeys.boards,
  interviews: interviewKeys.list,
};

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useDashboardData(enabled: boolean) {
  const applications = useApplicationStore((s) => s.applications);

  // Parallel top-level fetches — each fails independently
  const [analysesQ, summaryQ, boardsQ, interviewsQ] = useQueries({
    queries: [
      { queryKey: dashboardKeys.analyses, queryFn: () => analysisApi.list(), enabled },
      { queryKey: dashboardKeys.analyticsSummary, queryFn: () => analyticsApi.getSummary(), enabled },
      { queryKey: dashboardKeys.boards, queryFn: () => kanbanApi.listBoards(), enabled },
      { queryKey: dashboardKeys.interviews, queryFn: () => interviewApi.list(), enabled },
    ],
  });

  // The application store already has the card fields used by the dashboard.
  // Avoid one job-detail request per application just to render these cards.
  const appliedJobs = useMemo(() => {
    const seen = new Set<string>();
    const jobs: Job[] = [];
    for (const app of applications) {
      const jobId = normalizeInterviewJobId(app.jobId);
      if (jobId && !seen.has(jobId)) {
        seen.add(jobId);
        jobs.push({
          id: jobId,
          title: app.title,
          company: app.company,
          location: 'Remote',
          description: '',
          requirements: [],
          source: 'Applied',
          source_url: '',
          posted_at: app.appliedAt,
        });
      }
    }
    return jobs;
  }, [applications]);

  // Build job_id → interview map (active only, first-wins dedup)
  const interviewMap = useMemo(() => {
    const map = new Map<string, Interview>();
    for (const iv of interviewsQ.data ?? []) {
      const jobId = normalizeInterviewJobId(iv.job_id);
      if (iv.status !== 'active' || !jobId) continue;

      const current = map.get(jobId);
      const currentCreatedAt = current ? Date.parse(current.created_at) || 0 : -1;
      const candidateCreatedAt = Date.parse(iv.created_at) || 0;
      if (!current || candidateCreatedAt > currentCreatedAt ||
        (candidateCreatedAt === currentCreatedAt && iv.id > current.id)) {
        map.set(jobId, iv);
      }
    }
    return map;
  }, [interviewsQ.data]);

  const isLoading =
    analysesQ.isLoading ||
    summaryQ.isLoading ||
    boardsQ.isLoading ||
    interviewsQ.isLoading;
  const error = analysesQ.error ?? summaryQ.error ?? boardsQ.error ?? interviewsQ.error ?? null;

  return {
    analyses: analysesQ.data ?? [],
    analyticsSummary: summaryQ.data ?? null,
    boards: boardsQ.data ?? [],
    interviews: interviewsQ.data ?? [],
    interviewMap,
    appliedJobs,
    isLoading,
    isInterviewDataReady: interviewsQ.isSuccess,
    error,
  };
}
