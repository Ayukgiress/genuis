const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Types
import type { 
  Analysis, AnalysisCreate, AnalysisUpdate, 
  Analytics, AnalyticsCreate,
  Resume, ResumeCreate, ResumeUpdate,
  KanbanBoard, KanbanBoardCreate, KanbanBoardUpdate,
  KanbanCard, KanbanCardCreate, KanbanCardUpdate
} from "@/types";

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const token = getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add authorization header if token exists
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(errorMessage, response.status, response.statusText);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(data) }),

  // For OAuth2 form data requests (login)
  postForm: <T>(endpoint: string, data: Record<string, string>) =>
    request<T>(endpoint, { 
      method: "POST", 
      body: new URLSearchParams(data).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

export { ApiError };

// Analysis API
export const analysisApi = {
  list: () => api.get<Analysis[]>("/analysis/"),
  get: (analysisId: string) => api.get<Analysis>(`/analysis/${analysisId}`),
  getByResume: (resumeId: string | number) => api.get<Analysis>(`/analysis/resume/${resumeId}`),
  create: (data: AnalysisCreate) => api.post<Analysis>("/analysis/", data),
  update: (analysisId: string, data: AnalysisUpdate) => api.patch<Analysis>(`/analysis/${analysisId}`, data),
  analyze: (resumeId: string | number) => api.post<Analysis>(`/analysis/resume/${resumeId}/analyze`),
  getSuggestions: (resumeId: string | number, focusArea?: string) => 
    api.post<{ suggestions: string[] }>(`/analysis/resume/${resumeId}/suggestions`, { focus_area: focusArea }),
};

// Analytics API
export const analyticsApi = {
  list: () => api.get<Analytics[]>("/analytics/"),
  create: (data: AnalyticsCreate) => api.post<Analytics>("/analytics/", data),
  getSummary: () => api.get<{ total_events: number; event_types: Record<string, number> }>("/analytics/summary"),
};

// Resume API
export const resumeApi = {
  list: () => api.get<Resume[]>("/resumes/"),
  get: (resumeId: string | number) => api.get<Resume>(`/resumes/${resumeId}`),
  create: (data: ResumeCreate) => api.post<Resume>("/resumes/", data),
  update: (resumeId: string | number, data: ResumeUpdate) => api.patch<Resume>(`/resumes/${resumeId}`, data),
  delete: (resumeId: string | number) => api.delete<void>(`/resumes/${resumeId}`),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload resume');
    }
    return response.json();
  },
};

// Kanban API
export const kanbanApi = {
  // Boards
  listBoards: () => api.get<KanbanBoard[]>("/kanban/boards"),
  getBoard: (boardId: string) => api.get<KanbanBoard>(`/kanban/boards/${boardId}`),
  createBoard: (data: KanbanBoardCreate) => api.post<KanbanBoard>("/kanban/boards", data),
  updateBoard: (boardId: string, data: KanbanBoardUpdate) => api.patch<KanbanBoard>(`/kanban/boards/${boardId}`, data),
  
  // Cards
  listCards: (boardId: string) => api.get<KanbanCard[]>(`/kanban/boards/${boardId}/cards`),
  getCard: (cardId: string) => api.get<KanbanCard>(`/kanban/cards/${cardId}`),
  createCard: (boardId: string, data: KanbanCardCreate) => api.post<KanbanCard>(`/kanban/boards/${boardId}/cards`, data),
  updateCard: (cardId: string, data: KanbanCardUpdate) => api.patch<KanbanCard>(`/kanban/cards/${cardId}`, data),
  deleteCard: (cardId: string) => api.delete<void>(`/kanban/cards/${cardId}`),
};
