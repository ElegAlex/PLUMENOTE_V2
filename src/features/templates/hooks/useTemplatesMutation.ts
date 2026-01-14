"use client";

/**
 * React Query mutations for templates CRUD operations
 *
 * Provides create, update, and delete mutations for templates.
 * Handles cache invalidation automatically.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templateKeys } from "./useTemplates";
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateResponse,
} from "../types";

/**
 * Create a new template via API
 */
async function createTemplateApi(
  data: CreateTemplateInput
): Promise<Template> {
  const response = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to create template";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result: TemplateResponse = await response.json();
  return result.data;
}

/**
 * Update an existing template via API
 */
async function updateTemplateApi(
  id: string,
  data: UpdateTemplateInput
): Promise<Template> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update template";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result: TemplateResponse = await response.json();
  return result.data;
}

/**
 * Delete a template via API
 */
async function deleteTemplateApi(id: string): Promise<void> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to delete template";
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
 * Return type for useTemplatesMutation hook
 */
export interface UseTemplatesMutationReturn {
  /** Trigger create mutation */
  createTemplate: (data: CreateTemplateInput) => void;
  /** Trigger create mutation and return promise */
  createTemplateAsync: (data: CreateTemplateInput) => Promise<Template>;
  /** Whether create mutation is pending */
  isCreating: boolean;
  /** Error from create mutation */
  createError: Error | null;

  /** Trigger update mutation */
  updateTemplate: (params: { id: string; data: UpdateTemplateInput }) => void;
  /** Trigger update mutation and return promise */
  updateTemplateAsync: (params: {
    id: string;
    data: UpdateTemplateInput;
  }) => Promise<Template>;
  /** Whether update mutation is pending */
  isUpdating: boolean;
  /** Error from update mutation */
  updateError: Error | null;

  /** Trigger delete mutation */
  deleteTemplate: (id: string) => void;
  /** Trigger delete mutation and return promise */
  deleteTemplateAsync: (id: string) => Promise<void>;
  /** Whether delete mutation is pending */
  isDeleting: boolean;
  /** Error from delete mutation */
  deleteError: Error | null;
}

/**
 * Hook for template CRUD mutations
 *
 * Provides create, update, and delete operations with automatic
 * cache invalidation on success.
 *
 * @returns Mutation functions and states
 *
 * @example
 * ```tsx
 * const {
 *   createTemplateAsync,
 *   isCreating,
 *   updateTemplateAsync,
 *   deleteTemplateAsync,
 * } = useTemplatesMutation();
 *
 * // Create
 * await createTemplateAsync({ name: "New", content: "..." });
 *
 * // Update
 * await updateTemplateAsync({ id: "123", data: { name: "Updated" } });
 *
 * // Delete
 * await deleteTemplateAsync("123");
 * ```
 */
export function useTemplatesMutation(): UseTemplatesMutationReturn {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createTemplateApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      updateTemplateApi(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplateApi,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.list() });
      queryClient.removeQueries({ queryKey: templateKeys.detail(deletedId) });
    },
  });

  return {
    createTemplate: createMutation.mutate,
    createTemplateAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateTemplate: updateMutation.mutate,
    updateTemplateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteTemplate: deleteMutation.mutate,
    deleteTemplateAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
