/**
 * Tests for useCreateComment hook
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #2 - Sauvegarde via API POST
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateComment } from "./useCreateComment";
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

describe("useCreateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useCreateComment("note-1"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createComment).toBe("function");
      expect(typeof result.current.createCommentAsync).toBe("function");
    });
  });

  describe("createComment", () => {
    it("should create a comment successfully", async () => {
      const mockComment = createMockComment({ id: "new-comment" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useCreateComment("note-1", { onSuccess }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.createComment({
          content: "Test comment",
          anchorStart: 10,
          anchorEnd: 20,
        });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notes/note-1/comments",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "Test comment",
            anchorStart: 10,
            anchorEnd: 20,
          }),
        })
      );

      expect(onSuccess).toHaveBeenCalledWith(mockComment);
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Contenu requis" }),
      });

      const onError = vi.fn();
      const { result } = renderHook(
        () => useCreateComment("note-1", { onError }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.createComment({
          content: "",
          anchorStart: 10,
          anchorEnd: 20,
        });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Contenu requis");
      expect(onError).toHaveBeenCalled();
    });

    it("should throw error when noteId is undefined", async () => {
      const { result } = renderHook(() => useCreateComment(undefined), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.createComment({
          content: "Test",
          anchorStart: 10,
          anchorEnd: 20,
        });
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Note ID is required");
    });
  });

  describe("createCommentAsync", () => {
    it("should return the created comment", async () => {
      const mockComment = createMockComment({ id: "async-comment" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(() => useCreateComment("note-1"), {
        wrapper: createWrapper(),
      });

      let response: { data: Comment } | undefined;

      await act(async () => {
        response = await result.current.createCommentAsync({
          content: "Async comment",
          anchorStart: 5,
          anchorEnd: 15,
        });
      });

      expect(response?.data.id).toBe("async-comment");
    });
  });

  describe("reset", () => {
    it("should reset mutation state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Error" }),
      });

      const { result } = renderHook(() => useCreateComment("note-1"), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.createComment({
          content: "",
          anchorStart: 0,
          anchorEnd: 0,
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

      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("with parentId (replies)", () => {
    it("should include parentId when creating a reply", async () => {
      const mockComment = createMockComment({
        id: "reply-comment",
        parentId: "parent-comment",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(() => useCreateComment("note-1"), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.createComment({
          content: "This is a reply",
          anchorStart: 10,
          anchorEnd: 20,
          parentId: "parent-comment",
        });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notes/note-1/comments",
        expect.objectContaining({
          body: JSON.stringify({
            content: "This is a reply",
            anchorStart: 10,
            anchorEnd: 20,
            parentId: "parent-comment",
          }),
        })
      );
    });
  });
});
