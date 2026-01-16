"use client";

/**
 * React Query mutation hook for deleting comments
 *
 * Deletes a comment (soft delete on server).
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #8 - Modifier ou supprimer son commentaire
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsKeys } from "./useComments";

/**
 * Delete a comment via the API
 */
async function deleteComment(commentId: string): Promise<void> {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Échec de la suppression du commentaire";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // 204 No Content - no body to parse
}

/**
 * Options for useDeleteComment hook
 */
export interface UseDeleteCommentOptions {
  /** Note ID for cache invalidation */
  noteId?: string;
  /** Callback on successful deletion */
  onSuccess?: (commentId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to delete a comment
 *
 * @param options - Hook options
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { deleteComment, isDeleting } = useDeleteComment({
 *   noteId,
 *   onSuccess: (commentId) => {
 *     // Remove highlight mark from editor
 *     editor.commands.removeCommentMark(commentId);
 *     toast.success("Commentaire supprimé");
 *   },
 * });
 *
 * const handleDelete = (commentId: string) => {
 *   deleteComment(commentId);
 * };
 * ```
 */
export function useDeleteComment(options: UseDeleteCommentOptions = {}) {
  const queryClient = useQueryClient();
  const { noteId, onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: (commentId: string) => {
      return deleteComment(commentId);
    },

    onSuccess: (_data, commentId) => {
      // Invalidate comment lists for the note
      if (noteId) {
        queryClient.invalidateQueries({
          queryKey: commentsKeys.list(noteId),
        });
      }

      // Remove the specific comment from cache
      queryClient.removeQueries({
        queryKey: commentsKeys.detail(commentId),
      });

      onSuccess?.(commentId);
    },

    onError: (error) => {
      onError?.(error as Error);
    },
  });

  return {
    /** Delete a comment */
    deleteComment: mutation.mutate,
    /** Delete a comment (async version) */
    deleteCommentAsync: mutation.mutateAsync,
    /** Whether deletion is in progress */
    isDeleting: mutation.isPending,
    /** Error if deletion failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
