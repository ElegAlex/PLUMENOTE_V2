"use client";

/**
 * React Query hooks for note operations
 *
 * Provides data fetching and mutations for notes with caching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Note, NoteResponse, UpdateNoteInput } from "../types";

// Query key factory for notes
export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

/**
 * Fetch a single note by ID
 */
async function fetchNote(id: string): Promise<Note> {
  const response = await fetch(`/api/notes/${id}`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch note";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // Response was not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: NoteResponse = await response.json();
  return data.data;
}

/**
 * Update a note by ID
 */
async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<Note> {
  const response = await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update note";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // Response was not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: NoteResponse = await response.json();
  return data.data;
}

export interface UseNoteOptions {
  /** Whether to fetch the note immediately */
  enabled?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: Note) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to fetch and manage a single note
 *
 * @example
 * ```tsx
 * const { note, isLoading, error, updateNote } = useNote(noteId);
 *
 * // Update the note
 * updateNote({ title: "New Title" });
 * ```
 */
export function useNote(id: string, options: UseNoteOptions = {}) {
  const { enabled = true, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  // Track previous values to detect changes
  const prevDataRef = useRef<Note | undefined>(undefined);
  const prevErrorRef = useRef<Error | null>(null);

  // Query for fetching note
  // Note: refetchOnWindowFocus enabled to refresh viewCount when user returns to tab (Story 10.2 AC #4)
  const query = useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => fetchNote(id),
    enabled: enabled && !!id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true, // Override global setting for note details
  });

  // Call onSuccess only when data changes (not on every render)
  useEffect(() => {
    if (query.data && query.data !== prevDataRef.current && onSuccess) {
      onSuccess(query.data);
    }
    prevDataRef.current = query.data;
  }, [query.data, onSuccess]);

  // Call onError only when error changes (not on every render)
  useEffect(() => {
    const error = query.error as Error | null;
    if (error && error !== prevErrorRef.current && onError) {
      onError(error);
    }
    prevErrorRef.current = error;
  }, [query.error, onError]);

  // Mutation for updating note
  const mutation = useMutation({
    mutationFn: (input: UpdateNoteInput) => updateNote(id, input),
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(noteKeys.detail(id), data);
      // Invalidate list queries to refresh them
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  return {
    /** The note data */
    note: query.data,
    /** Whether the note is loading */
    isLoading: query.isLoading,
    /** Whether the note is being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Whether an update is in progress */
    isUpdating: mutation.isPending,
    /** Error if update failed */
    updateError: mutation.error as Error | null,
    /** Update the note */
    updateNote: mutation.mutate,
    /** Update the note (async) */
    updateNoteAsync: mutation.mutateAsync,
    /** Refetch the note */
    refetch: query.refetch,
  };
}
