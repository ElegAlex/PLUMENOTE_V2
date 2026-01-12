"use client";

/**
 * React Query hook for single folder operations
 *
 * Provides data fetching and mutations for a single folder (update/rename).
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Folder, UpdateFolderInput } from "../types";
import { folderKeys } from "./useFolders";

interface FolderResponse {
  data: Folder;
}

/**
 * Fetch a single folder by ID
 */
async function fetchFolder(id: string): Promise<Folder> {
  const response = await fetch(`/api/folders/${id}`);

  if (!response.ok) {
    let errorMessage = "Erreur lors du chargement du dossier";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FolderResponse = await response.json();
  return data.data;
}

/**
 * Update a folder (rename or move)
 */
async function updateFolder({
  id,
  ...input
}: UpdateFolderInput & { id: string }): Promise<Folder> {
  const response = await fetch(`/api/folders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Erreur lors de la mise à jour du dossier";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FolderResponse = await response.json();
  return data.data;
}

export interface UseFolderOptions {
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Hook to fetch and update a single folder
 *
 * @example
 * ```tsx
 * const { folder, isLoading, updateFolder, rename } = useFolder("folder-id");
 *
 * // Rename the folder
 * rename("Nouveau nom");
 *
 * // Move the folder to another parent
 * updateFolder({ id: "folder-id", parentId: "new-parent-id" });
 *
 * // Move to root
 * updateFolder({ id: "folder-id", parentId: null });
 * ```
 */
export function useFolder(folderId: string, options: UseFolderOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // Query for fetching single folder
  const query = useQuery({
    queryKey: folderKeys.detail(folderId),
    queryFn: () => fetchFolder(folderId),
    enabled: enabled && !!folderId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation for updating a folder
  const updateMutation = useMutation({
    mutationFn: updateFolder,
    onSuccess: (updatedFolder) => {
      // Update folder in cache
      queryClient.setQueryData(
        folderKeys.detail(updatedFolder.id),
        updatedFolder
      );
      // Invalidate folders list and tree to refresh
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.trees() });
      // Invalidate path cache for breadcrumb updates (Story 5.5)
      queryClient.invalidateQueries({ queryKey: folderKeys.paths() });
    },
  });

  /**
   * Rename the folder (convenience method)
   */
  const rename = (newName: string) => {
    updateMutation.mutate({ id: folderId, name: newName });
  };

  /**
   * Rename the folder async (convenience method)
   */
  const renameAsync = (newName: string) => {
    return updateMutation.mutateAsync({ id: folderId, name: newName });
  };

  /**
   * Move the folder to a new parent (convenience method)
   */
  const moveTo = (parentId: string | null) => {
    updateMutation.mutate({ id: folderId, parentId });
  };

  /**
   * Move the folder async (convenience method)
   */
  const moveToAsync = (parentId: string | null) => {
    return updateMutation.mutateAsync({ id: folderId, parentId });
  };

  return {
    /** The folder data */
    folder: query.data ?? null,
    /** Whether folder is loading */
    isLoading: query.isLoading,
    /** Whether folder is being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Whether folder is being updated */
    isUpdating: updateMutation.isPending,
    /** Error if update failed */
    updateError: updateMutation.error as Error | null,
    /** Update folder properties */
    updateFolder: updateMutation.mutate,
    /** Update folder properties (async) */
    updateFolderAsync: updateMutation.mutateAsync,
    /** Rename the folder */
    rename,
    /** Rename the folder (async) */
    renameAsync,
    /** Move the folder to a new parent */
    moveTo,
    /** Move the folder (async) */
    moveToAsync,
    /** Refetch the folder */
    refetch: query.refetch,
  };
}
