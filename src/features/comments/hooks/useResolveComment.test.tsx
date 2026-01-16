/**
 * useResolveComment Hook Tests
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #4 - Marquer comme résolu
 * @see AC: #7 - Rouvrir un commentaire
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResolveComment } from "./useResolveComment";
import type { Comment } from "../types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
};

const mockComment: Comment = {
  id: "comment-1",
  content: "Test comment",
  anchorStart: 10,
  anchorEnd: 25,
  resolved: false,
  noteId: "note-1",
  parentId: null,
  createdAt: new Date("2026-01-10T10:00:00Z"),
  updatedAt: new Date("2026-01-10T10:00:00Z"),
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Test User", avatar: null },
};

const mockResolvedComment: Comment = {
  ...mockComment,
  resolved: true,
};

describe("useResolveComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state with resolve and unresolve functions", () => {
    const { result } = renderHook(
      () => useResolveComment({ noteId: "note-1" }),
      { wrapper: createWrapper() }
    );

    expect(result.current.resolveComment).toBeDefined();
    expect(result.current.unresolveComment).toBeDefined();
    expect(result.current.isResolving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe("resolveComment", () => {
    it("calls API with resolved: true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResolvedComment }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.resolveComment("comment-1");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/comments/comment-1",
          expect.objectContaining({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolved: true }),
          })
        );
      });
    });

    it("sets isResolving to true while request is pending", async () => {
      let resolvePromise: (value: Comment) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.resolveComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.isResolving).toBe(true);
      });

      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ data: mockResolvedComment }),
        });
      });

      await waitFor(() => {
        expect(result.current.isResolving).toBe(false);
      });
    });

    it("calls onSuccess callback with updated comment", async () => {
      const onSuccess = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResolvedComment }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1", onSuccess }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.resolveComment("comment-1");
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockResolvedComment);
      });
    });

    it("sets error when request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({ detail: "Permission denied" }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.resolveComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe("Permission denied");
      });
    });
  });

  describe("unresolveComment", () => {
    it("calls API with resolved: false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.unresolveComment("comment-1");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/comments/comment-1",
          expect.objectContaining({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolved: false }),
          })
        );
      });
    });

    it("calls onSuccess callback with updated comment", async () => {
      const onSuccess = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockComment }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1", onSuccess }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.unresolveComment("comment-1");
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockComment);
      });
    });

    it("sets error when request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({ detail: "Permission denied" }),
      });

      const { result } = renderHook(
        () => useResolveComment({ noteId: "note-1" }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.unresolveComment("comment-1");
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  it("calls onError callback when request fails", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ detail: "Invalid" }),
    });

    const { result } = renderHook(
      () => useResolveComment({ noteId: "note-1", onError }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.resolveComment("comment-1");
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it("provides reset function to clear error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ detail: "Error" }),
    });

    const { result } = renderHook(
      () => useResolveComment({ noteId: "note-1" }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.resolveComment("comment-1");
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
