'use client';

import React, { useState, useEffect } from 'react';
import { letterApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Job, Resume, LetterGenerateRequest } from '@/types';

interface ApplyJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  resumes: Resume[];
}

type Step = 'ask' | 'select_resume' | 'generating' | 'success' | 'error';

export const ApplyJobModal: React.FC<ApplyJobModalProps> = ({
  isOpen,
  onClose,
  job,
  resumes,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('ask');
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLetterId, setGeneratedLetterId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('ask');
      setSelectedResumeId(null);
      setError(null);
      setGeneratedLetterId(null);
    }
  }, [isOpen]);

  const handleNoLetter = () => {
    if (job?.source_url) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const handleYesLetter = () => {
    if (resumes.length === 0) {
      setStep('error');
      setError('You have no resumes uploaded. Please upload a resume first to generate a custom letter.');
      return;
    }

    if (resumes.length === 1) {
      // Auto-select the only resume
      setSelectedResumeId(resumes[0].id);
      generateLetter(resumes[0].id);
    } else {
      // Show resume selection
      setStep('select_resume');
    }
  };

  const handleResumeSelect = (resumeId: number) => {
    setSelectedResumeId(resumeId);
    generateLetter(resumeId);
  };

  const generateLetter = async (resumeId: number) => {
    if (!job) return;

    // Validate job data
    if (!job.title || !job.company) {
      setStep('error');
      setError('Job information is incomplete. Cannot generate letter.');
      return;
    }

    // Check subscription
    if (user?.subscription_plan !== 'pro') {
      setStep('error');
      setError('Custom letter generation is available for Pro users only. Please upgrade your subscription.');
      return;
    }

    setStep('generating');
    setIsGenerating(true);
    setError(null);

    try {
      const requestData: LetterGenerateRequest = {
        job_title: job.title,
        company_name: job.company,
        letter_type: 'cover_letter',
        resume_id: resumeId,
      };

      console.log('Generating letter with data:', requestData);
      const letter = await letterApi.generate(requestData);
      console.log('Letter generated:', letter);
      setGeneratedLetterId(letter.id);
      setStep('success');
    } catch (err) {
      console.error('Failed to generate letter:', err);
      setStep('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate letter. Please try again.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceedToApply = () => {
    if (job?.source_url) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const handleViewLetter = () => {
    if (generatedLetterId) {
      window.open(`/letters/${generatedLetterId}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="mb-6">
          <h3 className="font-bold text-white text-xl">Apply for {job.title}</h3>
          <p className="text-zinc-500 text-sm mt-1">{job.company} • {job.location}</p>
        </div>

        {/* Step: Ask */}
        {step === 'ask' && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Would you like to generate a custom cover letter for this position before applying?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleNoLetter}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                No, Apply Directly
              </button>
              <button
                onClick={handleYesLetter}
                className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Yes, Generate Letter
              </button>
            </div>
          </div>
        )}

        {/* Step: Select Resume */}
        {step === 'select_resume' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-3">
                Select a resume to use for the cover letter
              </label>
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => handleResumeSelect(resume.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedResumeId === resume.id
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{resume.file_name}</p>
                        <p className="text-xs text-zinc-500">{new Date(resume.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && isGenerating && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Generating your custom cover letter...</p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <p className="text-green-400 text-sm font-bold">Letter Generated!</p>
                  <p className="text-green-500 text-xs">Your custom cover letter is ready.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleViewLetter}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                View Letter
              </button>
              <button
                onClick={handleProceedToApply}
                className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Proceed to Apply
              </button>
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-red-400 text-sm font-bold">Error</p>
                  <p className="text-red-500 text-xs">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                Close
              </button>
              {job?.source_url && (
                <button
                  onClick={handleProceedToApply}
                  className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
                >
                  Apply Anyway
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

