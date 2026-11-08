"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { setAuthToken } from "@/lib/api";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const syncToken = () => {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'client_token' && value) {
          setAuthToken(value);
          useAuthStore.setState({ token: value, isAuthenticated: true });
          return;
        }
      }
      const state = useAuthStore.getState();
      if (state.token) setAuthToken(state.token);
    };

    const checkAuth = async () => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;
      syncToken();
      await useAuthStore.getState().fetchCurrentUser();
      setAuthChecked(true);
    };

    checkAuth();
    setMounted(true);
  }, []);

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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
