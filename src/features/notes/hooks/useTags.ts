"use client";

/**
 * React Query hook for tags operations
 *
 * Provides data fetching and mutations for tags CRUD.
 *
 * @see Story 3.5: Organisation des Notes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tag, CreateTagInput, UpdateTagInput } from "../types";

/**
 * Query key factory for tags
 */
export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: () => tagKeys.lists(),
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
};

interface TagsResponse {
  data: Tag[];
}

interface TagResponse {
  data: Tag;
}

/**
 * Fetch all tags for the current user
 */
async function fetchTags(): Promise<Tag[]> {
  const response = await fetch("/api/tags");

  if (!response.ok) {
    let errorMessage = "Failed to fetch tags";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: TagsResponse = await response.json();
  return data.data;
}

/**
 * Create a new tag
 */
async function createTag(input: CreateTagInput): Promise<Tag> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Failed to create tag";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: TagResponse = await response.json();
  return data.data;
}

/**
 * Update an existing tag
 */
async function updateTag({
  id,
  ...input
}: UpdateTagInput & { id: string }): Promise<Tag> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update tag";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: TagResponse = await response.json();
  return data.data;
}

/**
 * Delete a tag
 */
async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to delete tag";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

export interface UseTagsOptions {
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Hook to fetch and manage tags
 *
 * @example
 * ```tsx
 * const { tags, isLoading, createTag, updateTag, deleteTag } = useTags();
 *
 * // Create a new tag
 * createTag({ name: "Work", color: "#3b82f6" });
 *
 * // Update a tag
 * updateTag({ id: "tag-id", name: "Personal" });
 *
 * // Delete a tag
 * deleteTag("tag-id");
 * ```
 */
export function useTags(options: UseTagsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // Query for fetching tags list
  const query = useQuery({
    queryKey: tagKeys.list(),
    queryFn: fetchTags,
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation for creating a tag
  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      // Invalidate tags list to refresh
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  // Mutation for updating a tag
  const updateMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: (updatedTag) => {
      // Update tag in cache
      queryClient.setQueryData(tagKeys.detail(updatedTag.id), updatedTag);
      // Invalidate tags list to refresh
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  // Mutation for deleting a tag
  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: tagKeys.detail(deletedId) });
      // Invalidate tags list to refresh
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });

  return {
    /** The tags list */
    tags: query.data ?? [],
    /** Whether tags are loading */
    isLoading: query.isLoading,
    /** Whether tags are being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Whether a tag is being created */
    isCreating: createMutation.isPending,
    /** Error if create failed */
    createError: createMutation.error as Error | null,
    /** Create a new tag */
    createTag: createMutation.mutate,
    /** Create a new tag (async) */
    createTagAsync: createMutation.mutateAsync,
    /** Whether a tag is being updated */
    isUpdating: updateMutation.isPending,
    /** Error if update failed */
    updateError: updateMutation.error as Error | null,
    /** Update a tag */
    updateTag: updateMutation.mutate,
    /** Update a tag (async) */
    updateTagAsync: updateMutation.mutateAsync,
    /** Whether a tag is being deleted */
    isDeleting: deleteMutation.isPending,
    /** Error if delete failed */
    deleteError: deleteMutation.error as Error | null,
    /** Delete a tag */
    deleteTag: deleteMutation.mutate,
    /** Delete a tag (async) */
    deleteTagAsync: deleteMutation.mutateAsync,
    /** Refetch the tags list */
    refetch: query.refetch,
  };
}
