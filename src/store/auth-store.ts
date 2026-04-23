import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, setAuthToken, getAuthToken, ApiError } from "@/lib/api";
import type { AuthUser, Token, UserCreate, VerificationResponse, RegisterResponse, GoogleOAuthResponse } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  showVerificationMessage: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  verifyEmail: (token: string) => Promise<VerificationResponse>;
  resendVerification: (email: string) => Promise<VerificationResponse>;
  loginWithGoogle: () => Promise<void>;
  handleGoogleCallback: (code: string) => Promise<void>;
  setShowVerificationMessage: (show: boolean) => void;
  setIsNewUser: (isNew: boolean) => void;
  getRedirectPath: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      isEmailVerified: false,
      showVerificationMessage: false,
      isNewUser: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Use OAuth2 form data format for login
          const tokenData: Token = await api.postForm<Token>(
            "/auth/token/",
            {
              username: email,
              password: password,
            }
          );

          // Store token
          setAuthToken(tokenData.access_token);
          set({ token: tokenData.access_token, isAuthenticated: true, isNewUser: false });

          // Fetch current user
          await get().fetchCurrentUser();
        } catch (error) {
          const message = error instanceof ApiError 
            ? error.message 
            : error instanceof Error 
              ? error.message 
              : "Login failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        setAuthToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isEmailVerified: false,
          showVerificationMessage: false,
          isNewUser: false,
        });
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null, showVerificationMessage: false });
        try {
          const response: RegisterResponse = await api.post<RegisterResponse>("/auth/register/", {
            email,
            password,
            name,
          } as UserCreate);

          // Mark as new user for plan selection
          set({ isNewUser: true });

          // Show verification message instead of auto-login
          set({
            isLoading: false,
            showVerificationMessage: true,
            isEmailVerified: false
          });
        } catch (error) {
          const message = error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Registration failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          // Backend expects token as query parameter
          const response: VerificationResponse = await api.post<VerificationResponse>(
            `/auth/verify-email/?token=${encodeURIComponent(token)}`
          );
          
          set({ isLoading: false, isEmailVerified: true });
          return response;
        } catch (error) {
          const message = error instanceof ApiError 
            ? error.message 
            : error instanceof Error 
              ? error.message 
              : "Email verification failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      resendVerification: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          // Backend expects email as query parameter
          const response: VerificationResponse = await api.post<VerificationResponse>(
            `/auth/resend-verification?email=${encodeURIComponent(email)}`
          );
          
          set({ isLoading: false });
          return response;
        } catch (error) {
          const message = error instanceof ApiError 
            ? error.message 
            : error instanceof Error 
              ? error.message 
              : "Failed to resend verification email";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          // Pass the frontend redirect URI to the backend
          const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/google/callback` : "";
          const response: GoogleOAuthResponse = await api.get<GoogleOAuthResponse>(
            `/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`
          );
          
          // Redirect to Google OAuth authorization URL
          if (response.authorization_url) {
            window.location.href = response.authorization_url;
          }
        } catch (error) {
          const message = error instanceof ApiError 
            ? error.message 
            : error instanceof Error 
              ? error.message 
              : "Failed to initiate Google login";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      handleGoogleCallback: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get the code from URL and call the callback endpoint
          // Use the same redirect URI used in the initial step
          const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/google/callback` : "";
          const response = await api.get<{ access_token: string; user: AuthUser }>(
            `/auth/google/callback?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
          );

          // Store token
          setAuthToken(response.access_token);
          set({
            token: response.access_token,
            isAuthenticated: true,
            user: response.user,
            isNewUser: false,
            isLoading: false
          });
        } catch (error) {
          const message = error instanceof ApiError 
            ? error.message 
            : error instanceof Error 
              ? error.message 
              : "Google login failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      setShowVerificationMessage: (show: boolean) => {
        set({ showVerificationMessage: show });
      },

      fetchCurrentUser: async () => {
        const token = getAuthToken();
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const user: AuthUser = await api.get<AuthUser>("/auth/me");
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // Token might be invalid
          setAuthToken(null);
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      getRedirectPath: () => {
        const { user, isNewUser } = get();
        if (!user) return '/login';

        // Only redirect new users to plans if they don't have a subscription plan
        if (isNewUser && !user.subscription_plan) {
          return '/plans';
        }

        // Otherwise, go to dashboard
        return '/dashboard';
      },

      clearError: () => set({ error: null }),

      setIsNewUser: (isNew: boolean) => set({ isNewUser: isNew }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
