"use client";

/**
 * React Query hook for sharing notes to team workspaces
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "./useNote";
import type { Note } from "../types";

/**
 * Parameters for sharing a note
 */
export interface ShareNoteParams {
  /** ID of the note to share */
  sourceNoteId: string;
  /** ID of the target workspace */
  targetWorkspaceId: string;
  /** Optional ID of the target folder */
  targetFolderId?: string;
}

/**
 * Result of sharing a note
 */
export interface ShareNoteResult {
  originalNote: Note;
  sharedNote: Note;
}

/**
 * Share a note to a team workspace via API
 */
async function shareNote(params: ShareNoteParams): Promise<ShareNoteResult> {
  const { sourceNoteId, targetWorkspaceId, targetFolderId } = params;

  const response = await fetch(`/api/notes/${sourceNoteId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetWorkspaceId,
      targetFolderId,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to share note";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Hook to share a note from personal workspace to a team workspace
 *
 * @example
 * ```tsx
 * const { shareNote, isSharing, shareError, sharedNote } = useShareNote();
 *
 * // Share a note
 * shareNote({
 *   sourceNoteId: "note-123",
 *   targetWorkspaceId: "workspace-456",
 *   targetFolderId: "folder-789", // optional
 * }, {
 *   onSuccess: (result) => {
 *     toast.success(`Note partagée vers ${workspaceName}`);
 *   },
 *   onError: (error) => {
 *     toast.error(error.message);
 *   },
 * });
 * ```
 */
export function useShareNote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: shareNote,
    onSuccess: (data) => {
      // Invalidate notes list queries to refresh
      // The shared note should appear in the target workspace list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  return {
    /** Trigger share mutation */
    shareNote: mutation.mutate,
    /** Trigger share mutation and return promise */
    shareNoteAsync: mutation.mutateAsync,
    /** Whether share is in progress */
    isSharing: mutation.isPending,
    /** Error from share operation */
    shareError: mutation.error,
    /** Result of successful share */
    shareResult: mutation.data,
    /** The shared note (if share succeeded) */
    sharedNote: mutation.data?.sharedNote,
    /** Reset the mutation state */
    reset: mutation.reset,
  };
}
