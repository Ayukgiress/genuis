import { create } from 'zustand';

export type InterviewCallPhase = 'listening' | 'ai_speaking' | 'waiting_for_user';
export type InterviewType = 'behavioral' | 'technical' | 'general';
export type InterviewDifficulty = 'entry' | 'mid' | 'senior';
export type InterviewLanguage = 'en-CM' | 'fr-CM';

interface InterviewCallState {
  phase: InterviewCallPhase;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  durationMinutes: 15 | 30 | 45;
  language: InterviewLanguage;
  captionsEnabled: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  audioDeviceId: string;
  videoDeviceId: string;
  setPhase: (phase: InterviewCallPhase) => void;
  setInterviewType: (type: InterviewType) => void;
  setDifficulty: (difficulty: InterviewDifficulty) => void;
  setDurationMinutes: (duration: 15 | 30 | 45) => void;
  setLanguage: (language: InterviewLanguage) => void;
  setCaptionsEnabled: (enabled: boolean) => void;
  setMuted: (muted: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setAudioDeviceId: (deviceId: string) => void;
  setVideoDeviceId: (deviceId: string) => void;
  resetCall: () => void;
}

const initialCallState = {
  phase: 'listening' as InterviewCallPhase,
  interviewType: 'behavioral' as InterviewType,
  difficulty: 'mid' as InterviewDifficulty,
  durationMinutes: 30 as const,
  language: 'en-CM' as InterviewLanguage,
  captionsEnabled: true,
  muted: false,
  cameraEnabled: true,
  audioDeviceId: '',
  videoDeviceId: '',
};

export const useInterviewCallStore = create<InterviewCallState>((set) => ({
  ...initialCallState,
  setPhase: (phase) => set({ phase }),
  setInterviewType: (interviewType) => set({ interviewType }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setDurationMinutes: (durationMinutes) => set({ durationMinutes }),
  setLanguage: (language) => set({ language }),
  setCaptionsEnabled: (captionsEnabled) => set({ captionsEnabled }),
  setMuted: (muted) => set({ muted }),
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
  setAudioDeviceId: (audioDeviceId) => set({ audioDeviceId }),
  setVideoDeviceId: (videoDeviceId) => set({ videoDeviceId }),
  resetCall: () => set({ ...initialCallState }),
}));
