import { create } from "zustand";
import { persist } from "zustand/middleware";
import { kanbanApi } from "@/lib/api";
import { ApplicationStatus } from "@/types";

// Map our ApplicationStatus to kanban column ids
const STATUS_TO_COLUMN: Record<ApplicationStatus, string> = {
  wishlist: "todo",
  applied: "in_progress",
  screening: "in_progress",
  interview: "review",
  offer: "done",
  rejected: "todo",
};

const COLUMN_TO_STATUS: Record<string, ApplicationStatus> = {
  todo: "wishlist",
  in_progress: "applied",
  review: "interview",
  done: "offer",
};

interface Application {
  id: string;
  jobId: string;
  resumeId: string;
  status: ApplicationStatus;
  company: string;
  title: string;
  logo?: string;
  appliedAt: string;
  interviewDate?: string;
  // kanban card id for backend sync
  kanbanCardId?: string;
  kanbanBoardId?: string;
}

interface ApplicationState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  addApplication: (application: Omit<Application, "id" | "appliedAt">) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  fetchApplications: () => Promise<void>;
  getApplicationByJobId: (jobId: string) => Application | undefined;
}

// Get or create the default kanban board id, cached in memory
let _defaultBoardId: string | null = null;
async function getDefaultBoardId(): Promise<string | null> {
  if (_defaultBoardId) return _defaultBoardId;
  try {
    const boards = await kanbanApi.listBoards();
    if (boards.length > 0) {
      _defaultBoardId = String(boards[0].id);
      return _defaultBoardId;
    }
    // Create a default board if none exist
    const created = await kanbanApi.createBoard({ name: "Job Applications" });
    _defaultBoardId = String(created.id);
    return _defaultBoardId;
  } catch {
    return null;
  }
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: [],
      isLoading: false,
      error: null,

      addApplication: async (appData) => {
        // Optimistic local add first so UI is instant
        const localId = Math.random().toString(36).substring(7);
        const newApp: Application = {
          ...appData,
          id: localId,
          appliedAt: new Date().toISOString(),
        };
        set((state) => ({ applications: [newApp, ...state.applications] }));

        // Sync to kanban board in background
        try {
          const boardId = await getDefaultBoardId();
          if (boardId) {
            const column = STATUS_TO_COLUMN[appData.status] ?? "in_progress";
            const card = await kanbanApi.createCard(boardId, {
              title: appData.title,
              company: appData.company,
              column_id: column as "todo" | "in_progress" | "review" | "done",
              status: column as "todo" | "in_progress" | "review" | "done",
            });
            // Update the local entry with the real kanban ids
            set((state) => ({
              applications: state.applications.map((a) =>
                a.id === localId
                  ? { ...a, kanbanCardId: String(card.id), kanbanBoardId: boardId }
                  : a
              ),
            }));
          }
        } catch (e) {
          console.warn("Could not sync application to kanban board:", e);
        }

        // Update interview prep cache
        if (typeof window !== "undefined") {
          try {
            const existing = localStorage.getItem("interview-prep-jobs");
            const prepJobs = existing ? JSON.parse(existing) : [];
            if (!prepJobs.includes(appData.jobId)) {
              prepJobs.push(appData.jobId);
              localStorage.setItem("interview-prep-jobs", JSON.stringify(prepJobs));
            }
          } catch (e) {
            console.warn("Could not update interview prep cache", e);
          }
        }
      },

      updateApplicationStatus: async (id, status) => {
        // Optimistic local update
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id ? { ...app, status } : app
          ),
        }));

        // Sync to kanban if we have a card id
        const app = get().applications.find((a) => a.id === id);
        if (app?.kanbanCardId) {
          const column = STATUS_TO_COLUMN[status] ?? "in_progress";
          try {
            await kanbanApi.updateCard(app.kanbanCardId, {
              column_id: column as "todo" | "in_progress" | "review" | "done",
              status: column as "todo" | "in_progress" | "review" | "done",
            });
          } catch (e) {
            console.warn("Could not sync status update to kanban:", e);
          }
        }
      },

      fetchApplications: async () => {
        set({ isLoading: true, error: null });
        try {
          const boardId = await getDefaultBoardId();
          if (!boardId) {
            set({ isLoading: false });
            return;
          }
          const cards = await kanbanApi.listCards(boardId);
          const synced: Application[] = cards.map((card) => {
            const colId = (card.column_id ?? (card as unknown as { status?: string }).status ?? "todo") as string;
            const status: ApplicationStatus = COLUMN_TO_STATUS[colId] ?? "applied";
            // Try to match with an existing local entry by kanbanCardId
            const existing = get().applications.find((a) => a.kanbanCardId === String(card.id));
            return {
              id: existing?.id ?? String(card.id),
              jobId: existing?.jobId ?? String(card.id),
              resumeId: existing?.resumeId ?? "",
              status,
              company: card.company ?? "",
              title: card.title,
              appliedAt: card.applied_at ?? card.created_at,
              kanbanCardId: String(card.id),
              kanbanBoardId: boardId,
            };
          });
          set({ applications: synced, isLoading: false });
        } catch (error) {
          // Fall back to whatever is in localStorage — don't wipe it
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      getApplicationByJobId: (jobId: string) => {
        return get().applications.find((app) => app.jobId === jobId);
      },
    }),
    {
      name: "application-storage",
    }
  )
);
