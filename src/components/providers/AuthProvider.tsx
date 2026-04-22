"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { setAuthToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const fetchCurrentUser = useAuthStore((state: any) => state.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);

    // Sync token from localStorage/store to the API module on mount
    const syncToken = () => {
      // Try cookies first
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'client_token' && value) {
          setAuthToken(value);
          useAuthStore.setState({ token: value, isAuthenticated: true });
          return;
        }
      }

      // Then try store state (hydrated by persist)
      const state = useAuthStore.getState();
      if (state.token) {
        setAuthToken(state.token);
      }
    };

    const checkAuth = async () => {
      syncToken();
      await fetchCurrentUser();
      setAuthChecked(true);
    };

    checkAuth();
  }, [fetchCurrentUser]);

  if (!mounted || !authChecked) {
    // Show loading while checking authentication
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
