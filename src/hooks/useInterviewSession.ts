import { extractMedia as extractInterviewMedia, useInterviewRuntime } from './useInterviewWebSocket';
import type { InterviewMessage } from '@/types';

export type SessionPhase =
  | 'idle'
  | 'preparing'
  | 'interviewer_speaking'
  | 'user_listening'
  | 'processing'
  | 'completed';

export type { AiTurnMedia, InterviewRuntimePhase, InterviewRuntimeState } from './useInterviewWebSocket';
export { useInterviewRuntime, useInterviewSocket } from './useInterviewWebSocket';

export interface UseInterviewSessionOptions {
  interviewId: number | null;
  onMessage?: (message: any) => void;
  onAiTurnMedia?: (media: any) => void;
}

export const useInterviewSession = (options: UseInterviewSessionOptions) => {
  return useInterviewRuntime(options);
};

export const extractMedia = (msg: InterviewMessage | null | undefined) =>
  msg ? extractInterviewMedia(msg) : {};

