'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { letterApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Letter } from '@/types';
import Link from 'next/link';

export default function LetterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [isLoadingLetter, setIsLoadingLetter] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const letterId = params.letterId as string;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (letterId) {
      fetchLetter(parseInt(letterId));
    }
  }, [isAuthenticated, isLoading, router, letterId]);

  const fetchLetter = async (id: number) => {
    try {
      setIsLoadingLetter(true);
      const data = await letterApi.get(id);
      setLetter(data);
    } catch (err) {
      console.error('Failed to fetch letter:', err);
      setError('Failed to load letter');
    } finally {
      setIsLoadingLetter(false);
    }
  };

  const handleDelete = async () => {
    if (!letter || !confirm('Are you sure you want to delete this letter?')) return;

    try {
      await letterApi.delete(letter.id);
      router.push('/letters');
    } catch (err) {
      console.error('Failed to delete letter:', err);
      setError('Failed to delete letter');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLetterTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading || isLoadingLetter) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading letter...</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Link
            href="/letters"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">Letter Not Found</h1>
        </div>

        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-4">{error || 'The letter you are looking for does not exist.'}</p>
          <Link
            href="/letters"
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Back to Letters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/letters"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{letter.title}</h1>
            <p className="text-zinc-500 text-sm">{getLetterTypeLabel(letter.letter_type)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Letter Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Letter Preview */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8">
            <div className="space-y-6">
              {/* Letter Header */}
              <div className="border-b border-zinc-800/50 pb-6">
                <div className="space-y-4">
                  <div className="text-zinc-600 text-sm">
                    {formatDate(letter.created_at)}
                  </div>
                  <div>
                    <div className="text-zinc-400 text-sm mb-1">To:</div>
                    <div className="font-medium text-white">{letter.recipient}</div>
                  </div>
                </div>
              </div>

              {/* Letter Body */}
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-zinc-200 leading-relaxed">
                  {letter.content}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Letter Info */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Letter Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Type</div>
                <div className="text-white font-medium">{getLetterTypeLabel(letter.letter_type)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Recipient</div>
                <div className="text-white font-medium">{letter.recipient}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Created</div>
                <div className="text-white font-medium">{formatDate(letter.created_at)}</div>
              </div>
              {letter.updated_at && (
                <div>
                  <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Updated</div>
                  <div className="text-white font-medium">{formatDate(letter.updated_at)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm">
                Copy to Clipboard
              </button>
              <button className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm">
                Download PDF
              </button>
              <button className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm">
                Edit Letter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}