// User Types
export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

// Auth Types (matching backend)
export interface UserCreate {
  email: string;
  password: string;
  name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  is_verified?: boolean;
  created_at?: string;
}

// Email verification
export interface VerificationResponse {
  message: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

// Google OAuth
export interface GoogleOAuthResponse {
  authorization_url: string;
}

export interface GoogleOAuthCallbackResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

// Resume Types
export interface Resume {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  analysis: ResumeAnalysis | null;
}

export interface ResumeAnalysis {
  id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywords: string[];
  analyzedAt: Date;
}

// Kanban Types
export type KanbanColumnId = "todo" | "in_progress" | "review" | "done";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  salary?: string;
  appliedAt?: Date;
  columnId: KanbanColumnId;
}

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  cards: KanbanCard[];
}

// Application Types
export interface JobApplication {
  id: string;
  position: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: Date;
  notes: string;
}

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected";

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Dashboard Types
export interface DashboardStats {
  totalResumes: number;
  totalApplications: number;
  averageScore: number;
  interviewsLanded: number;
}

// Analysis Types
export type FocusArea = "summary" | "experience" | "skills" | "education";

export interface AnalysisResult {
  score?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  keywords?: string[];
  [key: string]: unknown;
}

export interface Analysis {
  id: string;
  resume_id: string;
  status: "pending" | "completed" | "failed";
  result?: AnalysisResult;
  feedback?: string;
  created_at: string;
  updated_at?: string;
}

export interface AnalysisCreate {
  resume_id: string;
  status?: "pending" | "completed" | "failed";
  result?: AnalysisResult;
  feedback?: string;
}

export interface AnalysisUpdate {
  status?: "pending" | "completed" | "failed";
  result?: AnalysisResult;
  feedback?: string;
}

// Analytics Types
export type AnalyticsEventType = 
  | "resume_uploaded"
  | "resume_analyzed"
  | "application_created"
  | "application_updated"
  | "dashboard_viewed"
  | "search_performed";

export interface Analytics {
  id: number;
  user_id: number;
  event_type: AnalyticsEventType;
  event_data?: Record<string, unknown>;
  created_at: string;
}

export interface AnalyticsCreate {
  event_type: AnalyticsEventType;
  event_data?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  total_events: number;
  event_types: Record<string, number>;
}

// Resume Types
export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path?: string;
  content?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  updated_at?: string;
}

export interface ResumeCreate {
  file_name: string;
  file_path?: string;
  content?: string;
}

export interface ResumeUpdate {
  file_name?: string;
  file_path?: string;
  content?: string;
}

// Kanban Types
export type KanbanColumnId = "todo" | "in_progress" | "review" | "done";

export interface KanbanBoard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface KanbanBoardCreate {
  name: string;
  description?: string;
}

export interface KanbanBoardUpdate {
  name?: string;
  description?: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  title: string;
  description?: string;
  column_id: KanbanColumnId;
  position: number;
  company?: string;
  location?: string;
  salary?: string;
  applied_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface KanbanCardCreate {
  title: string;
  description?: string;
  column_id?: KanbanColumnId;
  position?: number;
  company?: string;
  location?: string;
  salary?: string;
  applied_at?: string;
}

export interface KanbanCardUpdate {
  title?: string;
  description?: string;
  column_id?: KanbanColumnId;
  position?: number;
  company?: string;
  location?: string;
  salary?: string;
  applied_at?: string;
}
