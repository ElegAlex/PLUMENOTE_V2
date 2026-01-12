"use client";

/**
 * React Query hook for folders operations
 *
 * Provides data fetching and mutations for folders CRUD.
 * Supports both flat list and hierarchical tree views.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Folder,
  FolderWithChildren,
  FolderWithNotesTree,
  FolderWithCount,
  CreateFolderInput,
} from "../types";

/**
 * Query key factory for folders
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
export const folderKeys = {
  all: ["folders"] as const,
  lists: () => [...folderKeys.all, "list"] as const,
  list: () => folderKeys.lists(),
  trees: () => [...folderKeys.all, "tree"] as const,
  tree: () => folderKeys.trees(),
  treesWithNotes: () => [...folderKeys.all, "treeWithNotes"] as const,
  treeWithNotes: () => folderKeys.treesWithNotes(),
  details: () => [...folderKeys.all, "detail"] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
  paths: () => [...folderKeys.all, "path"] as const,
  path: (id: string) => [...folderKeys.paths(), id] as const,
};

interface FoldersListResponse {
  data: FolderWithCount[];
}

interface FoldersTreeResponse {
  data: FolderWithChildren[];
}

interface FoldersTreeWithNotesResponse {
  data: FolderWithNotesTree[];
}

interface FolderResponse {
  data: Folder;
}

/**
 * Fetch all folders for the current user (flat list with counts)
 */
async function fetchFolders(): Promise<FolderWithCount[]> {
  const response = await fetch("/api/folders");

  if (!response.ok) {
    let errorMessage = "Erreur lors du chargement des dossiers";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FoldersListResponse = await response.json();
  return data.data;
}

/**
 * Fetch all folders for the current user (hierarchical tree)
 */
async function fetchFoldersTree(): Promise<FolderWithChildren[]> {
  const response = await fetch("/api/folders?tree=true");

  if (!response.ok) {
    let errorMessage = "Erreur lors du chargement des dossiers";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FoldersTreeResponse = await response.json();
  return data.data;
}

/**
 * Fetch all folders for the current user (hierarchical tree with notes)
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
async function fetchFoldersTreeWithNotes(): Promise<FolderWithNotesTree[]> {
  const response = await fetch("/api/folders?tree=true&includeNotes=true");

  if (!response.ok) {
    let errorMessage = "Erreur lors du chargement des dossiers";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: FoldersTreeWithNotesResponse = await response.json();
  return data.data;
}

/**
 * Create a new folder
 */
async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const response = await fetch("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Erreur lors de la création du dossier";
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
 * Delete a folder
 */
async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(`/api/folders/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Erreur lors de la suppression du dossier";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

export interface UseFoldersOptions {
  /** Whether to fetch as tree structure */
  tree?: boolean;
  /** Whether to include notes in tree structure (requires tree=true) */
  includeNotes?: boolean;
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Hook to fetch and manage folders
 *
 * @example
 * ```tsx
 * // Flat list with counts
 * const { folders, isLoading, createFolder, deleteFolder } = useFolders();
 *
 * // Hierarchical tree
 * const { folders, isLoading } = useFolders({ tree: true });
 *
 * // Hierarchical tree with notes included
 * const { folders, isLoading } = useFolders({ tree: true, includeNotes: true });
 *
 * // Create a new folder
 * createFolder({ name: "Nouveau dossier" });
 *
 * // Create a subfolder
 * createFolder({ name: "Sous-dossier", parentId: "parent-folder-id" });
 *
 * // Delete a folder
 * deleteFolder("folder-id");
 * ```
 */
export function useFolders(options: UseFoldersOptions = {}) {
  const { tree = false, includeNotes = false, enabled = true } = options;
  const queryClient = useQueryClient();

  // Query for fetching folders list (flat)
  const listQuery = useQuery({
    queryKey: folderKeys.list(),
    queryFn: fetchFolders,
    enabled: enabled && !tree,
    staleTime: 60 * 1000, // 1 minute
  });

  // Query for fetching folders tree (hierarchical)
  const treeQuery = useQuery({
    queryKey: folderKeys.tree(),
    queryFn: fetchFoldersTree,
    enabled: enabled && tree && !includeNotes,
    staleTime: 60 * 1000, // 1 minute
  });

  // Query for fetching folders tree with notes
  const treeWithNotesQuery = useQuery({
    queryKey: folderKeys.treeWithNotes(),
    queryFn: fetchFoldersTreeWithNotes,
    enabled: enabled && tree && includeNotes,
    staleTime: 60 * 1000, // 1 minute
  });

  // Use the appropriate query based on mode
  const query = tree
    ? (includeNotes ? treeWithNotesQuery : treeQuery)
    : listQuery;

  // Mutation for creating a folder
  const createMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      // Invalidate both list and tree to refresh
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });

  // Mutation for deleting a folder
  const deleteMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: (_, deletedId) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: folderKeys.detail(deletedId) });
      // Invalidate both list and tree to refresh
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });

  return {
    /** The folders (list or tree depending on options) */
    folders: (query.data ?? []) as typeof tree extends true
      ? FolderWithChildren[]
      : FolderWithCount[],
    /** Whether folders are loading */
    isLoading: query.isLoading,
    /** Whether folders are being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Whether a folder is being created */
    isCreating: createMutation.isPending,
    /** Error if create failed */
    createError: createMutation.error as Error | null,
    /** Create a new folder */
    createFolder: createMutation.mutate,
    /** Create a new folder (async) */
    createFolderAsync: createMutation.mutateAsync,
    /** Whether a folder is being deleted */
    isDeleting: deleteMutation.isPending,
    /** Error if delete failed */
    deleteError: deleteMutation.error as Error | null,
    /** Delete a folder */
    deleteFolder: deleteMutation.mutate,
    /** Delete a folder (async) */
    deleteFolderAsync: deleteMutation.mutateAsync,
    /** Refetch the folders */
    refetch: query.refetch,
  };
}
