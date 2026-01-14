"use client";

/**
 * React Query hook for workspaces list
 *
 * Provides data fetching for user workspaces.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { useQuery } from "@tanstack/react-query";
import type { WorkspacesListResponse, Workspace } from "../types";

/**
 * Query keys for workspaces
 */
export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => ["workspaces", "list"] as const,
  detail: (id: string) => ["workspaces", "detail", id] as const,
};

/**
 * Options for useWorkspaces hook
 */
export interface UseWorkspacesOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Fetch workspaces from API
 */
async function fetchWorkspaces(): Promise<WorkspacesListResponse> {
  const response = await fetch("/api/workspaces");

  if (!response.ok) {
    let errorMessage = "Failed to fetch workspaces";
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
 * Fetch single workspace by ID from API
 */
async function fetchWorkspaceById(id: string): Promise<Workspace> {
  const response = await fetch(`/api/workspaces/${id}`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch workspace";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Hook to fetch all workspaces for the current user
 *
 * @param options - Hook options
 * @returns React Query result with workspaces list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useWorkspaces();
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 * return <WorkspaceList workspaces={data.data} />;
 * ```
 */
export function useWorkspaces(options: UseWorkspacesOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: fetchWorkspaces,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Options for useWorkspace hook
 */
export interface UseWorkspaceOptions {
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch a single workspace by ID
 *
 * @param id - Workspace ID
 * @param options - Hook options
 * @returns React Query result with workspace
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useWorkspace("workspace-id");
 * ```
 */
export function useWorkspace(id: string, options: UseWorkspaceOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => fetchWorkspaceById(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
