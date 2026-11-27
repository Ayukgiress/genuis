import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { interviewApi, kanbanApi, ApiError } from '@/lib/api';
import type { Interview } from '@/types';

export const interviewKeys = {
  list: ['interviews', 'list'] as const,
  boards: ['interviews', 'boards'] as const,
  messages: (id: number) => ['interviews', 'messages', id] as const,
};

export const normalizeInterviewJobId = (jobId: string | number | null | undefined) =>
  jobId == null ? '' : String(jobId).trim();

const pendingInterviewCreates = new WeakMap<QueryClient, Map<string, Promise<Interview>>>();

function findActiveInterview(interviews: Interview[], jobId: string) {
  return interviews
    .filter((interview) =>
      interview.status === 'active' &&
      normalizeInterviewJobId(interview.job_id) === jobId
    )
    .sort((a, b) => {
      const dateDifference = (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
      return dateDifference || b.id - a.id;
    })[0];
}

/** Reuse the newest active session for this exact job ID, or create one once. */
export function createOrReuseInterview(queryClient: QueryClient, rawJobId: string) {
  const jobId = normalizeInterviewJobId(rawJobId);
  if (!jobId) return Promise.reject(new Error('A valid job ID is required to start interview prep.'));

  let pendingForClient = pendingInterviewCreates.get(queryClient);
  if (!pendingForClient) {
    pendingForClient = new Map();
    pendingInterviewCreates.set(queryClient, pendingForClient);
  }

  const pending = pendingForClient.get(jobId);
  if (pending) return pending;

  const creation = (async () => {
    const interviews = await queryClient.fetchQuery({
      queryKey: interviewKeys.list,
      queryFn: () => interviewApi.list(),
      staleTime: 0,
      retry: 1,
    });

    const existing = findActiveInterview(interviews, jobId);
    if (existing) return existing;

    const created = await interviewApi.create({ job_id: jobId, status: 'active' });
    if (normalizeInterviewJobId(created.job_id) !== jobId) {
      throw new ApiError(
        'The interview service returned a session for a different job. No session was opened.',
        502,
        'Mismatched job ID',
      );
    }

    queryClient.setQueryData<Interview[]>(interviewKeys.list, (previous) => {
      const current = previous ?? interviews;
      return [created, ...current.filter((item) => item.id !== created.id)];
    });
    return created;
  })().finally(() => {
    if (pendingForClient?.get(jobId) === creation) pendingForClient.delete(jobId);
  });

  pendingForClient.set(jobId, creation);
  return creation;
}

export function useInterviewsData(enabled: boolean) {
  const queryClient = useQueryClient();

  const interviewsQ = useQuery({
    queryKey: interviewKeys.list,
    queryFn: () => interviewApi.list(),
    enabled,
  });

  const boardsQ = useQuery({
    queryKey: interviewKeys.boards,
    queryFn: () => kanbanApi.listBoards(),
    enabled,
    staleTime: 60_000, // boards change rarely
  });

  const getMessages = useCallback(
    (interviewId: number) => queryClient.fetchQuery({
      queryKey: interviewKeys.messages(interviewId),
      queryFn: () => interviewApi.getMessages(interviewId),
      staleTime: 10_000,
    }),
    [queryClient]
  );

  // Prefetch messages for a given interview and merge into the list cache
  const prefetchMessages = useCallback(
    async (interviewId: number) => {
      const messages = await getMessages(interviewId);

      // Merge messages into the interviews list cache so the page stays consistent
      queryClient.setQueryData<Interview[]>(interviewKeys.list, (prev) =>
        prev?.map((iv) => (iv.id === interviewId ? { ...iv, messages } : iv)) ?? prev
      );

      return messages;
    },
    [getMessages, queryClient]
  );

  // Invalidate messages cache after a new message is sent
  const invalidateMessages = useCallback(
    (interviewId: number) => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.messages(interviewId) });
    },
    [queryClient]
  );

  return {
    interviews: interviewsQ.data ?? [],
    boards: boardsQ.data ?? [],
    isLoading: interviewsQ.isLoading,
    interviewsError: interviewsQ.error ?? null,
    error: interviewsQ.error ?? boardsQ.error ?? null,
    prefetchMessages,
    getMessages,
    invalidateMessages,
    // Expose for optimistic updates
    queryClient,
  };
}
