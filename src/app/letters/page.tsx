'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { letterApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { GenerateLetterModal } from '@/components/letters/GenerateLetterModal';
import type { Letter, Resume } from '@/types';
import Link from 'next/link';

export default function LettersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchLetters();
  }, [isAuthenticated, isLoading, router]);

  const fetchLetters = async () => {
    try {
      setIsLoadingLetters(true);
      setError(null);
      const data = await letterApi.list();
      setLetters(data);
    } catch (err) {
      console.error('Failed to fetch letters:', err);
      setError('Failed to load letters');
    } finally {
      setIsLoadingLetters(false);
    }
  };



  const handleDeleteLetter = async (letterId: number) => {
    if (!confirm('Are you sure you want to delete this letter?')) return;

    try {
      setError(null);
      await letterApi.delete(letterId);
      setLetters(prev => prev.filter(letter => letter.id !== letterId));
      setSuccess('Letter deleted successfully!');
    } catch (err) {
      console.error('Failed to delete letter:', err);
      setError('Failed to delete letter');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLetterTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading || isLoadingLetters) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading letters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 min-h-screen bg-black text-white">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Custom Letters</h1>
          <p className="text-zinc-500 text-lg">AI-generated professional correspondence tailored to your needs.</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
        >
          + Generate Letter
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
          {success}
        </div>
      )}

      {letters.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No letters yet</h3>
          <p className="text-zinc-400 mb-6">Create your first AI-generated letter</p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Generate Your First Letter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{letter.title}</h3>
                    <p className="text-zinc-500 text-sm truncate">To: {letter.recipient}</p>
                  </div>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg flex-shrink-0">
                    {getLetterTypeLabel(letter.letter_type)}
                  </span>
                </div>

                <div className="text-zinc-400 text-sm line-clamp-3">
                  {letter.content.substring(0, 150)}...
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                  <span className="text-zinc-600 text-xs">
                    {formatDate(letter.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/letters/${letter.id}`}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDeleteLetter(letter.id)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateLetterModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={fetchLetters}
      />
    </div>
  );
}