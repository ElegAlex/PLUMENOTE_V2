"use client";

/**
 * React Query hook for tracking note views
 *
 * Story 6.4: Notes Récentes - Track when user views a note
 * Story 10.1: Enhanced with viewCount tracking and deduplication
 *
 * @see AC #2: Track views automatically when note is opened
 * @see AC #4: Only one entry per note (upsert behavior)
 * @see Story 10.1: Deduplication (1 view/user/hour) and viewCount tracking
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useCallback } from "react";
import { recentNotesKeys } from "./useRecentNotes";

/**
 * Response from tracking a view
 * @see Story 10.1: Enhanced response with counted flag and viewCount
 */
interface TrackViewResponse {
  data: {
    /** Whether the view was counted (false if deduplicated within 1 hour) */
    counted: boolean;
    /** Current total view count for the note */
    viewCount: number;
  };
}

/**
 * Track a note view via API
 *
 * Throws on error - the mutation's onError handler will catch and log it.
 * This ensures errors are properly propagated but handled gracefully.
 */
async function trackNoteView(noteId: string): Promise<TrackViewResponse["data"]> {
  const response = await fetch(`/api/notes/${noteId}/view`, {
    method: "POST",
  });

  if (!response.ok) {
    // Log warning for debugging, then throw so mutation onError handles it
    console.warn(`Failed to track note view for ${noteId}:`, response.status);
    throw new Error(`Failed to track view: ${response.status}`);
  }

  const data: TrackViewResponse = await response.json();
  return data.data;
}

export interface UseTrackNoteViewOptions {
  /** Whether to track automatically on mount (default: true) */
  autoTrack?: boolean;
}

/**
 * Hook to track note views
 *
 * Automatically tracks view on mount (once per component lifecycle).
 * Uses a ref to prevent duplicate tracking during React StrictMode double-mount.
 *
 * @example
 * ```tsx
 * // In note page component
 * function NotePage({ noteId }: { noteId: string }) {
 *   useTrackNoteView(noteId);
 *   // ... rest of component
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Manual tracking
 * function NotePage({ noteId }: { noteId: string }) {
 *   const { trackView, isTracking } = useTrackNoteView(noteId, { autoTrack: false });
 *
 *   useEffect(() => {
 *     // Track after some condition
 *     if (someCondition) {
 *       trackView();
 *     }
 *   }, [someCondition, trackView]);
 * }
 * ```
 */
export function useTrackNoteView(
  noteId: string | undefined,
  options: UseTrackNoteViewOptions = {}
) {
  const { autoTrack = true } = options;
  const queryClient = useQueryClient();
  const trackedRef = useRef(false);
  const previousNoteIdRef = useRef<string | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: trackNoteView,
    onSuccess: (data, noteId) => {
      // Invalidate recent notes cache so the new view appears
      queryClient.invalidateQueries({ queryKey: recentNotesKeys.all });

      // Story 10.1: If view was counted, also invalidate the note detail
      // to update viewCount in the UI
      if (data.counted) {
        queryClient.invalidateQueries({ queryKey: ["notes", "detail", noteId] });
      }
    },
    // Don't throw on error - view tracking is non-critical
    onError: (error) => {
      console.warn("Failed to track note view:", error);
    },
  });

  // Create stable mutate callback to avoid useEffect dependency issues
  // (mutation object changes identity on every render)
  const stableMutate = useCallback(
    (id: string) => mutation.mutate(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation.mutate is stable
    []
  );

  // Reset tracked state when noteId changes
  useEffect(() => {
    if (noteId !== previousNoteIdRef.current) {
      trackedRef.current = false;
      previousNoteIdRef.current = noteId;
    }
  }, [noteId]);

  // Auto-track on mount (once per noteId)
  useEffect(() => {
    if (autoTrack && noteId && !trackedRef.current) {
      trackedRef.current = true;
      stableMutate(noteId);
    }
  }, [autoTrack, noteId, stableMutate]);

  return {
    /** Manually track a view (useful when autoTrack is false) */
    trackView: () => {
      if (noteId && !trackedRef.current) {
        trackedRef.current = true;
        stableMutate(noteId);
      }
    },
    /** Whether view is currently being tracked */
    isTracking: mutation.isPending,
    /** Error if tracking failed (usually null - errors are silently handled) */
    error: mutation.error as Error | null,
    /** Whether the view has been tracked in this session */
    hasTracked: trackedRef.current,
  };
}
