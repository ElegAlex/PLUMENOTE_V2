"use client";

/**
 * React Query hook for notes list operations
 *
 * Provides data fetching for notes list with search and pagination.
 *
 * @see Story 3.3: Liste des Notes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "./useNote";
import type { Note, NotesListResponse, CreateNoteInput } from "../types";

export interface UseNotesOptions {
  /** Search query to filter notes */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Whether to fetch immediately */
  enabled?: boolean;
}

/**
 * Fetch notes list from API
 */
async function fetchNotes(options: UseNotesOptions = {}): Promise<NotesListResponse> {
  const { search, page = 1, pageSize = 20 } = options;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

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
 * Delete a note by ID
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
 * Hook to fetch and manage notes list
 *
 * @example
 * ```tsx
 * const { notes, isLoading, createNote, deleteNote } = useNotes({ search: "hello" });
 *
 * // Create a new note
 * const newNote = await createNoteAsync({ title: "My Note" });
 *
 * // Delete a note
 * deleteNote("note-id");
 * ```
 */
export function useNotes(options: UseNotesOptions = {}) {
  const { search, page = 1, pageSize = 20, enabled = true } = options;
  const queryClient = useQueryClient();

  // Query for fetching notes list
  const query = useQuery({
    queryKey: noteKeys.list({ search, page, pageSize }),
    queryFn: () => fetchNotes({ search, page, pageSize }),
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

  // Mutation for deleting a note
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(deletedId) });
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
    /** Delete a note */
    deleteNote: deleteMutation.mutate,
    /** Delete a note (async) */
    deleteNoteAsync: deleteMutation.mutateAsync,
    /** Refetch the notes list */
    refetch: query.refetch,
  };
}
