"use client";

/**
 * React Query hook for fetching a single version with full content
 *
 * Returns the complete version including content and ydoc.
 * Used by VersionPreview component.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #4 - Prévisualisation du contenu d'une version
 * @see AC: #5 - Contenu Markdown rendu en lecture seule
 */

import { useQuery } from "@tanstack/react-query";
import { versionHistoryKeys } from "./useVersionHistory";
import type { NoteVersion } from "../types";

/**
 * API response format for version detail
 */
interface VersionDetailResponse {
  data: NoteVersion;
}

/**
 * Options for useVersionDetail hook
 */
export interface UseVersionDetailOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Fetch a single version from the API
 */
async function fetchVersionDetail(
  noteId: string,
  versionId: string
): Promise<NoteVersion> {
  const response = await fetch(`/api/notes/${noteId}/versions/${versionId}`);

  if (!response.ok) {
    let errorMessage = "Échec du chargement de la version";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result: VersionDetailResponse = await response.json();
  return result.data;
}

/**
 * Hook to fetch a single version with full content
 *
 * @param noteId - The note ID
 * @param versionId - The version ID to fetch
 * @param options - Hook options
 * @returns Version data and loading state
 *
 * @example
 * ```tsx
 * const { version, isLoading, error } = useVersionDetail(noteId, selectedVersionId, { enabled: !!selectedVersionId });
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage error={error} />;
 * return <VersionPreview version={version} />;
 * ```
 */
export function useVersionDetail(
  noteId: string | undefined,
  versionId: string | undefined,
  options: UseVersionDetailOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: versionHistoryKeys.detail(versionId ?? ""),
    queryFn: () => fetchVersionDetail(noteId!, versionId!),
    enabled: enabled && !!noteId && !!versionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - version content doesn't change
  });

  return {
    /** The version with full content */
    version: query.data ?? null,
    /** Whether the version is being loaded */
    isLoading: query.isLoading,
    /** Whether the version is being refetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Refetch the version */
    refetch: query.refetch,
  };
}
