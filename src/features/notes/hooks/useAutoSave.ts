"use client";

/**
 * Auto-save hook with debounce
 *
 * Automatically saves changes after a delay of inactivity.
 * Merges partial updates to prevent data loss.
 */

import { useRef, useEffect, useCallback } from "react";

export interface UseAutoSaveOptions {
  /** Delay in milliseconds before saving (default: 1000ms) */
  delay?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Whether to merge partial updates (default: true) */
  merge?: boolean;
}

/**
 * Hook to auto-save data with debounce
 *
 * @example
 * ```tsx
 * const { save, flush, isPending } = useAutoSave(
 *   async (data) => await updateNote(data),
 *   { delay: 1000 }
 * );
 *
 * // Call save whenever data changes
 * save({ title: "New Title" });
 * ```
 */
export function useAutoSave<T extends Record<string, unknown>>(
  onSave: (data: T) => Promise<void> | void,
  options: UseAutoSaveOptions = {}
) {
  const { delay = 1000, enabled = true, merge = true } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<T | null>(null);
  const isSavingRef = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save function with debounce
  const save = useCallback(
    (data: Partial<T>) => {
      if (!enabled) return;

      // Merge with pending data to prevent data loss
      if (merge && pendingDataRef.current) {
        pendingDataRef.current = { ...pendingDataRef.current, ...data } as T;
      } else {
        pendingDataRef.current = data as T;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        if (pendingDataRef.current !== null && !isSavingRef.current) {
          isSavingRef.current = true;
          try {
            await onSave(pendingDataRef.current);
            pendingDataRef.current = null;
          } finally {
            isSavingRef.current = false;
          }
        }
      }, delay);
    },
    [onSave, delay, enabled, merge]
  );

  // Flush pending save immediately
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingDataRef.current !== null && !isSavingRef.current) {
      isSavingRef.current = true;
      try {
        await onSave(pendingDataRef.current);
        pendingDataRef.current = null;
      } finally {
        isSavingRef.current = false;
      }
    }
  }, [onSave]);

  // Cancel pending save
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingDataRef.current = null;
  }, []);

  return {
    /** Queue a save with debounce */
    save,
    /** Flush pending save immediately */
    flush,
    /** Cancel pending save */
    cancel,
  };
}
