"use client";

/**
 * React Query hook for notes list operations
 *
 * Provides data fetching for notes list with search, pagination, filtering, and sorting.
 *
 * @see Story 3.3: Liste des Notes
 * @see Story 3.5: Organisation des Notes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "./useNote";
import type { Note, NotesListResponse, CreateNoteInput } from "../types";

/** Sort field options */
export type NoteSortField = "updatedAt" | "createdAt" | "title" | "sortOrder";

/** Sort direction options */
export type SortDirection = "asc" | "desc";

export interface UseNotesOptions {
  /** Search query to filter notes */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Filter to favorites only */
  favoriteOnly?: boolean;
  /** Filter by tag IDs */
  tagIds?: string[];
  /** Sort field */
  sortBy?: NoteSortField;
  /** Sort direction */
  sortDir?: SortDirection;
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Fetch notes list from API
 */
async function fetchNotes(options: UseNotesOptions = {}): Promise<NotesListResponse> {
  const {
    search,
    page = 1,
    pageSize = 20,
    favoriteOnly,
    tagIds,
    sortBy = "updatedAt",
    sortDir = "desc",
  } = options;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (favoriteOnly) params.set("favoriteOnly", "true");
  if (tagIds?.length) params.set("tagIds", tagIds.join(","));
  params.set("sortBy", sortBy);
  params.set("sortDir", sortDir);

  const response = await fetch(`/api/notes?${params.toString()}`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch notes";
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
 * Toggle favorite status for a note
 */
async function toggleFavorite(noteId: string): Promise<Note> {
  const response = await fetch(`/api/notes/${noteId}/favorite`, {
    method: "POST",
  });

  if (!response.ok) {
    let errorMessage = "Failed to toggle favorite";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a new note
 */
async function createNote(input: CreateNoteInput = {}): Promise<Note> {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = "Failed to create note";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete a note by ID (soft delete)
 *
 * @see Story 3.5: Suppression d'une Note
 */
async function deleteNote(id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    let errorMessage = "Failed to delete note";
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
 * Restore a soft-deleted note
 *
 * @see Story 3.5: Suppression d'une Note
 */
async function restoreNote(id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}/restore`, {
    method: "POST",
  });

  if (!response.ok) {
    let errorMessage = "Failed to restore note";
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
 * Hook to fetch and manage notes list
 *
 * @example
 * ```tsx
 * const { notes, isLoading, createNote, deleteNote, toggleFavorite } = useNotes({
 *   search: "hello",
 *   favoriteOnly: true,
 *   sortBy: "title",
 * });
 *
 * // Create a new note
 * const newNote = await createNoteAsync({ title: "My Note" });
 *
 * // Delete a note
 * deleteNote("note-id");
 *
 * // Toggle favorite
 * toggleFavorite("note-id");
 * ```
 */
export function useNotes(options: UseNotesOptions = {}) {
  const {
    search,
    page = 1,
    pageSize = 20,
    favoriteOnly,
    tagIds,
    sortBy = "updatedAt",
    sortDir = "desc",
    enabled = true,
  } = options;
  const queryClient = useQueryClient();

  // Query for fetching notes list
  const query = useQuery({
    queryKey: noteKeys.list({ search, page, pageSize, favoriteOnly, tagIds, sortBy, sortDir }),
    queryFn: () => fetchNotes({ search, page, pageSize, favoriteOnly, tagIds, sortBy, sortDir }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Mutation for creating a note
  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      // Invalidate list queries to refresh
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  // Mutation for deleting a note (soft delete)
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(deletedId) });
      // Invalidate list queries to refresh
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  // Mutation for restoring a soft-deleted note (Story 3.5)
  const restoreMutation = useMutation({
    mutationFn: restoreNote,
    onSuccess: () => {
      // Invalidate list queries to refresh (note will reappear)
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  // Mutation for toggling favorite
  const favoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (updatedNote) => {
      // Update the note in cache
      queryClient.setQueryData(noteKeys.detail(updatedNote.id), { data: updatedNote });
      // Invalidate list queries to refresh
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });

  return {
    /** The notes list */
    notes: query.data?.data ?? [],
    /** Pagination metadata */
    meta: query.data?.meta,
    /** Whether notes are loading */
    isLoading: query.isLoading,
    /** Whether notes are being fetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Whether a note is being created */
    isCreating: createMutation.isPending,
    /** Error if create failed */
    createError: createMutation.error as Error | null,
    /** Create a new note */
    createNote: createMutation.mutate,
    /** Create a new note (async) */
    createNoteAsync: createMutation.mutateAsync,
    /** Whether a note is being deleted */
    isDeleting: deleteMutation.isPending,
    /** Error if delete failed */
    deleteError: deleteMutation.error as Error | null,
    /** Delete a note (soft delete) */
    deleteNote: deleteMutation.mutate,
    /** Delete a note (async, soft delete) */
    deleteNoteAsync: deleteMutation.mutateAsync,
    /** Whether a note is being restored */
    isRestoring: restoreMutation.isPending,
    /** Error if restore failed */
    restoreError: restoreMutation.error as Error | null,
    /** Restore a soft-deleted note */
    restoreNote: restoreMutation.mutate,
    /** Restore a soft-deleted note (async) */
    restoreNoteAsync: restoreMutation.mutateAsync,
    /** Whether favorite is being toggled */
    isTogglingFavorite: favoriteMutation.isPending,
    /** Error if toggle failed */
    toggleFavoriteError: favoriteMutation.error as Error | null,
    /** Toggle favorite status */
    toggleFavorite: favoriteMutation.mutate,
    /** Toggle favorite status (async) */
    toggleFavoriteAsync: favoriteMutation.mutateAsync,
    /** Refetch the notes list */
    refetch: query.refetch,
  };
}
