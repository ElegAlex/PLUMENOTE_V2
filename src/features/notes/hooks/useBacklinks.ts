"use client";

/**
 * React Query hook for fetching backlinks
 *
 * Returns notes that link TO the specified note.
 * Used by BacklinksPanel component.
 *
 * @see Story 6.7: Panneau Backlinks
 * @see AC: #1 - Liste des notes qui contiennent un lien vers cette note
 * @see AC: #5 - Chargement avec staleTime 30s (cohérent avec useNote)
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Backlink information returned by the API
 */
export interface BacklinkInfo {
  /** Note ID */
  id: string;
  /** Current note title */
  title: string;
  /** Title at the time the link was created (context) */
  linkTitle: string | null;
  /** Last modification date of the source note (ISO 8601) */
  updatedAt: string;
}

/**
 * API response format
 */
interface BacklinksResponse {
  data: BacklinkInfo[];
}

/**
 * Options for useBacklinks hook
 */
export interface UseBacklinksOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Fetch backlinks from the API
 */
async function fetchBacklinks(noteId: string): Promise<BacklinkInfo[]> {
  const response = await fetch(`/api/notes/${noteId}/backlinks`);

  if (!response.ok) {
    let errorMessage = "Échec du chargement des backlinks";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: BacklinksResponse = await response.json();
  return data.data;
}

/**
 * Hook to fetch backlinks for a note
 *
 * @param noteId - The note ID to fetch backlinks for
 * @param options - Hook options
 * @returns Backlinks data and loading state
 *
 * @example
 * ```tsx
 * const { backlinks, isLoading } = useBacklinks(noteId, { enabled: isPanelOpen });
 *
 * if (isLoading) return <Skeleton />;
 * return backlinks.map(b => <BacklinkItem key={b.id} {...b} />);
 * ```
 */
export function useBacklinks(
  noteId: string | undefined,
  options: UseBacklinksOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ["notes", "backlinks", noteId] as const,
    queryFn: () => fetchBacklinks(noteId!),
    enabled: enabled && !!noteId,
    staleTime: 30 * 1000, // 30 seconds (consistent with useNote)
  });

  return {
    /** List of backlinks (notes linking TO this note) */
    backlinks: query.data ?? [],
    /** Whether backlinks are being loaded */
    isLoading: query.isLoading,
    /** Whether backlinks are being refetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Refetch backlinks */
    refetch: query.refetch,
  };
}
