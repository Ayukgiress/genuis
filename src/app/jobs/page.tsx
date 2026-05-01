'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jobApi, resumeApi, analysisApi, kanbanApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Job, Resume, Analysis } from '@/types';
import { ApplyJobModal } from '@/components/jobs/ApplyJobModal';

export default function JobsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [jobType, setJobType] = useState('');
  const [page, setPage] = useState(1);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [boards, setBoards] = useState<any[]>([]);

  const loadRecommendations = useCallback(async (resumeId?: number) => {
    try {
      setIsLoading(true);
      setError(null);

const data = await jobApi.getRecommendations(resumeId);
      console.log('Jobs API response:', data);
      let jobsArray: Job[] = [];
      if (Array.isArray(data)) {
        jobsArray = data;
      } else if (data && typeof data === 'object') {
        jobsArray = (data as any).jobs || (data as any).data?.jobs || (data as any).data || [];
        if (!Array.isArray(jobsArray)) {
          jobsArray = [];
        }
      }
      setJobs(jobsArray);
      setSuccess(resumeId ? 'Job recommendations loaded based on your resume!' : 'General job listings loaded');
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push('/login');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to get recommendations');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router]);

  const getRecommendations = async () => {
    const resumeId = selectedResume?.id;
    await loadRecommendations(resumeId);
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const resumesData = await resumeApi.list();
      setResumes(resumesData);

      const boardsData = await kanbanApi.listBoards();
      setBoards(boardsData);

      if (resumesData.length > 0) {
        setSelectedResume(resumesData[0]);
        // Load recommendations based on the first resume
        await loadRecommendations(resumesData[0].id);
      } else {
        // No resumes, load general jobs or show empty state
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push('/login');
      } else {
        setError('Failed to load data. Please make sure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, loadRecommendations]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, isAuthenticated, router, fetchData]);

  useEffect(() => {
    if (selectedResume) {
      fetchAnalysis(selectedResume.id);
      // Load recommendations when resume changes
      loadRecommendations(selectedResume.id);
    }
  }, [selectedResume, loadRecommendations]);

  const fetchAnalysis = async (resumeId: number) => {
    try {
      const analysisData = await analysisApi.getByResume(resumeId);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Analysis fetch failed:', err);
      setAnalysis(null);
    }
  };

  const searchJobs = async (query: string) => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = { page: '1', limit: '20' };
      
      if (query) params.query = query;
      if (location) params.location = location;
      if (remoteOnly) params.remote = 'true';
      if (jobType) params.job_type = jobType;
      
      const data = await jobApi.search(params);
      setJobs(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to search jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    searchJobs(searchQuery);
  };

  const handleMatchJob = async (job: Job) => {
    if (!selectedResume) {
      setError('Please select a resume first');
      return;
    }

    try {
      setIsMatching(true);
      setError(null);
      
      const matched = await jobApi.matchWithResume(job.id, selectedResume.id);
      
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...matched } : j));
      setSuccess(`Matched "${job.title}" with your resume! Score: ${matched.match_score || 'N/A'}%`);
    } catch (err) {
      console.error('Failed to match job:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to match job with resume');
      }
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddToKanban = async (job: Job) => {
    if (boards.length === 0) {
      setError('No kanban boards available. Please create a board first.');
      return;
    }

    try {
      setError(null);
      await jobApi.addToKanban(job.id, parseInt(boards[0].id), 'todo');
      setSuccess(`"${job.title}" added to your kanban board!`);
    } catch (err) {
      console.error('Failed to add to kanban:', err);
      setError('Failed to add job to kanban board.');
    }
  };

  const handleOpenApplyModal = (job: Job) => {
    setSelectedJobForApply(job);
    setShowApplyModal(true);
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setSelectedJobForApply(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] bg-black text-white overflow-hidden">
      <div className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Job Discovery</h1>
          <p className="text-zinc-500 max-w-2xl leading-relaxed text-lg">
            Find your perfect role. Jobs matched to your resume using AI.
          </p>
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

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs by title, skill, or keyword..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="w-48">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="w-40 bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-primary transition-all cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Search
          </button>
           <button
             onClick={getRecommendations}
             disabled={isLoading}
             className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Recommendations
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Available Jobs</h2>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {jobs.length} Jobs Found
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <p className="text-zinc-400 mb-2">No jobs found</p>
              <p className="text-zinc-500 text-sm">Try adjusting your search criteria or get AI recommendations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 hover:border-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{job.title}</h3>
                        {job.match_score !== undefined && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            job.match_score >= 80 
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : job.match_score >= 50
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {job.match_score}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm mb-3">{job.company} • {job.location}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.job_type && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400">
                            {job.job_type}
                          </span>
                        )}
                        {job.salary_range && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400">
                            {job.salary_range}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400">
                          {job.source}
                        </span>
                      </div>
                      {job.matched_skills && job.matched_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-[10px] text-zinc-500">Matched:</span>
                          {job.matched_skills.map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {job.missing_skills && job.missing_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] text-zinc-500">Missing:</span>
                          {job.missing_skills.map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleMatchJob(job)}
                        disabled={isMatching || !selectedResume}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition-all text-xs disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Match
                      </button>
                       <button
                         onClick={() => handleOpenApplyModal(job)}
                         className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold hover:border-primary/50 transition-all text-center"
                       >
                         Apply
                       </button>
                       <button
                         onClick={() => handleAddToKanban(job)}
                         disabled={boards.length === 0}
                         className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 text-center"
                       >
                         <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                           <line x1="12" y1="5" x2="12" y2="19" />
                           <line x1="5" y1="12" x2="19" y2="12" />
                         </svg>
                         Add to Kanban
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
                    <span>Posted {formatDate(job.posted_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-[350px] border-l border-zinc-800 bg-zinc-950 flex flex-col p-6 space-y-6 sticky top-0 h-screen">
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Select Resume</h3>
          <p className="text-xs text-zinc-500">Choose a resume to match with jobs</p>
        </div>

        {resumes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-zinc-400 mb-2">No resumes yet</p>
            <button
              onClick={() => router.push('/resumes')}
              className="text-primary text-sm hover:underline"
            >
              Upload a resume
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <button
                key={resume.id}
                onClick={() => setSelectedResume(resume)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedResume?.id === resume.id
                    ? 'bg-zinc-900 border border-primary/50'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{resume.file_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{new Date(resume.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedResume && analysis && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold">Resume Analysis</h4>
              <span className="text-lg font-bold text-primary">{analysis.result?.score || 0}%</span>
            </div>
            {analysis.result?.strengths && analysis.result.strengths.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase">Top Skills</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.result.strengths.slice(0, 3).map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => router.push('/settings')}
          className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
        >
          Edit Profile Settings
        </button>
      </div>

      <ApplyJobModal
        isOpen={showApplyModal}
        onClose={handleCloseApplyModal}
        job={selectedJobForApply}
        resumes={resumes}
      />
    </div>
  );
}
