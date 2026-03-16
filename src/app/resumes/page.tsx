'use client';

import React, { useEffect, useState, useRef } from 'react';
import { resumeApi, analysisApi, ApiError } from '@/lib/api';
import type { Resume, Analysis } from '@/types';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await resumeApi.list();
      setResumes(data);
      if (data.length > 0 && !selectedResume) {
        setSelectedResume(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
      setError('Failed to load resumes. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalysis = async (resumeId: string) => {
    try {
      const data = await analysisApi.getByResume(resumeId);
      setAnalysis(data);
    } catch (err) {
      setAnalysis(null);
    }
  };

  useEffect(() => {
    if (selectedResume) {
      fetchAnalysis(selectedResume.id);
    }
  }, [selectedResume]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);
      
      const newResume = await resumeApi.upload(file);
      setResumes(prev => [newResume, ...prev]);
      setSelectedResume(newResume);
      setSuccess('Resume uploaded successfully!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload resume:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to upload resume. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      setError(null);
      await resumeApi.delete(resumeId);
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      if (selectedResume?.id === resumeId) {
        setSelectedResume(resumes.length > 1 ? resumes.find(r => r.id !== resumeId) || null : null);
      }
      setSuccess('Resume deleted successfully!');
    } catch (err) {
      console.error('Failed to delete resume:', err);
      setError('Failed to delete resume.');
    }
  };

  const handleAnalyzeResume = async (resumeId: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccess(null);
      
      const result = await analysisApi.analyze(resumeId);
      setAnalysis(result);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 space-y-12 overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Resume Management</h1>
          <p className="text-zinc-500 max-w-2xl leading-relaxed text-lg">
            Precision-engineered AI resume optimization. Upload your master document to generate tailored career profiles.
          </p>
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

        {/* Upload Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center space-y-8 bg-zinc-950/30">
            <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-primary/50 transition-colors duration-500">
              {isUploading ? (
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <rect x="8" y="12" width="8" height="6" rx="1" strokeWidth="1" className="fill-primary/20" />
                  <text x="9.5" y="16.5" className="fill-primary font-bold text-[6px]">PDF</text>
                </svg>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">Deploy your resume</h3>
              <p className="text-zinc-500">PDF or DOCX supported. Neural processing enabled.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-3 px-8 py-4 bg-primary text-black font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(0,242,156,0.4)] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Select Document
                </>
              )}
            </button>
          </div>
        </div>

        {/* My Vault Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              My Vault
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                [{resumes.length.toString().padStart(2, '0')}]
              </span>
            </h2>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                Filter
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                Sort
              </button>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No resumes yet</p>
              <p className="text-zinc-500 text-sm">Upload your first resume to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => (
                <div 
                  key={resume.id} 
                  onClick={() => setSelectedResume(resume)}
                  className={`group p-6 rounded-3xl bg-zinc-950 border hover:border-primary/30 hover:bg-zinc-900/50 transition-all duration-300 flex items-center justify-between relative overflow-hidden cursor-pointer ${
                    selectedResume?.id === resume.id ? 'border-primary/50 bg-zinc-900/50' : 'border-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-primary/20 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg">{resume.file_name}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          analysis && analysis.resume_id === resume.id
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {analysis && analysis.resume_id === resume.id ? 'ANALYZED' : 'MASTER'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatDate(resume.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                          {formatFileSize(resume.file_size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedResume(resume); }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold hover:border-primary/50 transition-all text-primary uppercase tracking-widest"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteResume(resume.id); }}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Preview */}
      <div className="w-[450px] border-l border-zinc-800 bg-zinc-950 flex flex-col p-6 space-y-8 sticky top-0 h-screen">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="font-bold text-sm tracking-tight">
              {selectedResume ? `Vault Preview: ${selectedResume.file_name}` : 'Select a resume'}
            </h3>
          </div>
        </div>

        {/* Preview */}
        {selectedResume ? (
          <div className="flex-1 rounded-[2rem] bg-zinc-900/50 border border-zinc-800 p-8 space-y-6 overflow-y-auto">
            {analysis ? (
              <>
                {/* Score */}
                <div className="text-center space-y-2">
                  <div className="w-24 h-24 mx-auto rounded-full bg-zinc-800 flex items-center justify-center border-4 border-primary">
                    <span className="text-3xl font-bold text-primary">{analysis.result?.score || 0}%</span>
                  </div>
                  <p className="text-zinc-400 text-sm">AI Match Score</p>
                </div>

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
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Strengths</h4>
                    <ul className="space-y-1">
                      {analysis.result.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {analysis.result?.weaknesses && analysis.result.weaknesses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Areas for Improvement</h4>
                    <ul className="space-y-1">
                      {analysis.result.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
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

                {/* Suggestions */}
                {analysis.result?.suggestions && analysis.result.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Suggestions</h4>
                    <ul className="space-y-1">
                      {analysis.result.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                <svg viewBox="0 0 24 24" className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-zinc-400">No analysis yet</p>
                <p className="text-zinc-500 text-sm">Click "Generate Optimization" to analyze this resume</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-[2rem] bg-zinc-900/50 border border-zinc-800 p-12 flex items-center justify-center">
            <p className="text-zinc-500">Select a resume to preview</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => selectedResume && handleAnalyzeResume(selectedResume.id)}
            disabled={!selectedResume || isAnalyzing}
            className="flex-1 py-4 bg-primary text-black font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs shadow-[0_0_30px_-5px_rgba(0,242,156,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              'Generate Optimization'
            )}
          </button>
          <button 
            disabled={!selectedResume}
            className="px-6 py-4 bg-zinc-900 border border-zinc-800 font-bold rounded-2xl hover:bg-zinc-800 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit Master
          </button>
        </div>
      </div>
    </div>
  );
}
