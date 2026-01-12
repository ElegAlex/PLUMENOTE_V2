/**
 * Hook for searching notes with debounced input
 *
 * Uses the FTS-powered /api/notes/search endpoint from Story 6.1.
 * Debounces search queries by 150ms per UX requirements.
 *
 * @see Story 6.2: Command Palette et Recherche (Task 3)
 */

import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/** Search result note with highlight and rank */
export interface SearchResultNote {
  id: string;
  title: string;
  content: string | null;
  folderId: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  tags: Array<{ id: string; name: string; color: string }>;
  folder: { id: string; name: string; parentId: string | null } | null;
  /** HTML highlight with <mark> tags - MUST be sanitized before rendering */
  highlight: string | null;
  /** Relevance score from FTS */
  rank: number;
}

/** Search API response */
export interface SearchResponse {
  data: SearchResultNote[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    query: string;
  };
}

/** Search options */
export interface UseSearchNotesOptions {
  /** Number of results per page */
  pageSize?: number;
  /** Filter to favorites only */
  favoriteOnly?: boolean;
  /** Filter by folder ID */
  folderId?: string | null;
}

/**
 * Hook to search notes with debounced input
 *
 * @param query - The search query string
 * @param options - Optional search filters
 * @returns React Query result with search data
 */
export function useSearchNotes(
  query: string,
  options: UseSearchNotesOptions = {}
) {
  const { pageSize = 10, favoriteOnly, folderId } = options;

  // Debounce the search query by 150ms (UX requirement)
  const debouncedQuery = useDebouncedValue(query, 150);

  return useQuery<SearchResponse>({
    queryKey: ["notes", "search", debouncedQuery, { pageSize, favoriteOnly, folderId }],
    queryFn: async () => {
      // Return empty results for empty query
      if (!debouncedQuery.trim()) {
        return {
          data: [],
          meta: {
            total: 0,
            page: 1,
            pageSize,
            totalPages: 0,
            query: "",
          },
        };
      }

      const params = new URLSearchParams({
        query: debouncedQuery,
        pageSize: pageSize.toString(),
      });

      if (favoriteOnly) {
        params.set("favoriteOnly", "true");
      }

      if (folderId) {
        params.set("folderId", folderId);
      }

      const response = await fetch(`/api/notes/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to search notes");
      }

      return response.json();
    },
    // Only enable query when there's a search term
    enabled: debouncedQuery.trim().length > 0,
    // Keep data fresh for 30 seconds
    staleTime: 30_000,
    // Keep previous data while fetching new results
    placeholderData: (previousData) => previousData,
  });
}
