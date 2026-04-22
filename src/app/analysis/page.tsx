'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { analysisApi, resumeApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Analysis, Resume, FocusArea } from '@/types';

export default function AnalysisPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [analysesData, resumesData] = await Promise.all([
        analysisApi.list(),
        resumeApi.list()
      ]);

      setAnalyses(analysesData);
      setResumes(resumesData);

      if (analysesData.length > 0) {
        setSelectedAnalysis(analysesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push('/login');
      } else {
        setError('Failed to load analyses. Please make sure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  const handleAnalyzeResume = async (resumeId: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccess(null);
      
      const result = await analysisApi.analyze(resumeId);
      const resumeIdNum = Number(resumeId);
      setAnalyses(prev => {
        const existing = prev.find(a => a.resume_id === resumeIdNum);
        if (existing) {
          return prev.map(a => a.resume_id === resumeIdNum ? result : a);
        }
        return [...prev, result];
      });
      setSelectedAnalysis(result);
      setSuccess('Resume analyzed successfully!');
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

  const handleGetSuggestions = async (resumeId: string, focusArea?: FocusArea) => {
    try {
      setIsGettingSuggestions(true);
      setError(null);
      
      const result = await analysisApi.getSuggestions(resumeId, focusArea);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to get suggestions. Please try again.');
      }
    } finally {
      setIsGettingSuggestions(false);
    }
  };

  const getResumeName = (resumeId: number) => {
    const resume = resumes.find(r => r.id === resumeId);
    return resume ? resume.file_name : `Resume #${resumeId}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get resumes without analysis
  const unanalyzedResumes = resumes.filter(r => 
    !analyses.some(a => a.resume_id === r.id && a.status === 'completed')
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">AI Resume Analysis</h1>
        <p className="text-zinc-500 text-lg">Advanced AI-powered resume optimization and career guidance.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar - Analysis List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Analyses</h2>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {analyses.length} Total
            </span>
          </div>

          {analyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">No analyses yet</p>
              <p className="text-zinc-500 text-sm">Upload a resume to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <button
                  key={analysis.id}
                  onClick={() => { setSelectedAnalysis(analysis); setSuggestions(null); }}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedAnalysis?.id === analysis.id
                      ? 'bg-zinc-900 border border-primary/50'
                      : 'bg-zinc-950 border border-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm truncate flex-1">{getResumeName(Number(analysis.resume_id))}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      analysis.status === 'completed'
                        ? 'bg-primary/10 text-primary'
                        : analysis.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>{formatDate(analysis.created_at)}</span>
                    {analysis.result?.score && (
                      <span className="font-bold text-primary">{analysis.result.score}%</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content - Analysis Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAnalysis ? (
            <>
              {/* Score Card */}
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Analysis Result</h3>
                  <div className="flex items-center gap-4">
                    {selectedAnalysis.result?.score !== undefined && (
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Match Score</p>
                        <p className="text-3xl font-bold text-primary">{selectedAnalysis.result.score}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAnalysis.result?.summary && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Summary</h4>
                      <p className="text-zinc-300">{selectedAnalysis.result.summary}</p>
                    </div>
                  </div>
                )}

                {selectedAnalysis.result?.strengths && selectedAnalysis.result.strengths.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">Strengths</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAnalysis.result.strengths.map((strength, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-sm text-zinc-300">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAnalysis.result?.weaknesses && selectedAnalysis.result.weaknesses.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Areas for Improvement</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAnalysis.result.weaknesses.map((weakness, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          <span className="text-sm text-zinc-300">{weakness}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedAnalysis.result && selectedAnalysis.status === 'pending' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-zinc-400">Analysis in progress...</p>
                  </div>
                )}
              </div>

              {/* Suggestions Section */}
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">AI Suggestions</h3>
                  <button
                    onClick={() => handleGetSuggestions(String(selectedAnalysis.resume_id), selectedFocusArea || undefined)}
                    disabled={isGettingSuggestions}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isGettingSuggestions ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Getting...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Generate
                      </>
                    )}
                  </button>
                </div>

                {/* Focus Area Selector */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedFocusArea(null)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      !selectedFocusArea
                        ? 'bg-primary text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {(['summary', 'experience', 'skills', 'education'] as FocusArea[]).map((area) => (
                    <button
                      key={area}
                      onClick={() => setSelectedFocusArea(area)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        selectedFocusArea === area
                          ? 'bg-primary text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {suggestions && suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.map((suggestion, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-zinc-300">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <p>Click &quot;Generate&quot; to get AI suggestions</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No analysis selected</p>
              <p className="text-zinc-500 text-sm">Select an analysis from the list or upload a new resume</p>
            </div>
          )}

          {/* Analyze New Resumes */}
          {unanalyzedResumes.length > 0 && (
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-xl font-bold mb-6">Analyze More Resumes</h3>
              <div className="space-y-3">
                {unanalyzedResumes.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div>
                      <p className="font-bold">{resume.file_name}</p>
                      <p className="text-xs text-zinc-500">{formatDate(resume.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleAnalyzeResume(String(resume.id))}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      Analyze
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
