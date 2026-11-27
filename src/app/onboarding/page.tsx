'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError, getAuthToken, resumeApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { CareerPreferences, Resume } from '@/types';

const GOAL_OPTIONS = [
  { label: 'Land a new role', icon: '🎯' },
  { label: 'Improve my resume', icon: '📄' },
  { label: 'Apply consistently', icon: '🔁' },
  { label: 'Prepare for interviews', icon: '🎤' },
];

const STEPS = [
  { label: 'Resume', description: 'Upload your CV' },
  { label: 'Target role', description: 'Set your direction' },
  { label: 'Goals', description: 'Define success' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.replace('/login');
      return;
    }
    const profile = user?.career_profile || user?.career_preferences;
    if (profile?.target_role) setTargetRole(profile.target_role);
    if (profile?.goals) setGoals(profile.goals);
  }, [isAuthenticated, isLoading, router, user]);

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    setUploadedResume(null);
    setError(null);
  };

  const handleUploadAndContinue = async () => {
    if (!file && !uploadedResume) {
      setError('Choose a resume to continue.');
      return;
    }
    if (file && !uploadedResume) {
      try {
        setIsUploading(true);
        setError(null);
        const resume = await resumeApi.upload(file);
        setUploadedResume(resume);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Resume upload failed. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    setError(null);
    setStep(1);
  };

  const handleComplete = async () => {
    const role = targetRole.trim();
    if (!role) { setError('Enter the role you are targeting.'); setStep(1); return; }
    if (goals.length === 0) { setError('Choose at least one goal to continue.'); return; }
    try {
      setIsSaving(true);
      setError(null);
      const currentProfile: CareerPreferences = user?.career_profile || user?.career_preferences || {};
      const updatedProfile = {
        ...currentProfile,
        target_role: role,
        desired_roles: [role],
        goals,
        resume_id: uploadedResume?.id ?? currentProfile.resume_id,
        onboarding_completed: true,
      };
      const updatedUser = await authApi.updateCareerProfile(updatedProfile);
      useAuthStore.setState((state) => ({
        user: {
          ...state.user!,
          ...updatedUser,
          career_profile: { ...updatedProfile, onboarding_completed: true },
          career_preferences: { ...updatedProfile, onboarding_completed: true },
        },
      }));
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = (goal: string) =>
    setGoals((c) => c.includes(goal) ? c.filter((g) => g !== goal) : [...c, goal]);

  const handleNext = () => {
    if (step === 0) return handleUploadAndContinue();
    if (step === 1) {
      if (!targetRole.trim()) { setError('Enter the role you are targeting.'); return; }
      setError(null);
      setStep(2);
    }
    if (step === 2) return handleComplete();
  };

  const progressPct = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="currentColor">
              <path d="M12.871 4.285a.75.75 0 0 0-1.142 0l-4.7 5.485c-.566.66-.188 1.73.682 1.73h2.039v5.25a.75.75 0 0 0 1.5 0v-5.25h2.039c.87 0 1.248-1.07.682-1.73l-4.7-5.485zM4 19.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75z" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Genius</span>
        </div>
        <span className="text-xs text-zinc-500 hidden sm:block">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-900 w-full">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${step === 0 ? 5 : progressPct}%` }}
        />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row">

        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center p-16 w-[420px] shrink-0 relative overflow-hidden border-r border-zinc-900">
          <div className="absolute top-1/3 left-0 w-72 h-72 bg-primary/8 rounded-full blur-[100px] -z-10" />

          <div className="space-y-2 mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              A quick setup · about 2 minutes
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Let's build your<br />career profile.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed pt-1">
              Add a resume, choose your direction, and tell us what you want to achieve.
            </p>
          </div>

          {/* Step list */}
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-zinc-900 border border-zinc-800' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    done ? 'bg-primary text-black' : active ? 'bg-zinc-800 text-white border-2 border-primary' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                  }`}>
                    {done ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-white' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {s.label}
                    </p>
                    <p className={`text-xs ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — form area, full width on mobile */}
        <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">

          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
              A quick setup · about 2 minutes
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Let's build your career profile.</h1>
            <p className="text-zinc-500 text-sm mt-2">Add a resume, choose your direction, and tell us what you want to achieve.</p>

            {/* Mobile step pills */}
            <div className="flex gap-2 mt-5">
              {STEPS.map((s, i) => (
                <div key={s.label} className="flex-1 space-y-1.5">
                  <div className={`h-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-zinc-800'}`} />
                  <span className={`text-[10px] font-semibold ${i === step ? 'text-white' : 'text-zinc-600'}`}>
                    {i + 1}. {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form card — full width */}
          <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl">

            {error && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Step 0 — Resume */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Upload your resume</h2>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    We'll add it to your resume library so it's ready for analysis and job matching.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                  className={`w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200 ${
                    uploadedResume
                      ? 'border-primary/50 bg-primary/5'
                      : dragOver
                      ? 'border-primary/70 bg-primary/10 scale-[1.01]'
                      : file
                      ? 'border-zinc-600 bg-zinc-900/50'
                      : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className={`mb-4 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    uploadedResume ? 'bg-primary/20' : 'bg-zinc-800'
                  }`}>
                    {uploadedResume ? (
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    )}
                  </div>

                  {uploadedResume ? (
                    <>
                      <p className="font-semibold text-primary">{uploadedResume.file_name}</p>
                      <p className="mt-1 text-xs text-zinc-500">Uploaded successfully · click to replace</p>
                    </>
                  ) : file ? (
                    <>
                      <p className="font-semibold text-white">{file.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">Ready to upload · click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-zinc-300">Drop your resume here</p>
                      <p className="mt-1 text-xs text-zinc-600">or click to browse · PDF, DOC, DOCX, TXT</p>
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-zinc-700 flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Your resume stays private to your account
                </p>
              </div>
            )}

            {/* Step 1 — Target role */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">What role are you targeting?</h2>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    We'll tailor job recommendations, resume analysis, and interview prep around this role.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="target-role" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
                    Target role
                  </label>
                  <input
                    id="target-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && targetRole.trim()) {
                        e.preventDefault();
                        setError(null);
                        setStep(2);
                      }
                    }}
                    autoFocus
                    placeholder="e.g. Senior Product Designer"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-zinc-600 px-1">Press Enter to continue</p>
                </div>

                {/* Suggestions */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Popular roles</p>
                  <div className="flex flex-wrap gap-2">
                    {['Software Engineer', 'Product Manager', 'UX Designer', 'Data Analyst', 'Marketing Manager', 'DevOps Engineer'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setTargetRole(r); setError(null); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          targetRole === r
                            ? 'border-primary/60 bg-primary/10 text-primary'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Goals */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">What are your goals?</h2>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    Choose all that apply. You can update these anytime in settings.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {GOAL_OPTIONS.map(({ label, icon }) => {
                    const selected = goals.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleGoal(label)}
                        className={`relative flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-150 ${
                          selected
                            ? 'border-primary/50 bg-primary/8 shadow-[0_0_20px_rgba(0,242,156,0.06)]'
                            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                      >
                        <span className="text-2xl">{icon}</span>
                        <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-zinc-300'}`}>
                          {label}
                        </span>
                        {selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {goals.length > 0 && (
                  <p className="text-xs text-zinc-500 px-1">
                    {goals.length} goal{goals.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="mt-8 flex items-center justify-between border-t border-zinc-800/60 pt-6">
              <button
                type="button"
                onClick={() => { setError(null); setStep((c) => Math.max(0, c - 1)); }}
                disabled={step === 0 || isUploading || isSaving}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-500 hover:text-white transition-colors disabled:invisible"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isUploading || isSaving}
                className="flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-black transition-all hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_rgba(0,242,156,0.2)]"
              >
                {isUploading ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Uploading…</>
                ) : isSaving ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving…</>
                ) : step === 2 ? (
                  <>Finish setup <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></>
                ) : (
                  <>Continue <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
