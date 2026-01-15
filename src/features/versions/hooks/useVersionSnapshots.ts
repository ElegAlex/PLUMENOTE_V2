"use client";

/**
 * Hook for managing automatic version snapshots
 *
 * Creates snapshots:
 * - At intervals (every 5 minutes of active editing)
 * - When user navigates away (visibilitychange to 'hidden')
 * - When browser/tab is closed (beforeunload via sendBeacon)
 * - When component unmounts
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { useEffect, useRef, useCallback } from "react";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseVersionSnapshotsOptions {
  /** ID of the note being edited */
  noteId: string | null;
  /** Whether editing is currently active */
  isEditing: boolean;
  /** Whether the feature is enabled (default: true) */
  enabled?: boolean;
}

interface UseVersionSnapshotsReturn {
  /** Call this to track user activity (e.g., on keypress) */
  trackActivity: () => void;
  /** Manually trigger a snapshot */
  triggerSnapshot: () => Promise<void>;
}

/**
 * Create a snapshot via API
 *
 * This is a fire-and-forget operation. Errors are silently ignored
 * as snapshots are non-critical and the server logs failures.
 */
async function createSnapshot(noteId: string): Promise<void> {
  try {
    await fetch("/api/notes/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ noteId }),
    });
    // Response errors are silently ignored - server logs them
  } catch {
    // Network errors are silently ignored - non-critical operation
  }
}

/**
 * Create a snapshot via sendBeacon (for page close)
 *
 * sendBeacon is the most reliable way to send data when the page
 * is being unloaded. Errors are silently ignored.
 */
function createSnapshotBeacon(noteId: string): void {
  try {
    const data = JSON.stringify({ noteId });
    navigator.sendBeacon("/api/notes/snapshot", data);
  } catch {
    // Silently ignore errors - non-critical operation
  }
}

/**
 * Hook for managing automatic version snapshots
 *
 * @example
 * ```tsx
 * function NoteEditor({ noteId }: { noteId: string }) {
 *   const { trackActivity } = useVersionSnapshots({
 *     noteId,
 *     isEditing: true,
 *   });
 *
 *   return (
 *     <textarea
 *       onKeyDown={trackActivity}
 *       onChange={trackActivity}
 *     />
 *   );
 * }
 * ```
 */
export function useVersionSnapshots({
  noteId,
  isEditing,
  enabled = true,
}: UseVersionSnapshotsOptions): UseVersionSnapshotsReturn {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const noteIdRef = useRef<string | null>(noteId);

  // Keep noteIdRef in sync
  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  // Track user activity
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Manual snapshot trigger
  const triggerSnapshot = useCallback(async () => {
    if (noteIdRef.current) {
      await createSnapshot(noteIdRef.current);
    }
  }, []);

  // Interval snapshot (every 5 minutes)
  useEffect(() => {
    if (!enabled || !isEditing || !noteId) {
      // Clear interval when not editing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval
    intervalRef.current = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;

      // Only create snapshot if user was active in the last interval
      if (timeSinceActivity < SNAPSHOT_INTERVAL_MS && noteIdRef.current) {
        await createSnapshot(noteIdRef.current);
      }
    }, SNAPSHOT_INTERVAL_MS);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isEditing, noteId]);

  // Visibility change and beforeunload handlers
  useEffect(() => {
    if (!enabled || !noteId) {
      return;
    }

    // Handle tab becoming hidden (user switched tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && noteIdRef.current) {
        // Use beacon for reliability when page is hidden
        createSnapshotBeacon(noteIdRef.current);
      }
    };

    // Handle page close
    const handleBeforeUnload = () => {
      if (noteIdRef.current) {
        createSnapshotBeacon(noteIdRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, noteId]);

  // Cleanup snapshot on unmount (if editing was active)
  useEffect(() => {
    return () => {
      // Create final snapshot when component unmounts
      if (enabled && noteIdRef.current) {
        // Use fire-and-forget for unmount - don't block
        createSnapshot(noteIdRef.current).catch(() => {
          // Ignore errors on unmount
        });
      }
    };
  }, [enabled]);

  return {
    trackActivity,
    triggerSnapshot,
  };
}
