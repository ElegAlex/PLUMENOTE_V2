/**
 * Tests for useComments hook
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #5 - Liste des commentaires triés par position
 * @see AC: #7 - Mises à jour temps réel (polling)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useComments, commentsKeys } from "./useComments";
import type { Comment } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Create a wrapper with React Query provider
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Mock comment data factory
 */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    content: "Test comment",
    anchorStart: 10,
    anchorEnd: 20,
    resolved: false,
    noteId: "note-1",
    parentId: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    updatedAt: new Date("2026-01-16T10:00:00Z"),
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Test User", avatar: null },
    ...overrides,
  };
}

describe("useComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial fetch", () => {
    it("should return loading state initially", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
        }),
      });

      const { result } = renderHook(
        () => useComments("note-1", { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.comments).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should fetch comments when enabled", async () => {
      const mockComments = [
        createMockComment({ id: "c1", anchorStart: 10 }),
        createMockComment({ id: "c2", anchorStart: 50 }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockComments,
          meta: { total: 2, page: 1, pageSize: 100, totalPages: 1 },
        }),
      });

      const { result } = renderHook(
        () => useComments("note-1", { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.comments).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/note-1/comments")
      );
    });

    it("should not fetch when disabled", async () => {
      const { result } = renderHook(
        () => useComments("note-1", { enabled: false, refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.comments).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not fetch when noteId is undefined", async () => {
      const { result } = renderHook(
        () => useComments(undefined, { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.comments).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("sorting", () => {
    it("should request comments sorted by anchorStart", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
        }),
      });

      renderHook(() => useComments("note-1", { refetchInterval: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toBeDefined();
      expect(url).toContain("sortBy=anchorStart");
      expect(url).toContain("sortDir=asc");
    });
  });

  describe("filtering", () => {
    it("should filter by resolved status when specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
        }),
      });

      renderHook(
        () => useComments("note-1", { resolved: true, refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toBeDefined();
      expect(url).toContain("resolved=true");
    });

    it("should not include resolved param when not specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
        }),
      });

      renderHook(() => useComments("note-1", { refetchInterval: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0]?.[0] as string | undefined;
      expect(url).toBeDefined();
      expect(url).not.toContain("resolved=");
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Erreur serveur" }),
      });

      const { result } = renderHook(
        () => useComments("note-1", { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Erreur serveur");
      expect(result.current.comments).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () => useComments("note-1", { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });

  describe("query keys", () => {
    it("should export correct query keys", () => {
      expect(commentsKeys.all).toEqual(["comments"]);
      expect(commentsKeys.list("note-123")).toEqual([
        "comments",
        "list",
        "note-123",
      ]);
      expect(commentsKeys.detail("comment-456")).toEqual([
        "comments",
        "detail",
        "comment-456",
      ]);
    });
  });

  describe("refetch", () => {
    it("should provide refetch function", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [createMockComment()],
          meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        }),
      });

      const { result } = renderHook(
        () => useComments("note-1", { refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");

      // Call refetch
      await result.current.refetch();

      // Should have been called twice (initial + refetch)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
