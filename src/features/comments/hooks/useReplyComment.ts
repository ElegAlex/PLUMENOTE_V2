"use client";

/**
 * React Query mutation hook for replying to comments
 *
 * Creates a reply to an existing comment, inheriting anchor positions from parent.
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #2 - Réponse sauvegardée avec parentId
 * @see AC: #9 - Hériter des positions d'ancrage du parent
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Comment, CommentsListResponse } from "../types";
import { commentsKeys } from "./useComments";

/**
 * API response for creating a comment
 */
interface CreateCommentResponse {
  data: Comment;
}

/**
 * Input for replying to a comment
 */
export interface ReplyToCommentInput {
  /** Parent comment to reply to */
  parentComment: Comment;
  /** Content of the reply */
  content: string;
}

/**
 * Create a reply via the API
 */
async function createReply(
  noteId: string,
  input: ReplyToCommentInput
): Promise<CreateCommentResponse> {
  const response = await fetch(`/api/notes/${noteId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: input.content,
      anchorStart: input.parentComment.anchorStart,
      anchorEnd: input.parentComment.anchorEnd,
      parentId: input.parentComment.id,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Échec de la création de la réponse";
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
 * Options for useReplyComment hook
 */
export interface UseReplyCommentOptions {
  /** Callback on successful creation */
  onSuccess?: (reply: Comment) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to create a reply to an existing comment
 *
 * @param noteId - The note ID where the comment thread exists
 * @param options - Hook options
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * const { replyToComment, isReplying, error } = useReplyComment(noteId, {
 *   onSuccess: (reply) => {
 *     // Close reply form
 *     setActiveReplyId(null);
 *   },
 * });
 *
 * const handleSubmitReply = (content: string) => {
 *   replyToComment({
 *     parentComment: comment,
 *     content,
 *   });
 * };
 * ```
 */
export function useReplyComment(
  noteId: string | undefined,
  options: UseReplyCommentOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  const mutation = useMutation({
    mutationFn: (input: ReplyToCommentInput) => {
      if (!noteId) {
        throw new Error("Note ID is required");
      }
      return createReply(noteId, input);
    },

    // Optimistic update: add reply to cache immediately
    onMutate: async (newReply) => {
      if (!noteId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: commentsKeys.list(noteId),
      });

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<CommentsListResponse>(
        [...commentsKeys.list(noteId), { resolved: undefined }]
      );

      // Optimistically add reply
      const optimisticReply: Comment = {
        id: `temp-reply-${Date.now()}`,
        content: newReply.content,
        anchorStart: newReply.parentComment.anchorStart,
        anchorEnd: newReply.parentComment.anchorEnd,
        resolved: false,
        noteId,
        parentId: newReply.parentComment.id,
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
              data: [optimisticReply],
              meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
            };
          }
          return {
            ...old,
            data: [...old.data, optimisticReply],
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
    /** Reply to a comment */
    replyToComment: mutation.mutate,
    /** Reply to a comment (async version) */
    replyToCommentAsync: mutation.mutateAsync,
    /** Whether reply is in progress */
    isReplying: mutation.isPending,
    /** Error if reply failed */
    error: mutation.error as Error | null,
    /** Reset mutation state */
    reset: mutation.reset,
  };
}
