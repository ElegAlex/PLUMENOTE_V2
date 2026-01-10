/**
 * Unit tests for useNotes hook
 *
 * Tests data fetching, mutations, and error handling.
 *
 * @see Story 3.3: Liste des Notes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotes } from "./useNotes";
import type { Note, NotesListResponse } from "../types";

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Test Note 1",
    content: "<p>Content 1</p>",
    userId: "user-1",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T12:00:00Z"),
  },
  {
    id: "note-2",
    title: "Test Note 2",
    content: "<p>Content 2</p>",
    userId: "user-1",
    createdAt: new Date("2024-01-14T10:00:00Z"),
    updatedAt: new Date("2024-01-14T12:00:00Z"),
  },
];

const mockResponse: NotesListResponse = {
  data: mockNotes,
  meta: {
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

describe("useNotes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetching notes", () => {
    it("should fetch notes successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notes).toEqual(mockNotes);
      expect(result.current.meta).toEqual(mockResponse.meta);
    });

    it("should include search param in fetch URL", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderHook(() => useNotes({ search: "hello" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(fetchCall).toContain("search=hello");
    });

    it("should include pagination params in fetch URL", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderHook(() => useNotes({ page: 2, pageSize: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(fetchCall).toContain("page=2");
      expect(fetchCall).toContain("pageSize=10");
    });

    it("should not fetch when enabled is false", () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderHook(() => useNotes({ enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: () =>
          Promise.resolve({ detail: "Something went wrong" }),
      });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Something went wrong");
    });
  });

  describe("createNote mutation", () => {
    it("should create a note successfully", async () => {
      const newNote: Note = {
        id: "note-new",
        title: "New Note",
        content: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: newNote }),
        });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createdNote = await result.current.createNoteAsync({
        title: "New Note",
      });

      expect(createdNote).toEqual(newNote);
    });

    it("should handle create error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Bad Request",
          json: () => Promise.resolve({ detail: "Validation failed" }),
        });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.createNoteAsync({ title: "" })
      ).rejects.toThrow("Validation failed");
    });
  });

  describe("deleteNote mutation", () => {
    it("should delete a note successfully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteNoteAsync("note-1");

      // Should complete without error
      expect(result.current.deleteError).toBeNull();
    });

    it("should handle delete error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Not Found",
          json: () => Promise.resolve({ detail: "Note not found" }),
        });

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.deleteNoteAsync("invalid-id")
      ).rejects.toThrow("Note not found");
    });
  });

  describe("initial state", () => {
    it("should return empty notes array initially", () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to test initial state
          })
      );

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      expect(result.current.notes).toEqual([]);
      expect(result.current.meta).toBeUndefined();
    });

    it("should have correct initial loading state", () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve
          })
      );

      const { result } = renderHook(() => useNotes(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });
});
