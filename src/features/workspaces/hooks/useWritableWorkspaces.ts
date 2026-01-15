"use client";

/**
 * React Query hook for writable workspaces
 *
 * Provides data fetching for workspaces where user can create/edit notes.
 * Used for sharing notes from personal workspace to team workspaces.
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { useQuery } from "@tanstack/react-query";
import type { WritableWorkspace } from "../services/permissions.service";

/**
 * Query keys for writable workspaces
 */
export const writableWorkspaceKeys = {
  all: ["workspaces", "writable"] as const,
  list: () => ["workspaces", "writable", "list"] as const,
};

/**
 * Writable workspaces response type
 */
interface WritableWorkspacesResponse {
  data: WritableWorkspace[];
}

/**
 * Options for useWritableWorkspaces hook
 */
export interface UseWritableWorkspacesOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Fetch writable workspaces from API
 */
async function fetchWritableWorkspaces(): Promise<WritableWorkspacesResponse> {
  const response = await fetch("/api/workspaces/writable");

  if (!response.ok) {
    let errorMessage = "Failed to fetch writable workspaces";
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
 * Hook to fetch workspaces where user can create/edit notes
 *
 * Returns only team workspaces (excludes personal) where user is:
 * - Owner
 * - Member with ADMIN or EDITOR role
 *
 * @example
 * ```tsx
 * const { workspaces, isLoading, error } = useWritableWorkspaces();
 *
 * // Use in a Select component
 * {workspaces?.map((ws) => (
 *   <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
 * ))}
 * ```
 */
export function useWritableWorkspaces(options: UseWritableWorkspacesOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: writableWorkspaceKeys.list(),
    queryFn: fetchWritableWorkspaces,
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    workspaces: query.data?.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
