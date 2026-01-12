"use client";

/**
 * React Query hook for fetching folder path (breadcrumb)
 *
 * Returns the complete path from root to the specified folder,
 * ordered from root (first) to target folder (last).
 *
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import { useQuery } from "@tanstack/react-query";
import type { Folder } from "../types";
import { folderKeys } from "./useFolders";

interface FolderPathResponse {
  data: Folder[];
}

/**
 * Fetch folder path from API
 */
async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  const response = await fetch(`/api/folders/${folderId}/path`);

  if (!response.ok) {
    let errorMessage = "Erreur lors du chargement du chemin";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FolderPathResponse = await response.json();
  return data.data;
}

/**
 * Hook to fetch the folder path (breadcrumb) for a given folder ID
 *
 * @param folderId - The ID of the folder to get the path for, or null for root
 * @returns The folder path and query state
 *
 * @example
 * ```tsx
 * const { data: path, isLoading, error } = useFolderPath(note.folderId);
 *
 * // path is an array: [rootFolder, ..., parentFolder, currentFolder]
 * if (path) {
 *   path.forEach(folder => console.log(folder.name));
 * }
 * ```
 */
export function useFolderPath(folderId: string | null) {
  return useQuery({
    queryKey: folderKeys.path(folderId ?? ""),
    queryFn: () => fetchFolderPath(folderId!),
    enabled: !!folderId,
    staleTime: 5 * 60 * 1000, // 5 minutes - path changes rarely
  });
}
