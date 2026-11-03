'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError, getAuthToken, resumeApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { CareerPreferences, Resume } from '@/types';

const GOAL_OPTIONS = [
  'Land a new role',
  'Improve my resume',
  'Apply consistently',
  'Prepare for interviews',
];

const STEPS = ['Resume', 'Target role', 'Goals'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!role) {
      setError('Enter the role you are targeting.');
      setStep(1);
      return;
    }
    if (goals.length === 0) {
      setError('Choose at least one goal to continue.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const currentProfile: CareerPreferences = user?.career_profile || user?.career_preferences || {};
      await authApi.updateCareerProfile({
          ...currentProfile,
          target_role: role,
          desired_roles: [role],
          goals,
          resume_id: uploadedResume?.id ?? currentProfile.resume_id,
          onboarding_completed: true,
      });
      await fetchCurrentUser();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = (goal: string) => {
    setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  };

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-black font-black">G</div>
          <span className="font-bold tracking-tight">Genius</span>
        </div>

        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">A quick setup · about 2 minutes</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Let’s build your career profile.</h1>
          <p className="mt-3 text-zinc-400">Add a resume, choose your direction, and tell us what you want to achieve.</p>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3" aria-label={`Step ${step + 1} of 3`}>
          {STEPS.map((label, index) => (
            <div key={label} className="space-y-2">
              <div className={`h-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-zinc-800'}`} />
              <span className={`text-xs font-semibold ${index === step ? 'text-white' : 'text-zinc-600'}`}>{index + 1}. {label}</span>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8">
          {error && <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold">Upload your resume</h2>
              <p className="mt-2 text-sm text-zinc-500">We’ll add it to your resume library so it’s ready for analysis and job matching.</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] || null); setUploadedResume(null); setError(null); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-black/40 px-5 py-10 text-center transition hover:border-primary/60">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">↑</span>
                <span className="font-semibold">{uploadedResume?.file_name || file?.name || 'Choose a resume file'}</span>
                <span className="mt-2 text-xs text-zinc-500">PDF, DOC, DOCX, or TXT</span>
              </button>
              {uploadedResume && <p className="mt-3 text-xs text-primary">Resume uploaded successfully.</p>}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold">What role are you targeting?</h2>
              <p className="mt-2 text-sm text-zinc-500">We’ll prefill your career profile and tailor recommendations around this role.</p>
              <label htmlFor="target-role" className="mt-6 block text-xs font-bold uppercase tracking-wider text-zinc-400">Target role</label>
              <input id="target-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && targetRole.trim()) { event.preventDefault(); setError(null); setStep(2); } }} autoFocus placeholder="e.g. Product Designer" className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary/50 focus:outline-none" />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold">What are your goals?</h2>
              <p className="mt-2 text-sm text-zinc-500">Choose all that apply. You can update these anytime in settings.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {GOAL_OPTIONS.map((goal) => {
                  const selected = goals.includes(goal);
                  return (
                    <button key={goal} type="button" aria-pressed={selected} onClick={() => toggleGoal(goal)} className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${selected ? 'border-primary/50 bg-primary/10 text-primary' : 'border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-600'}`}>
                      <span className="mr-2" aria-hidden="true">{selected ? '✓' : '+'}</span>{goal}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-6">
            <button type="button" onClick={() => { setError(null); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0 || isUploading || isSaving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white disabled:invisible">Back</button>
            {step < 2 ? (
              <button type="button" onClick={step === 0 ? handleUploadAndContinue : () => { if (!targetRole.trim()) { setError('Enter the role you are targeting.'); return; } setError(null); setStep(2); }} disabled={isUploading || isSaving} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50">
                {isUploading ? 'Uploading…' : step === 0 ? 'Upload and continue' : 'Continue'}
              </button>
            ) : (
              <button type="button" onClick={handleComplete} disabled={isSaving} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50">
                {isSaving ? 'Saving profile…' : 'Finish setup'}
              </button>
            )}
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-zinc-600">Your uploaded resume stays private to your account.</p>
      </div>
    </main>
  );
}