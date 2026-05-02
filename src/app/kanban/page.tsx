'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { kanbanApi, jobApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { KanbanBoard, KanbanCard, KanbanColumnId, Job } from '@/types';

interface JobApiResponse {
  recommendations?: Job[];
  jobs?: Job[];
  data?: Job[] | { jobs: Job[] };
}

interface KanbanCardsResponse {
  cards?: KanbanCard[];
  data?: KanbanCard[] | { cards: KanbanCard[] };
}

const COLUMNS: { id: KanbanColumnId; title: string }[] = [
  { id: 'todo', title: 'WISHLIST' },
  { id: 'in_progress', title: 'APPLIED' },
  { id: 'review', title: 'INTERVIEW' },
  { id: 'done', title: 'OFFER' },
];

export default function KanbanPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<KanbanBoard | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumnId | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardCompany, setNewCardCompany] = useState('');
  const [newCardLocation, setNewCardLocation] = useState('');
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await kanbanApi.listBoards();
      // Normalize ids to strings
      const normalizedBoards = data.map(board => ({
        ...board,
        id: String(board.id),
        user_id: String(board.user_id),
      }));
      setBoards(normalizedBoards);
      if (normalizedBoards.length > 0 && !currentBoard) {
        setCurrentBoard(normalizedBoards[0]);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push('/login');
      } else {
        setError('Failed to load boards. Please make sure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, currentBoard]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !getAuthToken()) {
      router.push('/login');
      return;
    }
    fetchBoards();
  }, [authLoading, isAuthenticated, router, fetchBoards]);

  const fetchCards = async (boardId: string) => {
    try {
      const data = await kanbanApi.listCards(boardId);
      // Normalize ids to strings and handle potential column_id/status mismatch
      const normalizedCards = data.map((card: any) => ({
        ...card,
        id: String(card.id),
        board_id: String(card.board_id),
        column_id: card.column_id || card.status || 'todo',
      }));
      setCards(normalizedCards);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setCards([]);
    }
  };

  const fetchAvailableJobs = async () => {
    try {
      const data = await jobApi.search({ limit: 50 }); // Fetch up to 50 jobs
      setAvailableJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setAvailableJobs([]);
    }
  };

  useEffect(() => {
    if (currentBoard) {
      fetchCards(currentBoard.id);
    }
  }, [currentBoard]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;

    try {
      setError(null);
      const board = await kanbanApi.createBoard({ name: newBoardName });
      // Normalize ids to strings
      const normalizedBoard = {
        ...board,
        id: String(board.id),
        user_id: String(board.user_id),
      };
      setBoards(prev => [...prev, normalizedBoard]);
      setCurrentBoard(normalizedBoard);
      setNewBoardName('');
      setIsCreatingBoard(false);
      setSuccess('Board created successfully!');
    } catch (err) {
      console.error('Failed to create board:', err);
      setError('Failed to create board.');
    }
  };

  const openCreateCardModal = async (columnId?: KanbanColumnId) => {
    setIsCreatingCard(true);
    if (columnId) {
      setSelectedColumn(columnId);
    }
    await fetchAvailableJobs();
  };

  const handleJobSelect = (jobId: string) => {
    const job = availableJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setNewCardTitle(job.title);
      setNewCardCompany(job.company);
      setNewCardLocation(job.location);
    } else {
      setSelectedJob(null);
    }
  };

  const handleCreateCard = async () => {
    if (!newCardTitle.trim() || !currentBoard || !selectedColumn) return;

    try {
      setError(null);
      const card = await kanbanApi.createCard(currentBoard.id, {
        title: newCardTitle,
        column_id: selectedColumn,
        status: selectedColumn,
        company: newCardCompany,
        location: newCardLocation,
      });
      // Normalize ids to strings and handle potential column_id/status mismatch
      const normalizedCard = {
        ...(card as any),
        id: String((card as any).id),
        board_id: String((card as any).board_id),
        column_id: (card as any).column_id || (card as any).status || selectedColumn,
      };
      setCards(prev => [...prev, normalizedCard]);
      setNewCardTitle('');
      setNewCardCompany('');
      setNewCardLocation('');
      setSelectedJob(null);
      setIsCreatingCard(false);
      setSelectedColumn(null);
      setSuccess('Application added successfully!');
    } catch (err) {
      console.error('Failed to create card:', err);
      setError('Failed to create application.');
    }
  };

  const handleMoveCard = async (cardId: string, newColumnId: KanbanColumnId) => {
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) return;
      
      await kanbanApi.updateCard(cardId, { 
        column_id: newColumnId,
        status: newColumnId
      });
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, column_id: newColumnId } : c
      ));
    } catch (err) {
      console.error('Failed to move card:', err);
      setError('Failed to move application.');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await kanbanApi.deleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      setSuccess('Application deleted successfully!');
    } catch (err) {
      console.error('Failed to delete card:', err);
      setError('Failed to delete application.');
    }
  };

  const getColumnCards = (columnId: KanbanColumnId) => {
    return cards.filter(card => card.column_id === columnId);
  };

  const getColumnCount = (columnId: KanbanColumnId) => {
    return getColumnCards(columnId).length;
  };

  const getCardIcon = (columnId: KanbanColumnId) => {
    switch (columnId) {
      case 'todo':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
          </svg>
        );
      case 'review':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'done':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Application Pipeline</h1>
          <p className="text-zinc-500 text-lg">Real-time AI matching and career stage tracking.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Board Selector */}
          {boards.length > 0 && (
            <select
              value={currentBoard?.id || ''}
              onChange={(e) => {
                const board = boards.find(b => b.id === e.target.value);
                if (board) setCurrentBoard(board);
              }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-primary"
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          )}
          <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button className="px-6 py-2 bg-zinc-800 text-primary text-xs font-black rounded-lg uppercase tracking-widest">Board</button>
            <button className="px-6 py-2 text-zinc-500 text-xs font-black uppercase tracking-widest hover:text-zinc-300">List</button>
          </div>
           <button
             onClick={() => openCreateCardModal()}
             className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-widest text-xs"
           >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Application
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

      {/* Create Board Section */}
      {boards.length === 0 && !isLoading && (
        <div className="text-center py-12 space-y-4">
          <p className="text-zinc-400">No boards yet. Create your first application pipeline.</p>
          <button
            onClick={() => setIsCreatingBoard(true)}
            className="px-6 py-3 bg-primary text-black font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-widest text-xs"
          >
            Create Board
          </button>
        </div>
      )}

      {isCreatingBoard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold">Create New Board</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name (e.g., Software Engineer Jobs)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => { setIsCreatingBoard(false); setNewBoardName(''); }}
                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                className="flex-1 py-3 bg-primary text-black font-black rounded-xl hover:opacity-90 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {isCreatingCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold">Add New Application</h3>
            <div className="space-y-4">
              <select
                value={selectedJob?.id || ''}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="">Select a scraped job (optional)</option>
                {availableJobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company} - {job.location}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Job title"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                autoFocus
              />
              <input
                type="text"
                value={newCardCompany}
                onChange={(e) => setNewCardCompany(e.target.value)}
                placeholder="Company name"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={newCardLocation}
                onChange={(e) => setNewCardLocation(e.target.value)}
                placeholder="Location (e.g., Remote, San Francisco)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              />
              <select
                value={selectedColumn || ''}
                onChange={(e) => setSelectedColumn(e.target.value as KanbanColumnId)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="">Select column</option>
                {COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { setIsCreatingCard(false); setNewCardTitle(''); setNewCardCompany(''); setNewCardLocation(''); setSelectedColumn(null); setSelectedJob(null); }}
                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCard}
                disabled={!newCardTitle || !selectedColumn}
                className="flex-1 py-3 bg-primary text-black font-black rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {currentBoard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {COLUMNS.map((column) => (
            <div key={column.id} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,242,156,0.5)]" />
                  <h2 className="text-xs font-black tracking-[0.2em] text-zinc-400">
                    {column.title} <span className="ml-2 text-zinc-600 font-bold">{getColumnCount(column.id)}</span>
                  </h2>
                </div>
                <button className="text-zinc-600 hover:text-zinc-400">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {getColumnCards(column.id).map((card) => (
                  <div 
                    key={card.id} 
                    className="group p-6 rounded-[2rem] bg-zinc-950 border border-zinc-900 hover:border-primary/30 transition-all duration-500 relative overflow-hidden cursor-pointer"
                    onClick={() => handleMoveCard(card.id, column.id === 'todo' ? 'in_progress' : column.id === 'in_progress' ? 'review' : column.id === 'review' ? 'done' : 'todo')}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="relative space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary group-hover:border-primary/20 transition-colors">
                          {getCardIcon(column.id)}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                          className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{card.title}</h3>
                        <p className="text-sm text-zinc-500 font-medium">
                          {card.company || 'Unknown Company'} • {card.location || 'Unknown Location'}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-zinc-900/50 flex justify-between items-center">
                        {card.salary && (
                          <div className="text-[10px] font-black tracking-widest text-zinc-500">
                            {card.salary}
                          </div>
                        )}
                        {card.applied_at && (
                          <div className="text-[10px] font-black tracking-widest text-primary">
                            APPLIED {new Date(card.applied_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                 {column.id === 'todo' && (
                   <button
                     onClick={() => openCreateCardModal('todo')}
                     className="w-full py-4 border-2 border-dashed border-zinc-900 rounded-[2rem] text-xs font-black tracking-[0.2em] text-zinc-600 hover:border-zinc-800 hover:text-zinc-400 transition-all uppercase flex items-center justify-center gap-2"
                   >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Lead
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
