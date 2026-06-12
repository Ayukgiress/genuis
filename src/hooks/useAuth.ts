"use client";

import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    fetchCurrentUser,
    clearError,
  } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    fetchCurrentUser,
    clearError,
  };
}
