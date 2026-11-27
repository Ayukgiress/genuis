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
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const letterId = params.letterId as string;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (letterId) fetchLetter(parseInt(letterId));
  }, [isAuthenticated, isLoading, router, letterId]);

  const fetchLetter = async (id: number) => {
    try {
      setIsLoadingLetter(true);
      const data = await letterApi.get(id);
      setLetter(data);
      setEditContent(data.content);
      setEditTitle(data.title);
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

  const handleSaveEdit = async () => {
    if (!letter) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await letterApi.update(letter.id, { title: editTitle, content: editContent });
      setLetter(updated);
      setIsEditing(false);
      setSuccess('Letter saved!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save letter:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter.content);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError('Could not copy — please select and copy manually.');
    }
  };

  const handleDownload = () => {
    if (!letter) return;
    const blob = new Blob([letter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${letter.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const getLetterTypeLabel = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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

  if (error && !letter) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/letters" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="text-2xl font-bold">Letter Not Found</h1>
        </div>
        <div className="p-8 text-center">
          <p className="text-zinc-400 mb-4">{error}</p>
          <Link href="/letters" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all">
            Back to Letters
          </Link>
        </div>
      </div>
    );
  }

  if (!letter) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/letters" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div>
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b border-zinc-600 text-white focus:outline-none focus:border-primary"
              />
            ) : (
              <h1 className="text-2xl font-bold">{letter.title}</h1>
            )}
            <p className="text-zinc-500 text-sm">{getLetterTypeLabel(letter.letter_type)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setEditContent(letter.content); setEditTitle(letter.title); }} className="px-4 py-2 border border-zinc-700 text-zinc-300 font-bold rounded-lg text-sm hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCopy} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-sm transition-colors">
                Copy
              </button>
              <button onClick={handleDownload} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-sm transition-colors">
                Download
              </button>
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-sm transition-colors">
                Edit
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg text-sm transition-colors">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl"><p className="text-red-400 text-sm">{error}</p></div>}
      {success && <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl"><p className="text-primary text-sm">{success}</p></div>}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8">
            <div className="border-b border-zinc-800/50 pb-6 mb-6 space-y-2">
              <p className="text-zinc-600 text-sm">{formatDate(letter.created_at)}</p>
              <p className="text-zinc-400 text-sm">To: <span className="text-white font-medium">{letter.recipient}</span></p>
            </div>
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={24}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:border-primary resize-none font-mono"
              />
            ) : (
              <div className="whitespace-pre-wrap text-zinc-200 leading-relaxed text-sm">
                {letter.content}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Type</p>
                <p className="text-white">{getLetterTypeLabel(letter.letter_type)}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Recipient</p>
                <p className="text-white">{letter.recipient}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Created</p>
                <p className="text-white">{formatDate(letter.created_at)}</p>
              </div>
              {letter.updated_at && letter.updated_at !== letter.created_at && (
                <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Last Edited</p>
                  <p className="text-white">{formatDate(letter.updated_at)}</p>
                </div>
              )}
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Word Count</p>
                <p className="text-white">{letter.content.split(/\s+/).filter(Boolean).length} words</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-white">Quick Actions</h3>
            <button onClick={handleCopy} className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm text-left flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy to Clipboard
            </button>
            <button onClick={handleDownload} className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm text-left flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download as .txt
            </button>
            <button onClick={() => setIsEditing(true)} className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm text-left flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Letter
            </button>
            <Link href={`/letters?compose=1&type=${letter.letter_type}`} className="block">
              <button className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition-all text-sm text-left flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Generate New Variation
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
