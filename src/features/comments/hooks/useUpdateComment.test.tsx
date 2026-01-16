/**
 * Tests for useUpdateComment hook
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #8 - Modifier son commentaire
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateComment } from "./useUpdateComment";
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
      mutations: {
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

/**
 * Mock comment data factory
 */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    content: "Updated comment",
    anchorStart: 10,
    anchorEnd: 20,
    resolved: false,
    noteId: "note-1",
    parentId: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    updatedAt: new Date("2026-01-16T11:00:00Z"),
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Test User", avatar: null },
    ...overrides,
  };
}

describe("useUpdateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useUpdateComment(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.updateComment).toBe("function");
    });
  });

  describe("updateComment", () => {
    it("should update comment content successfully", async () => {
      const mockComment = createMockComment({ content: "New content" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1", onSuccess }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateComment({
          commentId: "comment-1",
          input: { content: "New content" },
        });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/comments/comment-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "New content" }),
        })
      );

      expect(onSuccess).toHaveBeenCalledWith(mockComment);
    });

    it("should update comment resolved status", async () => {
      const mockComment = createMockComment({ resolved: true });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateComment({
          commentId: "comment-1",
          input: { resolved: true },
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/comments/comment-1",
        expect.objectContaining({
          body: JSON.stringify({ resolved: true }),
        })
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Non autorisé" }),
      });

      const onError = vi.fn();
      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1", onError }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateComment({
          commentId: "comment-1",
          input: { content: "test" },
        });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Non autorisé");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle not found errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Commentaire non trouvé" }),
      });

      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateComment({
          commentId: "non-existent",
          input: { content: "test" },
        });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Commentaire non trouvé");
    });
  });

  describe("updateCommentAsync", () => {
    it("should return the updated comment", async () => {
      const mockComment = createMockComment({ content: "Async update" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      let response: { data: Comment } | undefined;

      await act(async () => {
        response = await result.current.updateCommentAsync({
          commentId: "comment-1",
          input: { content: "Async update" },
        });
      });

      expect(response?.data.content).toBe("Async update");
    });
  });

  describe("reset", () => {
    it("should reset mutation state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Error" }),
      });

      const { result } = renderHook(
        () => useUpdateComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateComment({
          commentId: "comment-1",
          input: { content: "" },
        });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
