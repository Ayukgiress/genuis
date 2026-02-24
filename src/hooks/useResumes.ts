"use client";

import { useState, useCallback } from "react";
import { Resume } from "@/types";

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchResumes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setResumes([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch resumes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadResume = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newResume: Resume = {
        id: "1",
        name: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
        analysis: null,
      };
      setResumes((prev) => [...prev, newResume]);
      return newResume;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload resume"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteResume = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete resume"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    resumes,
    isLoading,
    error,
    fetchResumes,
    uploadResume,
    deleteResume,
  };
}
