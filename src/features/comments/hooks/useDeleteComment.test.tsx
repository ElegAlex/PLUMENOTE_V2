/**
 * Tests for useDeleteComment hook
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #8 - Supprimer son commentaire
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeleteComment } from "./useDeleteComment";

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

describe("useDeleteComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useDeleteComment(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.deleteComment).toBe("function");
    });
  });

  describe("deleteComment", () => {
    it("should delete comment successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1", onSuccess }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteComment("comment-1");
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/comments/comment-1", {
        method: "DELETE",
      });

      expect(onSuccess).toHaveBeenCalledWith("comment-1");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Non autorisé à supprimer" }),
      });

      const onError = vi.fn();
      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1", onError }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Non autorisé à supprimer");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle not found errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Commentaire non trouvé" }),
      });

      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteComment("non-existent");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Commentaire non trouvé");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });

  describe("deleteCommentAsync", () => {
    it("should resolve on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.deleteCommentAsync("comment-1");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/comments/comment-1", {
        method: "DELETE",
      });
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Forbidden" }),
      });

      const { result } = renderHook(
        () => useDeleteComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.deleteCommentAsync("comment-1");
        })
      ).rejects.toThrow("Forbidden");
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
        () => useDeleteComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.deleteComment("comment-1");
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

  describe("without noteId", () => {
    it("should still work without noteId (no cache invalidation)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useDeleteComment({ onSuccess }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.deleteComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith("comment-1");
    });
  });
});
