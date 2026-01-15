"use client";

/**
 * React Query hook for folders in a workspace
 *
 * Provides data fetching for folders that user can access in a specific workspace.
 * Used for selecting destination folder when sharing notes.
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Folder type for workspace folder selection
 */
export interface WorkspaceFolder {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Query keys for workspace folders
 */
export const workspaceFoldersKeys = {
  all: ["workspaces", "folders"] as const,
  list: (workspaceId: string) => ["workspaces", workspaceId, "folders"] as const,
};

/**
 * Workspace folders response type
 */
interface WorkspaceFoldersResponse {
  data: WorkspaceFolder[];
}

/**
 * Options for useFoldersInWorkspace hook
 */
export interface UseFoldersInWorkspaceOptions {
  /** Whether to fetch immediately (default: true if workspaceId provided) */
  enabled?: boolean;
}

/**
 * Fetch folders in a workspace from API
 */
async function fetchFoldersInWorkspace(workspaceId: string): Promise<WorkspaceFoldersResponse> {
  const response = await fetch(`/api/workspaces/${workspaceId}/folders`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch folders";
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
 * Hook to fetch folders in a workspace
 *
 * @param workspaceId - ID of the workspace to fetch folders from
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { folders, isLoading, error } = useFoldersInWorkspace(selectedWorkspaceId);
 *
 * // Use in a Select component
 * {folders?.map((folder) => (
 *   <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
 * ))}
 * ```
 */
export function useFoldersInWorkspace(
  workspaceId: string | undefined,
  options: UseFoldersInWorkspaceOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: workspaceId ? workspaceFoldersKeys.list(workspaceId) : ["disabled"],
    queryFn: () => fetchFoldersInWorkspace(workspaceId!),
    enabled: enabled && !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    folders: query.data?.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
