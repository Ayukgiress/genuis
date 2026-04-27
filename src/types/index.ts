// User Types
export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
}

export interface CareerPreferences {
  desired_roles?: string[];
  min_salary?: number;
  work_mode?: "remote" | "hybrid" | "onsite";
  relocation?: boolean;
  preferred_locations?: string[];
  job_types?: string[];
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
  subscription_plan?: 'free' | 'pro';
  subscription_status?: 'active' | 'inactive' | 'past_due' | 'cancelled';
  stripe_customer_id?: string;
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

// Resume Analysis Types
export interface ResumeAnalysis {
  id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywords: string[];
  analyzedAt: Date;
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
  resume_id: number;
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
  id: number;
  user_id: number;
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

// Letter Types
export type LetterType = 'cover_letter' | 'thank_you_letter' | 'follow_up_letter' | 'custom_letter';

export interface Letter {
  id: number;
  user_id: number;
  title: string;
  recipient: string;
  content: string;
  letter_type: LetterType;
  created_at: string;
  updated_at?: string;
}

export interface LetterCreate {
  title: string;
  recipient: string;
  content: string;
  letter_type: LetterType;
}

export interface LetterUpdate {
  title?: string;
  recipient?: string;
  content?: string;
  letter_type?: LetterType;
}

export interface LetterGenerateRequest {
  job_title: string;
  company_name: string;
  recipient_name?: string;
  resume_id?: number;
  letter_type: LetterType;
  custom_instructions?: string;
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

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary_range?: string;
  job_type?: string;
  source: string;
  source_url: string;
  posted_at: string;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  remote?: boolean;
  job_type?: string;
  min_salary?: number;
  page?: number;
  limit?: number;
}

// Interview Types
export interface Interview {
  id: number;
  user_id: number;
  job_id: number;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at?: string;
  messages?: InterviewMessage[];
}

export interface InterviewCreate {
  job_id: string;
  status?: "active" | "completed" | "cancelled";
}

export interface InterviewMessage {
  id: number;
  interview_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface InterviewMessageCreate {
  role: "user" | "assistant";
  content: string;
}

export interface InterviewStartRequest {
  job_id: number;
  resume_content?: string;
}
