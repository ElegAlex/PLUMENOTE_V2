"use client";

/**
 * React Query mutation hook for creating comments
 *
 * Creates a new comment on a note with optimistic updates.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #2 - Sauvegarde via API POST
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, CreateCommentInput, CommentsListResponse } from "../types";
import { commentsKeys } from "./useComments";

/**
 * API response for creating a comment
 */
interface CreateCommentResponse {
  data: Comment;
}

/**
 * Create a comment via the API
 */
async function createComment(
  noteId: string,
  input: CreateCommentInput
): Promise<CreateCommentResponse> {
  const response = await fetch(`/api/notes/${noteId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Échec de la création du commentaire";
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
 * Options for useCreateComment hook
 */
export interface UseCreateCommentOptions {
  /** Callback on successful creation */
  onSuccess?: (comment: Comment) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to create a comment on a note
 *
 * @param noteId - The note ID to create comment on
 * @param options - Hook options
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { createComment, isCreating, error } = useCreateComment(noteId, {
 *   onSuccess: (comment) => {
 *     // Add highlight mark to editor
 *     editor.commands.addCommentMark({ from, to, commentId: comment.id });
 *   },
 * });
 *
 * const handleSubmit = () => {
 *   createComment({
 *     content: "My comment",
 *     anchorStart: 10,
 *     anchorEnd: 25,
 *   });
 * };
 * ```
 */
export function useCreateComment(
  noteId: string | undefined,
  options: UseCreateCommentOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: (input: CreateCommentInput) => {
      if (!noteId) {
        throw new Error("Note ID is required");
      }
      return createComment(noteId, input);
    },

    // Optimistic update: add comment to cache immediately
    onMutate: async (newComment) => {
      if (!noteId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: commentsKeys.list(noteId),
      });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentsListResponse>(
        [...commentsKeys.list(noteId), { resolved: undefined }]
      );

      // Optimistically update
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content: newComment.content,
        anchorStart: newComment.anchorStart,
        anchorEnd: newComment.anchorEnd,
        resolved: false,
        noteId,
        parentId: newComment.parentId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "current-user",
        createdBy: { id: "current-user", name: "Vous", avatar: null },
      };

      queryClient.setQueryData<CommentsListResponse>(
        [...commentsKeys.list(noteId), { resolved: undefined }],
        (old) => {
          if (!old) {
            return {
              data: [optimisticComment],
              meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
            };
          }
          return {
            ...old,
            data: [...old.data, optimisticComment].sort(
              (a, b) => a.anchorStart - b.anchorStart
            ),
            meta: { ...old.meta, total: old.meta.total + 1 },
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
    /** Create a comment */
    createComment: mutation.mutate,
    /** Create a comment (async version) */
    createCommentAsync: mutation.mutateAsync,
    /** Whether creation is in progress */
    isCreating: mutation.isPending,
    /** Error if creation failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
