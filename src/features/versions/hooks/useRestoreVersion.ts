"use client";

/**
 * React Query hook for restoring a note to a previous version
 *
 * Provides mutation for restoration with:
 * - Optimistic cache invalidation
 * - Undo capability (30 second window)
 * - Toast notifications with undo action
 *
 * @see Story 9.3: Restauration de Version
 * @see AC: #2 - Le contenu de la note est remplacé
 * @see AC: #4 - Toast avec option "Annuler"
 * @see AC: #5 - Undo pendant 30 secondes
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RestoreVersionResponse } from "../types";
import { versionHistoryKeys } from "./useVersionHistory";

/**
 * Options for useRestoreVersion hook
 */
export interface UseRestoreVersionOptions {
  /** Note ID to restore versions for */
  noteId: string;
  /** Callback after successful restoration */
  onSuccess?: () => void;
  /** Callback after restoration error */
  onError?: (error: Error) => void;
}

/** Undo timeout in milliseconds (30 seconds per AC #5) */
const UNDO_TIMEOUT_MS = 30_000;

/**
 * Restore a version via the API
 */
async function restoreVersionApi(
  noteId: string,
  versionId: string
): Promise<RestoreVersionResponse> {
  const response = await fetch(`/api/notes/${noteId}/versions/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionId }),
  });

  if (!response.ok) {
    let errorMessage = "Échec de la restauration";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Hook to restore a note to a previous version
 *
 * @param options - Hook options including noteId and callbacks
 * @returns Mutation controls and undo capability
 *
 * @example
 * ```tsx
 * const { restore, isRestoring, canUndo, undoRestore } = useRestoreVersion({
 *   noteId,
 *   onSuccess: () => closePanel(),
 * });
 *
 * <Button onClick={() => restore(versionId)} disabled={isRestoring}>
 *   {isRestoring ? "Restauration..." : "Restaurer"}
 * </Button>
 * ```
 */
export function useRestoreVersion({
  noteId,
  onSuccess,
  onError,
}: UseRestoreVersionOptions) {
  const queryClient = useQueryClient();
  const [undoVersionId, setUndoVersionId] = useState<string | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Mutation for restore operation
  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersionApi(noteId, versionId),
    onSuccess: (data) => {
      // Store undo version ID
      setUndoVersionId(data.meta.undoVersionId);

      // Invalidate caches to refresh data
      queryClient.invalidateQueries({ queryKey: ["notes", "detail", noteId] });
      queryClient.invalidateQueries({ queryKey: versionHistoryKeys.list(noteId) });

      // Clear any existing timer
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      // Set timer to clear undo capability after 30s
      undoTimerRef.current = setTimeout(() => {
        setUndoVersionId(null);
        toastIdRef.current = null;
      }, UNDO_TIMEOUT_MS);

      // Show toast with undo action
      toastIdRef.current = toast.success(
        `Version ${data.meta.restoredFrom} restaurée`,
        {
          description: "La note a été restaurée avec succès",
          action: {
            label: "Annuler",
            onClick: () => handleUndo(data.meta.undoVersionId),
          },
          duration: UNDO_TIMEOUT_MS,
        }
      );

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Erreur de restauration", {
        description: error.message,
      });
      onError?.(error);
    },
  });

  /**
   * Handle undo - restore to the undo snapshot
   */
  const handleUndo = useCallback(
    async (undoId: string) => {
      if (!undoId) return;

      try {
        // Dismiss the current toast
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }

        // Show loading state
        const loadingToastId = toast.loading("Annulation en cours...");

        const response = await fetch(`/api/notes/${noteId}/versions/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: undoId }),
        });

        toast.dismiss(loadingToastId);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Échec de l'annulation");
        }

        // Cleanup
        setUndoVersionId(null);
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
        }
        toastIdRef.current = null;

        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ["notes", "detail", noteId] });
        queryClient.invalidateQueries({ queryKey: versionHistoryKeys.list(noteId) });

        toast.success("Restauration annulée", {
          description: "La note a été rétablie à son état précédent",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Échec de l'annulation";
        toast.error("Impossible d'annuler", {
          description: message,
        });
      }
    },
    [noteId, queryClient]
  );

  /**
   * Public undo handler that uses stored undoVersionId
   */
  const undoRestore = useCallback(() => {
    if (undoVersionId) {
      handleUndo(undoVersionId);
    }
  }, [undoVersionId, handleUndo]);

  return {
    /** Trigger restoration of a specific version */
    restore: restoreMutation.mutate,
    /** Async version that returns promise */
    restoreAsync: restoreMutation.mutateAsync,
    /** Whether restoration is in progress */
    isRestoring: restoreMutation.isPending,
    /** Whether undo is currently available */
    canUndo: !!undoVersionId,
    /** Trigger undo of the last restoration */
    undoRestore,
    /** Error from the last restoration attempt */
    error: restoreMutation.error as Error | null,
    /** Whether restoration was successful */
    isSuccess: restoreMutation.isSuccess,
    /** Reset mutation state */
    reset: restoreMutation.reset,
  };
}
