"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { setAuthToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const fetchCurrentUser = useAuthStore((state: any) => state.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'client_token' && value) {
        setAuthToken(value);
        useAuthStore.setState({ token: value, isAuthenticated: true });
        break;
      }
    }
    
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
