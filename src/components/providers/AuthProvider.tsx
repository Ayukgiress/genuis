"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);
    // Fetch current user on mount to restore session
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Prevent hydration mismatch by rendering nothing until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
