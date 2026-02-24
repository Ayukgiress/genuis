// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
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
export type KanbanColumnId = "todo" | "in-progress" | "review" | "done";

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
