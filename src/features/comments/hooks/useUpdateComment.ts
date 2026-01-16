"use client";

/**
 * React Query mutation hook for updating comments
 *
 * Updates an existing comment's content or resolved status.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #8 - Modifier ou supprimer son commentaire
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, UpdateCommentInput } from "../types";
import { commentsKeys } from "./useComments";

/**
 * API response for updating a comment
 */
interface UpdateCommentResponse {
  data: Comment;
}

/**
 * Update a comment via the API
 */
async function updateComment(
  commentId: string,
  input: UpdateCommentInput
): Promise<UpdateCommentResponse> {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Échec de la mise à jour du commentaire";
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
 * Options for useUpdateComment hook
 */
export interface UseUpdateCommentOptions {
  /** Note ID for cache invalidation */
  noteId?: string;
  /** Callback on successful update */
  onSuccess?: (comment: Comment) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to update a comment
 *
 * @param options - Hook options
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { updateComment, isUpdating } = useUpdateComment({
 *   noteId,
 *   onSuccess: () => toast.success("Commentaire mis à jour"),
 * });
 *
 * const handleEdit = (commentId: string, newContent: string) => {
 *   updateComment({ commentId, input: { content: newContent } });
 * };
 * ```
 */
export function useUpdateComment(options: UseUpdateCommentOptions = {}) {
  const queryClient = useQueryClient();
  const { noteId, onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: ({
      commentId,
      input,
    }: {
      commentId: string;
      input: UpdateCommentInput;
    }) => {
      return updateComment(commentId, input);
    },

    onSuccess: (response) => {
      // Invalidate comment lists for the note
      if (noteId) {
        queryClient.invalidateQueries({
          queryKey: commentsKeys.list(noteId),
        });
      }

      // Also invalidate the specific comment detail
      queryClient.invalidateQueries({
        queryKey: commentsKeys.detail(response.data.id),
      });

      onSuccess?.(response.data);
    },

    onError: (error) => {
      onError?.(error as Error);
    },
  });

  return {
    /** Update a comment */
    updateComment: mutation.mutate,
    /** Update a comment (async version) */
    updateCommentAsync: mutation.mutateAsync,
    /** Whether update is in progress */
    isUpdating: mutation.isPending,
    /** Error if update failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
