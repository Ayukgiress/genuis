'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { kanbanApi, jobApi, ApiError, getAuthToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { KanbanBoard, KanbanCard, KanbanColumnId, Job } from '@/types';
import { KanbanBoard as KanbanBoardDnD } from './_components';

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

  const handleMoveCard = async (cardId: string, newColumnId: KanbanColumnId, newIndex: number) => {
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      await kanbanApi.updateCard(cardId, {
        column_id: newColumnId,
        status: newColumnId,
        position: newIndex,
      } as any);
      // Local state already updated optimistically by the DnD component.
    } catch (err) {
      console.error('Failed to move card:', err);
      setError('Failed to move application. Reverting.');
      // Revert by re-fetching
      if (currentBoard) await fetchCards(currentBoard.id);
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Application Pipeline</h1>
          <p className="text-zinc-500 text-base md:text-lg">Real-time AI matching and career stage tracking.</p>
        </div>
<div className="flex items-center gap-2 md:gap-4 flex-wrap">
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
    <Button variant="primary" size="sm" className="text-xs font-black uppercase tracking-widest rounded-lg">Board</Button>
    <Button variant="ghost" size="sm" className="text-xs font-black uppercase tracking-widest">List</Button>
  </div>
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

      {/* Kanban Board — smooth drag & drop */}
      {currentBoard && (
        <KanbanBoardDnD
          cards={cards}
          setCards={setCards}
          onAddCard={(col) => openCreateCardModal(col)}
          onDeleteCard={handleDeleteCard}
          onMoveCard={handleMoveCard}
        />
      )}
    </div>
  );
}
