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
          // In a real app, this would be an API call
          // For now, we'll simulate it and update the local state
          const newApp: Application = {
            ...appData,
            id: Math.random().toString(36).substring(7),
            appliedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            applications: [newApp, ...state.applications],
            isLoading: false,
          }));
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
          // Fetch from API if available
          // const response = await api.get<Application[]>("/applications");
          // set({ applications: response, isLoading: false });
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
    }),
    {
      name: "application-storage",
    }
  )
);
