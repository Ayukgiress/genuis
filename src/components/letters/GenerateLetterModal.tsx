'use client';

import React, { useState, useEffect } from 'react';
import { letterApi, resumeApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { LetterGenerateRequest, Resume, LetterType } from '@/types';
import { toast } from 'react-toastify';

interface GenerateLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GenerateLetterModal: React.FC<GenerateLetterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [formData, setFormData] = useState<LetterGenerateRequest>({
    job_title: '',
    company_name: '',
    recipient_name: '',
    letter_type: 'cover_letter',
    custom_instructions: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchResumes();
    }
  }, [isOpen]);

  const fetchResumes = async () => {
    try {
      const data = await resumeApi.getUserResumes();
      setResumes(data);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
      setResumes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Check subscription
    if (user.subscription_plan !== 'pro') {
      toast.error('Custom letter generation is available for Pro users only. Please upgrade your subscription.');
      return;
    }

    try {
      setIsGenerating(true);
      await letterApi.generate(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        job_title: '',
        company_name: '',
        recipient_name: '',
        letter_type: 'cover_letter',
        custom_instructions: '',
      });
    } catch (err) {
      console.error('Failed to generate letter:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate letter. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: keyof LetterGenerateRequest, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const letterTypeOptions: { value: LetterType; label: string; description: string }[] = [
    {
      value: 'cover_letter',
      label: 'Cover Letter',
      description: 'Professional letter to accompany your resume'
    },
    {
      value: 'thank_you_letter',
      label: 'Thank You Letter',
      description: 'Follow up after an interview or meeting'
    },
    {
      value: 'follow_up_letter',
      label: 'Follow Up Letter',
      description: 'Reconnect with a contact or company'
    },
    {
      value: 'custom_letter',
      label: 'Custom Letter',
      description: 'Any other professional correspondence'
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h3 className="font-bold text-white text-xl">Generate Custom Letter</h3>
          <p className="text-zinc-500 text-sm mt-1">AI-powered professional letter generation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Letter Type */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">
              Letter Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {letterTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('letter_type', option.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.letter_type === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-white">{option.label}</div>
                  <div className="text-zinc-500 text-sm mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g., Google"
              />
            </div>
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">
              Recipient Name
            </label>
            <input
              type="text"
              value={formData.recipient_name || ''}
              onChange={(e) => handleInputChange('recipient_name', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g., John Smith (optional)"
            />
          </div>

          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">
              Use Resume (Optional)
            </label>
            <select
              value={formData.resume_id || ''}
              onChange={(e) => handleInputChange('resume_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="">No resume - generate from scratch</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.file_name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">
              Custom Instructions
            </label>
            <textarea
              rows={4}
              value={formData.custom_instructions || ''}
              onChange={(e) => handleInputChange('custom_instructions', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Any specific requirements, tone preferences, or additional context..."
            />
          </div>

          {/* Subscription Notice */}
          {user?.subscription_plan !== 'pro' && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-yellow-400 text-sm font-bold">Pro Feature</p>
                  <p className="text-yellow-500 text-xs">Custom letter generation requires a Pro subscription</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || user?.subscription_plan !== 'pro'}
              className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Letter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};