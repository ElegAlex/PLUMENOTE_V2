"use client";

/**
 * React Query hook for fetching version history with infinite scroll
 *
 * Returns paginated versions for a note, supporting "load more" pattern.
 * Used by VersionHistoryPanel component.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #7 - Pagination avec "Charger plus" pour listes longues
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import type { NoteVersionSummary } from "../types";

/**
 * API response format for versions list
 */
interface VersionsListResponse {
  data: NoteVersionSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Options for useVersionHistory hook
 */
export interface UseVersionHistoryOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
  /** Items per page (default: 20) */
  pageSize?: number;
}

/**
 * Fetch versions from the API
 */
async function fetchVersions(
  noteId: string,
  page: number,
  pageSize: number
): Promise<VersionsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(`/api/notes/${noteId}/versions?${params}`);

  if (!response.ok) {
    let errorMessage = "Échec du chargement de l'historique";
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
 * Query keys for version history
 */
export const versionHistoryKeys = {
  all: ["versions"] as const,
  list: (noteId: string) => ["versions", "list", noteId] as const,
  detail: (versionId: string) => ["versions", "detail", versionId] as const,
};

/**
 * Hook to fetch version history for a note with infinite scroll
 *
 * @param noteId - The note ID to fetch versions for
 * @param options - Hook options
 * @returns Versions data, loading state, and pagination controls
 *
 * @example
 * ```tsx
 * const { versions, isLoading, hasNextPage, fetchNextPage } = useVersionHistory(noteId, { enabled: isPanelOpen });
 *
 * if (isLoading) return <Skeleton />;
 * return (
 *   <>
 *     {versions.map(v => <VersionListItem key={v.id} {...v} />)}
 *     {hasNextPage && <Button onClick={() => fetchNextPage()}>Charger plus</Button>}
 *   </>
 * );
 * ```
 */
export function useVersionHistory(
  noteId: string | undefined,
  options: UseVersionHistoryOptions = {}
) {
  const { enabled = true, pageSize = 20 } = options;

  const query = useInfiniteQuery({
    queryKey: versionHistoryKeys.list(noteId ?? ""),
    queryFn: ({ pageParam = 1 }) => fetchVersions(noteId!, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: enabled && !!noteId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Flatten all pages into a single array
  const versions = query.data?.pages.flatMap((page) => page.data) ?? [];

  // Get total from the first page's meta
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return {
    /** Flattened list of all loaded versions */
    versions,
    /** Total number of versions available */
    total,
    /** Whether initial data is being loaded */
    isLoading: query.isLoading,
    /** Whether more data is being fetched */
    isFetchingNextPage: query.isFetchingNextPage,
    /** Whether there are more pages to load */
    hasNextPage: query.hasNextPage,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Fetch the next page of versions */
    fetchNextPage: query.fetchNextPage,
    /** Refetch all versions */
    refetch: query.refetch,
  };
}
