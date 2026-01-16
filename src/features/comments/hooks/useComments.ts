"use client";

/**
 * React Query hook for fetching comments for a note
 *
 * Returns comments sorted by document position (anchorStart).
 * Supports polling for real-time updates.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #5 - Liste des commentaires triés par position
 * @see AC: #7 - Mises à jour temps réel (polling)
 */

import { useQuery } from "@tanstack/react-query";
import type { Comment, CommentsListResponse } from "../types";

/**
 * Options for useComments hook
 */
export interface UseCommentsOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
  /** Polling interval in ms for real-time updates (default: 5000) */
  refetchInterval?: number | false;
  /** Filter by resolved status */
  resolved?: boolean;
}

/**
 * Fetch comments from the API
 */
async function fetchComments(
  noteId: string,
  resolved?: boolean
): Promise<CommentsListResponse> {
  const params = new URLSearchParams();
  params.set("sortBy", "anchorStart");
  params.set("sortDir", "asc");
  params.set("pageSize", "100"); // Get all comments for now

  if (resolved !== undefined) {
    params.set("resolved", String(resolved));
  }

  const response = await fetch(`/api/notes/${noteId}/comments?${params}`);

  if (!response.ok) {
    let errorMessage = "Échec du chargement des commentaires";
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
 * Query keys for comments
 */
export const commentsKeys = {
  all: ["comments"] as const,
  list: (noteId: string) => ["comments", "list", noteId] as const,
  detail: (commentId: string) => ["comments", "detail", commentId] as const,
};

/**
 * Hook to fetch comments for a note
 *
 * @param noteId - The note ID to fetch comments for
 * @param options - Hook options
 * @returns Comments data, loading state, and refetch function
 *
 * @example
 * ```tsx
 * const { comments, isLoading, error, refetch } = useComments(noteId, {
 *   enabled: isPanelOpen,
 *   refetchInterval: 5000, // Poll every 5 seconds
 * });
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage />;
 * return comments.map(c => <CommentItem key={c.id} comment={c} />);
 * ```
 */
export function useComments(
  noteId: string | undefined,
  options: UseCommentsOptions = {}
) {
  const { enabled = true, refetchInterval = 5000, resolved } = options;

  const query = useQuery({
    queryKey: [...commentsKeys.list(noteId ?? ""), { resolved }],
    queryFn: () => fetchComments(noteId!, resolved),
    enabled: enabled && !!noteId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: enabled ? refetchInterval : false,
  });

  // Extract comments from response
  const comments: Comment[] = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;

  return {
    /** List of comments sorted by anchorStart */
    comments,
    /** Total number of comments */
    total,
    /** Whether data is being loaded */
    isLoading: query.isLoading,
    /** Whether data is being refetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Refetch comments */
    refetch: query.refetch,
  };
}
