import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { ApplicationStatus } from "@/types";

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

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: [],
      isLoading: false,
      error: null,

      addApplication: async (appData) => {
        set({ isLoading: true, error: null });
        try {
          const newApp: Application = {
            ...appData,
            id: Math.random().toString(36).substring(7),
            appliedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            applications: [newApp, ...state.applications],
            isLoading: false,
          }));

          if (typeof window !== 'undefined') {
            try {
              const existing = localStorage.getItem('interview-prep-jobs');
              const prepJobs = existing ? JSON.parse(existing) : [];
              if (!prepJobs.includes(appData.jobId)) {
                prepJobs.push(appData.jobId);
                localStorage.setItem('interview-prep-jobs', JSON.stringify(prepJobs));
              }
            } catch (e) {
              console.warn('Could not update interview prep cache', e);
            }
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      updateApplicationStatus: async (id, status) => {
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id ? { ...app, status } : app
          ),
        }));
      },

      fetchApplications: async () => {
        set({ isLoading: true, error: null });
        try {
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      getApplicationByJobId: (jobId: string) => {
        return get().applications.find(app => app.jobId === jobId);
      },
    }),
    {
      name: "application-storage",
    }
  )
);
