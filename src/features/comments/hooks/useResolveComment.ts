"use client";

/**
 * React Query mutation hook for resolving/unresolving comments
 *
 * Marks comments as resolved or reopens them.
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #4 - Marquer comme résolu
 * @see AC: #7 - Rouvrir un commentaire
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, CommentsListResponse } from "../types";
import { commentsKeys } from "./useComments";

/**
 * API response for updating a comment
 */
interface UpdateCommentResponse {
  data: Comment;
}

/**
 * Update resolved status via the API
 */
async function updateResolvedStatus(
  commentId: string,
  resolved: boolean
): Promise<UpdateCommentResponse> {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resolved }),
  });

  if (!response.ok) {
    let errorMessage = resolved
      ? "Échec de la résolution du commentaire"
      : "Échec de la réouverture du commentaire";
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
 * Options for useResolveComment hook
 */
export interface UseResolveCommentOptions {
  /** Note ID for cache invalidation */
  noteId: string | undefined;
  /** Callback on successful update */
  onSuccess?: (comment: Comment) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to resolve or unresolve a comment
 *
 * @param options - Hook options including noteId for cache invalidation
 * @returns Mutation functions and state
 *
 * @example
 * ```tsx
 * const { resolveComment, unresolveComment, isResolving } = useResolveComment({
 *   noteId,
 *   onSuccess: (comment) => {
 *     // Update UI
 *     toast.success(comment.resolved ? "Commentaire résolu" : "Commentaire rouvert");
 *   },
 * });
 *
 * // Mark as resolved
 * resolveComment(commentId);
 *
 * // Reopen
 * unresolveComment(commentId);
 * ```
 */
export function useResolveComment(options: UseResolveCommentOptions) {
  const queryClient = useQueryClient();
  const { noteId, onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: ({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
      return updateResolvedStatus(commentId, resolved);
    },

    // Optimistic update
    onMutate: async ({ commentId, resolved }) => {
      if (!noteId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: commentsKeys.list(noteId),
      });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentsListResponse>(
        [...commentsKeys.list(noteId), { resolved: undefined }]
      );

      // Optimistically update the comment
      queryClient.setQueryData<CommentsListResponse>(
        [...commentsKeys.list(noteId), { resolved: undefined }],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === commentId ? { ...c, resolved } : c
            ),
          };
        }
      );

      return { previousComments };
    },

    // On error, rollback to previous value
    onError: (error, _variables, context) => {
      if (noteId && context?.previousComments) {
        queryClient.setQueryData(
          [...commentsKeys.list(noteId), { resolved: undefined }],
          context.previousComments
        );
      }
      onError?.(error as Error);
    },

    // On success, invalidate and refetch
    onSuccess: (response) => {
      if (noteId) {
        queryClient.invalidateQueries({
          queryKey: commentsKeys.list(noteId),
        });
      }
      onSuccess?.(response.data);
    },
  });

  return {
    /** Mark a comment as resolved */
    resolveComment: (commentId: string) =>
      mutation.mutate({ commentId, resolved: true }),
    /** Mark a comment as resolved (async version) */
    resolveCommentAsync: (commentId: string) =>
      mutation.mutateAsync({ commentId, resolved: true }),
    /** Reopen a resolved comment */
    unresolveComment: (commentId: string) =>
      mutation.mutate({ commentId, resolved: false }),
    /** Reopen a resolved comment (async version) */
    unresolveCommentAsync: (commentId: string) =>
      mutation.mutateAsync({ commentId, resolved: false }),
    /** Whether resolve/unresolve is in progress */
    isResolving: mutation.isPending,
    /** Error if operation failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
