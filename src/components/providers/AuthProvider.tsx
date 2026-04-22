"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { setAuthToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
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

    syncToken();
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
