"use client";

/**
 * React Query mutations for workspaces CRUD operations
 *
 * Provides create, update, and delete mutations for workspaces.
 * Handles cache invalidation automatically.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "./useWorkspaces";
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceResponse,
} from "../types";

/**
 * Create a new workspace via API
 */
async function createWorkspaceApi(
  data: CreateWorkspaceInput
): Promise<Workspace> {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to create workspace";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result: WorkspaceResponse = await response.json();
  return result.data;
}

/**
 * Update an existing workspace via API
 */
async function updateWorkspaceApi(
  id: string,
  data: UpdateWorkspaceInput
): Promise<Workspace> {
  const response = await fetch(`/api/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update workspace";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result: WorkspaceResponse = await response.json();
  return result.data;
}

/**
 * Delete a workspace via API
 */
async function deleteWorkspaceApi(id: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to delete workspace";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Move notes from one workspace to another
 */
async function moveNotesApi(
  sourceWorkspaceId: string,
  targetWorkspaceId: string
): Promise<void> {
  const response = await fetch(`/api/workspaces/${sourceWorkspaceId}/move-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetWorkspaceId }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to move notes";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Return type for useWorkspacesMutation hook
 */
export interface UseWorkspacesMutationReturn {
  /** Trigger create mutation */
  createWorkspace: (data: CreateWorkspaceInput) => void;
  /** Trigger create mutation and return promise */
  createWorkspaceAsync: (data: CreateWorkspaceInput) => Promise<Workspace>;
  /** Whether create mutation is pending */
  isCreating: boolean;
  /** Error from create mutation */
  createError: Error | null;

  /** Trigger update mutation */
  updateWorkspace: (params: { id: string; data: UpdateWorkspaceInput }) => void;
  /** Trigger update mutation and return promise */
  updateWorkspaceAsync: (params: {
    id: string;
    data: UpdateWorkspaceInput;
  }) => Promise<Workspace>;
  /** Whether update mutation is pending */
  isUpdating: boolean;
  /** Error from update mutation */
  updateError: Error | null;

  /** Trigger delete mutation */
  deleteWorkspace: (id: string) => void;
  /** Trigger delete mutation and return promise */
  deleteWorkspaceAsync: (id: string) => Promise<void>;
  /** Whether delete mutation is pending */
  isDeleting: boolean;
  /** Error from delete mutation */
  deleteError: Error | null;

  /** Move notes from one workspace to another */
  moveNotes: (params: { sourceId: string; targetId: string }) => void;
  /** Move notes and return promise */
  moveNotesAsync: (params: { sourceId: string; targetId: string }) => Promise<void>;
  /** Whether move mutation is pending */
  isMoving: boolean;
  /** Error from move mutation */
  moveError: Error | null;
}

/**
 * Hook for workspace CRUD mutations
 *
 * Provides create, update, delete, and move operations with automatic
 * cache invalidation on success.
 *
 * @returns Mutation functions and states
 *
 * @example
 * ```tsx
 * const {
 *   createWorkspaceAsync,
 *   isCreating,
 *   updateWorkspaceAsync,
 *   deleteWorkspaceAsync,
 * } = useWorkspacesMutation();
 *
 * // Create
 * await createWorkspaceAsync({ name: "New Workspace" });
 *
 * // Update
 * await updateWorkspaceAsync({ id: "123", data: { name: "Updated" } });
 *
 * // Delete
 * await deleteWorkspaceAsync("123");
 * ```
 */
export function useWorkspacesMutation(): UseWorkspacesMutationReturn {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createWorkspaceApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceInput }) =>
      updateWorkspaceApi(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspaceApi,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(deletedId) });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      moveNotesApi(sourceId, targetId),
    onSuccess: (_, { sourceId, targetId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(sourceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(targetId) });
    },
  });

  return {
    createWorkspace: createMutation.mutate,
    createWorkspaceAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateWorkspace: updateMutation.mutate,
    updateWorkspaceAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteWorkspace: deleteMutation.mutate,
    deleteWorkspaceAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    moveNotes: moveMutation.mutate,
    moveNotesAsync: moveMutation.mutateAsync,
    isMoving: moveMutation.isPending,
    moveError: moveMutation.error,
  };
}
