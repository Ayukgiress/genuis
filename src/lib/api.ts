const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_BASE_URL = API_BASE_URL?.replace(/^http/, 'ws');

// Types
import type {
  Analysis, AnalysisCreate, AnalysisUpdate,
  Analytics, AnalyticsCreate,
  Resume, ResumeCreate, ResumeUpdate,
  KanbanBoard, KanbanBoardCreate, KanbanBoardUpdate,
  KanbanCard, KanbanCardCreate, KanbanCardUpdate,
  Job, JobSearchParams,
  Interview, InterviewCreate, InterviewMessage, InterviewMessageCreate,
  Letter, LetterCreate, LetterUpdate, LetterGenerateRequest
} from "@/types";

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token && token !== "null" && token !== "undefined") {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) {
    console.log('Returning in-memory token');
    return authToken;
  }

  if (typeof window !== "undefined") {
    // Check localStorage first
    const localToken = localStorage.getItem("auth_token");
    if (localToken && localToken !== "null" && localToken !== "undefined") {
      console.log('Returning localStorage token');
      return localToken;
    }

    // Check persist storage as fallback
    try {
      const persistData = localStorage.getItem("auth-storage");
      if (persistData) {
        const parsed = JSON.parse(persistData);
        // Handle both possible structures (with or without .state)
        const token = parsed.state?.token || parsed.token;
        if (token && token !== "null" && token !== "undefined") {
          console.log('Returning persist token');
          return token;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Check cookies for server-side token (client_token for JavaScript access)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'client_token' && value && value !== "null" && value !== "undefined") {
        console.log('Returning cookie token');
        return value;
      }
    }
  }
  console.log('No token found');
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
  console.log('🔑 Token check:', { endpoint, hasToken: !!token, tokenPreview: token?.substring(0, 10) });

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add authorization header if token exists
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    console.log(`Sending request to ${API_BASE_URL}${endpoint} with token: ${token.substring(0, 20)}...`);
  } else {
    console.log(`Sending request to ${API_BASE_URL}${endpoint} without token`);
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else {
        errorMessage = JSON.stringify(errorData);
      }
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
  list: () => api.get<Analysis[]>("/api/analysis/"),
  get: (analysisId: string) => api.get<Analysis>(`/api/analysis/${analysisId}/`),
  getByResume: (resumeId: string | number) => api.get<Analysis>(`/api/analysis/resume/${resumeId}/`),
  create: (data: AnalysisCreate) => api.post<Analysis>("/api/analysis/", data),
  update: (analysisId: string, data: AnalysisUpdate) => api.patch<Analysis>(`/api/analysis/${analysisId}/`, data),
  analyze: (resumeId: string | number) => api.post<Analysis>(`/api/analysis/resume/${resumeId}/analyze/`),
  getSuggestions: (resumeId: string | number, focusArea?: string) => 
    api.post<{ suggestions: string[] }>(`/api/analysis/resume/${resumeId}/suggestions/`, { focus_area: focusArea }),
};

// Analytics API
export const analyticsApi = {
  list: () => api.get<Analytics[]>("/api/analytics/"),
  create: (data: AnalyticsCreate) => api.post<Analytics>("/api/analytics/", data),
  getSummary: () => api.get<{ total_events: number; event_types: Record<string, number> }>("/api/analytics/summary/"),
};

// Resume API
export const resumeApi = {
  list: () => api.get<Resume[]>("/api/resumes/"),
  getUserResumes: () => api.get<Resume[]>("/api/resumes/"),
  get: (resumeId: string | number) => api.get<Resume>(`/api/resumes/${resumeId}/`),
  create: (data: ResumeCreate) => api.post<Resume>("/api/resumes/", data),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Resume>("/api/resumes/upload/", {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser sets it with boundary
      },
    });
  },
  update: (resumeId: string | number, data: ResumeUpdate) => api.patch<Resume>(`/api/resumes/${resumeId}/`, data),
  delete: (resumeId: string | number) => api.delete<void>(`/api/resumes/${resumeId}/`),
};

// Kanban API
export const kanbanApi = {
  // Boards
  listBoards: () => api.get<KanbanBoard[]>("/api/kanban/boards/"),
  getBoard: (boardId: string) => api.get<KanbanBoard>(`/api/kanban/boards/${boardId}/`),
  createBoard: (data: KanbanBoardCreate) => api.post<KanbanBoard>("/api/kanban/boards/", data),
  updateBoard: (boardId: string, data: KanbanBoardUpdate) => api.patch<KanbanBoard>(`/api/kanban/boards/${boardId}/`, data),
  
  // Cards
  listCards: (boardId: string) => api.get<KanbanCard[]>(`/api/kanban/boards/${boardId}/cards/`),
  getCard: (cardId: string) => api.get<KanbanCard>(`/api/kanban/cards/${cardId}/`),
  createCard: (boardId: string, data: KanbanCardCreate) => api.post<KanbanCard>(`/api/kanban/boards/${boardId}/cards/`, data),
  updateCard: (cardId: string, data: KanbanCardUpdate) => api.patch<KanbanCard>(`/api/kanban/cards/${cardId}/`, data),
  deleteCard: (cardId: string) => api.delete<void>(`/api/kanban/cards/${cardId}/`),
};

// Job Discovery API
export const jobApi = {
  search: (params?: JobSearchParams) => {
    const queryParams: Record<string, string> = {};
    if (params?.query) queryParams.query = params.query;
    if (params?.location) queryParams.location = params.location;
    if (params?.remote) queryParams.remote = 'true';
    if (params?.job_type) queryParams.job_type = params.job_type;
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    return api.get<Job[]>("/api/jobs/search/", queryParams);
  },
  getById: (jobId: string) => api.get<Job>(`/api/jobs/${jobId}/`),
  getRecommendations: (resumeId?: number) => {
    const params: Record<string, string> = {};
    if (resumeId) params.resume_id = resumeId.toString();
    return api.get<Job[]>("/api/jobs/recommendations/", params);
  },
  matchWithResume: (jobId: string, resumeId: number) => api.post<Job>(`/api/jobs/${jobId}/match/?resume_id=${resumeId}`, {}),
  addToKanban: (jobId: string, boardId: number, status?: string) =>
    api.post<KanbanCard>(`/api/jobs/${jobId}/add-to-kanban/?board_id=${boardId}&status=${status || 'todo'}`, {}),
};

// Letter API
export const letterApi = {
  list: () => api.get<Letter[]>("/api/letters/"),
  get: (letterId: number) => api.get<Letter>(`/api/letters/${letterId}/`),
  create: (data: LetterCreate) => api.post<Letter>("/api/letters/", data),
  update: (letterId: number, data: LetterUpdate) => api.patch<Letter>(`/api/letters/${letterId}/`, data),
  delete: (letterId: number) => api.delete<void>(`/api/letters/${letterId}/`),
  generate: (data: LetterGenerateRequest) => api.post<Letter>("/api/letters/generate/", data),
};

// Interview API
export const interviewApi = {
  list: () => api.get<Interview[]>("/api/interviews/"),
  get: (interviewId: number) => api.get<Interview>(`/api/interviews/${interviewId}/`),
  create: (data: InterviewCreate) => api.post<Interview>("/api/interviews/", data),
  delete: (interviewId: number) => api.delete<void>(`/api/interviews/${interviewId}/`),
  complete: (interviewId: number) => api.post<{ message: string; interview: Interview }>(`/api/interviews/${interviewId}/complete/`, {}),
  sendMessage: (interviewId: number, data: InterviewMessageCreate) =>
    api.post<InterviewMessage>(`/api/interviews/${interviewId}/messages/`, data),
  getMessages: (interviewId: number) => api.get<InterviewMessage[]>(`/api/interviews/${interviewId}/messages/`),
  getTalkUrl: (interviewId: number) => `${WS_BASE_URL}/api/interviews/${interviewId}/talk`,
};
