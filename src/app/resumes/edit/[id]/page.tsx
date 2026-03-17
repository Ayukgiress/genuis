'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { resumeApi, analysisApi, ApiError } from '@/lib/api';
import type { Resume, Analysis } from '@/types';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function EditMasterPage({ params }: EditPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [resume, setResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'suggestions' | 'preview' | 'original'>('original');

  useEffect(() => {
    fetchResume();
  }, [resolvedParams.id]);

  const fetchResume = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const resumeId = parseInt(resolvedParams.id);
      const data = await resumeApi.get(resumeId);
      setResume(data);
      setEditContent(data.content || '');
      setEditFileName(data.file_name);
      
      // Fetch analysis if available
      try {
        const analysisData = await analysisApi.getByResume(resumeId);
        setAnalysis(analysisData);
      } catch {
        // No analysis yet
      }
    } catch (err) {
      console.error('Failed to fetch resume:', err);
      setError('Failed to load resume. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resume) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedResume = await resumeApi.update(resume.id, {
        file_name: editFileName,
        content: editContent,
      });
      
      setResume(updatedResume);
      setSuccess('Resume saved successfully!');
    } catch (err) {
      console.error('Failed to save resume:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save resume. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resume) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccess(null);
      
      const result = await analysisApi.analyze(resume.id);
      setAnalysis(result);
      setActiveTab('suggestions');
      setSuccess('Resume analyzed! Review the suggestions below.');
    } catch (err) {
      console.error('Failed to analyze resume:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to analyze resume. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    // Add the suggestion to the content editor and switch to content tab
    setEditContent(prev => {
      // If content is empty, just add the suggestion
      if (!prev || prev.trim() === '') {
        return suggestion;
      }
      // Otherwise append with a separator
      return prev + '\n\n' + suggestion;
    });
    setActiveTab('content');
    setSuccess('Suggestion applied! Switched to Content tab to review and edit.');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold tracking-tight">Edit Master</h1>
            </div>
            <p className="text-zinc-500 ml-14">
              {resume?.file_name} • Created {resume ? formatDate(resume.created_at) : ''}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleAnalyze}
              disabled={!resume || isAnalyzing}
              className="px-6 py-3 bg-zinc-900 border border-zinc-800 font-bold rounded-2xl hover:bg-zinc-800 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Analyze
                </>
              )}
            </button>
            <button 
              onClick={handleSave}
              disabled={!resume || isSaving}
              className="px-8 py-3 bg-primary text-black font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs shadow-[0_0_30px_-5px_rgba(0,242,156,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === 'content' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'suggestions' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            AI Suggestions
            {analysis && (
              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px]">
                {analysis.result?.suggestions?.length || 0}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === 'preview' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === 'original' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Original File
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 rounded-[2rem] bg-zinc-950 border border-zinc-800 p-6 overflow-hidden">
          {activeTab === 'content' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">File Name</label>
                <input
                  type="text"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all font-bold"
                  placeholder="Resume name..."
                />
              </div>
              <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">Resume Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] px-6 py-6 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm leading-relaxed resize-none"
                  placeholder="Paste or edit resume text content here..."
                />
              </div>
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="h-full overflow-y-auto space-y-6">
              {!analysis ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-zinc-400">No analysis yet</p>
                  <p className="text-zinc-500 text-sm">Click "AI Analyze" to get personalized suggestions</p>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-4 px-6 py-3 bg-primary text-black font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs"
                  >
                    Analyze Now
                  </button>
                </div>
              ) : (
                <>
                  {/* Score */}
                  {analysis.result?.score !== undefined && (
                    <div className="text-center space-y-2">
                      <div className="w-24 h-24 mx-auto rounded-full bg-zinc-900 flex items-center justify-center border-4 border-primary">
                        <span className="text-3xl font-bold text-primary">{analysis.result.score}%</span>
                      </div>
                      <p className="text-zinc-400 text-sm">AI Match Score</p>
                    </div>
                  )}

                  {/* Summary */}
                  {analysis.result?.summary && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Summary</h4>
                      <p className="text-sm text-zinc-300">{analysis.result.summary}</p>
                    </div>
                  )}

                  {/* Strengths */}
                  {analysis.result?.strengths && analysis.result.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Strengths
                      </h4>
                      <ul className="space-y-2">
                        {analysis.result.strengths.map((strength, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-xl">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {analysis.result?.suggestions && analysis.result.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        AI Suggestions
                      </h4>
                      <ul className="space-y-3">
                        {analysis.result.suggestions.map((suggestion, i) => (
                          <li key={i} className="bg-zinc-900/50 p-4 rounded-xl space-y-3">
                            <div className="flex items-start gap-2 text-sm text-zinc-300">
                              <span className="w-6 h-6 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                              </span>
                              {suggestion}
                            </div>
                            <button 
                              onClick={() => applySuggestion(suggestion)}
                              className="ml-8 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              Apply to Content
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {analysis.result?.weaknesses && analysis.result.weaknesses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-2">
                        {analysis.result.weaknesses.map((weakness, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Keywords */}
                  {analysis.result?.keywords && analysis.result.keywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Detected Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.result.keywords.map((keyword, i) => (
                          <span key={i} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-lg">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="h-full overflow-y-auto">
              <div className="bg-white text-black p-8 rounded-xl min-h-full">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {editContent || 'No content to preview'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'original' && (
            <div className="h-full overflow-y-auto space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  Original Document Content
                </h4>
                {resume?.file_path && (
                  <a 
                    href={resume.file_path} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white font-bold text-xs rounded-xl hover:bg-zinc-700 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Original
                  </a>
                )}
              </div>
              <div className="bg-white text-black p-6 rounded-xl min-h-[60vh]">
                {resume?.content ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {resume.content}
                  </pre>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No content available</p>
                    <p className="text-zinc-400 text-sm mt-2">The original document content could not be extracted</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
