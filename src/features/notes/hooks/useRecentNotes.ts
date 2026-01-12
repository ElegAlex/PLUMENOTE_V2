"use client";

/**
 * React Query hook for recently viewed and modified notes
 *
 * Story 6.4: Notes Récentes - Fetch recent notes for homepage and command palette
 *
 * @see AC #1: Display 5 recently viewed and 5 recently modified notes
 * @see AC #3: Click to navigate directly to note
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "./useNote";

/**
 * Type for a note in the recent notes response
 */
export interface RecentNote {
  id: string;
  title: string;
  folderId: string | null;
  updatedAt: string;
  viewedAt?: string; // Only present for recently viewed notes
}

/**
 * Response type from /api/notes/recent
 */
export interface RecentNotesResponse {
  data: {
    recentlyViewed: RecentNote[];
    recentlyModified: RecentNote[];
  };
}

/**
 * Query key for recent notes
 * Separate from regular notes list to avoid conflicts
 */
export const recentNotesKeys = {
  all: [...noteKeys.all, "recent"] as const,
};

/**
 * Fetch recent notes from API
 */
async function fetchRecentNotes(): Promise<RecentNotesResponse["data"]> {
  const response = await fetch("/api/notes/recent");

  if (!response.ok) {
    let errorMessage = "Failed to fetch recent notes";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: RecentNotesResponse = await response.json();
  return data.data;
}

export interface UseRecentNotesOptions {
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Hook to fetch recently viewed and modified notes
 *
 * @example
 * ```tsx
 * const { recentlyViewed, recentlyModified, isLoading } = useRecentNotes();
 *
 * // Display recently viewed notes
 * recentlyViewed.map(note => (
 *   <NoteCard key={note.id} note={note} timestamp={note.viewedAt} />
 * ));
 *
 * // Display recently modified notes
 * recentlyModified.map(note => (
 *   <NoteCard key={note.id} note={note} timestamp={note.updatedAt} />
 * ));
 * ```
 */
export function useRecentNotes(options: UseRecentNotesOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: recentNotesKeys.all,
    queryFn: fetchRecentNotes,
    enabled,
    staleTime: 30 * 1000, // 30 seconds - recent notes can change frequently
  });

  return {
    /** Notes recently viewed by the user (by viewedAt timestamp) */
    recentlyViewed: query.data?.recentlyViewed ?? [],
    /** Notes recently modified by the user (by updatedAt timestamp) */
    recentlyModified: query.data?.recentlyModified ?? [],
    /** Whether data is loading */
    isLoading: query.isLoading,
    /** Whether data is being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Refetch recent notes */
    refetch: query.refetch,
    /** Invalidate recent notes cache (useful after tracking a view) */
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: recentNotesKeys.all }),
  };
}
