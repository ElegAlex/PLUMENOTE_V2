"use client";

/**
 * React Query hook for moving notes between folders
 *
 * Provides mutation for moving notes with cross-cache invalidation
 * (both notes and folders caches are invalidated on success).
 *
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { noteKeys } from "./useNote";
import { folderKeys } from "./useFolders";
import type { Note, NoteResponse, NotesResponse } from "../types";

export interface MoveNoteInput {
  /** The ID of the note to move */
  noteId: string;
  /** The target folder ID, or null to move to root */
  folderId: string | null;
  /** Previous folder ID (optional, used internally from cache) */
  _previousFolderId?: string | null;
}

export interface MoveNoteResult {
  /** The updated note */
  note: Note;
  /** The previous folder ID (for undo) */
  previousFolderId: string | null;
}

/**
 * Get previous folderId from React Query cache
 */
function getPreviousFolderIdFromCache(
  queryClient: QueryClient,
  noteId: string
): string | null | undefined {
  // Try to get from note detail cache first
  const noteDetail = queryClient.getQueryData<Note>(noteKeys.detail(noteId));
  if (noteDetail) {
    return noteDetail.folderId ?? null;
  }

  // Try to find in notes list caches
  const listQueries = queryClient.getQueriesData<NotesResponse>({ queryKey: noteKeys.lists() });
  for (const [, data] of listQueries) {
    if (data?.data) {
      const note = data.data.find((n) => n.id === noteId);
      if (note) {
        return note.folderId ?? null;
      }
    }
  }

  // Not found in cache
  return undefined;
}

/**
 * Move a note to a different folder
 */
async function moveNote(input: MoveNoteInput): Promise<MoveNoteResult> {
  const { noteId, folderId, _previousFolderId } = input;

  // Use provided previousFolderId (from cache lookup in hook)
  const previousFolderId = _previousFolderId ?? null;

  // Update the note with the new folderId
  const response = await fetch(`/api/notes/${noteId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderId }),
  });

  if (!response.ok) {
    let errorMessage = "Erreur lors du déplacement de la note";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: NoteResponse = await response.json();
  return {
    note: data.data,
    previousFolderId,
  };
}

export interface UseMoveNoteOptions {
  /** Callback on successful move */
  onSuccess?: (result: MoveNoteResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook for moving notes between folders
 *
 * @example
 * ```tsx
 * const { moveNote, isMoving } = useMoveNote({
 *   onSuccess: ({ note, previousFolderId }) => {
 *     toast.success(`Note déplacée`, {
 *       action: {
 *         label: "Annuler",
 *         onClick: () => moveNote({ noteId: note.id, folderId: previousFolderId }),
 *       },
 *     });
 *   },
 * });
 *
 * // Move note to a folder
 * moveNote({ noteId: "...", folderId: "target-folder-id" });
 *
 * // Move note to root
 * moveNote({ noteId: "...", folderId: null });
 * ```
 */
export function useMoveNote(options: UseMoveNoteOptions = {}) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: moveNote,
    onSuccess: (result) => {
      // Update the note in cache
      queryClient.setQueryData(noteKeys.detail(result.note.id), result.note);

      // Invalidate note lists to refresh them
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });

      // Invalidate folder queries to update note counts
      queryClient.invalidateQueries({ queryKey: folderKeys.all });

      // Call user callback
      onSuccess?.(result);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });

  // Wrapper to inject previousFolderId from cache
  const moveNoteWithCache = (input: Omit<MoveNoteInput, "_previousFolderId">) => {
    const previousFolderId = getPreviousFolderIdFromCache(queryClient, input.noteId);
    mutation.mutate({ ...input, _previousFolderId: previousFolderId });
  };

  const moveNoteAsyncWithCache = async (input: Omit<MoveNoteInput, "_previousFolderId">) => {
    const previousFolderId = getPreviousFolderIdFromCache(queryClient, input.noteId);
    return mutation.mutateAsync({ ...input, _previousFolderId: previousFolderId });
  };

  return {
    /** Move a note to a folder (or root if folderId is null) */
    moveNote: moveNoteWithCache,
    /** Move a note to a folder (async version) */
    moveNoteAsync: moveNoteAsyncWithCache,
    /** Whether a move is in progress */
    isMoving: mutation.isPending,
    /** Error if move failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
