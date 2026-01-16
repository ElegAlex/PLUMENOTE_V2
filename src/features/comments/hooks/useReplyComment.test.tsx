/**
 * useReplyComment Hook Tests
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #2 - Réponse sauvegardée avec parentId
 * @see AC: #9 - Hériter des positions d'ancrage du parent
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReplyComment } from "./useReplyComment";
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

const mockParentComment: Comment = {
  id: "parent-1",
  content: "Parent comment",
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

const mockReplyResponse: Comment = {
  id: "reply-1",
  content: "Reply content",
  anchorStart: 10,
  anchorEnd: 25,
  resolved: false,
  noteId: "note-1",
  parentId: "parent-1",
  createdAt: new Date("2026-01-10T11:00:00Z"),
  updatedAt: new Date("2026-01-10T11:00:00Z"),
  createdById: "user-2",
  createdBy: { id: "user-2", name: "Reply User", avatar: null },
};

describe("useReplyComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state with replyToComment function", () => {
    const { result } = renderHook(
      () => useReplyComment("note-1"),
      { wrapper: createWrapper() }
    );

    expect(result.current.replyToComment).toBeDefined();
    expect(result.current.isReplying).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls API with parentId and inherited anchor positions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReplyResponse }),
    });

    const { result } = renderHook(
      () => useReplyComment("note-1"),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notes/note-1/comments",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "Reply content",
            anchorStart: 10, // Inherited from parent
            anchorEnd: 25,   // Inherited from parent
            parentId: "parent-1",
          }),
        })
      );
    });
  });

  it("sets isReplying to true while request is pending", async () => {
    let resolvePromise: (value: Comment) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(
      () => useReplyComment("note-1"),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    await waitFor(() => {
      expect(result.current.isReplying).toBe(true);
    });

    // Resolve the promise
    act(() => {
      resolvePromise!({
        ok: true,
        json: async () => ({ data: mockReplyResponse }),
      });
    });

    await waitFor(() => {
      expect(result.current.isReplying).toBe(false);
    });
  });

  it("calls onSuccess callback with created reply", async () => {
    const onSuccess = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReplyResponse }),
    });

    const { result } = renderHook(
      () => useReplyComment("note-1", { onSuccess }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockReplyResponse);
    });
  });

  it("sets error when request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ detail: "Invalid reply" }),
    });

    const { result } = renderHook(
      () => useReplyComment("note-1"),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe("Invalid reply");
    });
  });

  it("calls onError callback when request fails", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ detail: "Invalid reply" }),
    });

    const { result } = renderHook(
      () => useReplyComment("note-1", { onError }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it("does not call API if noteId is undefined", async () => {
    const { result } = renderHook(
      () => useReplyComment(undefined),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
    });

    // Should not call fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("provides reset function to clear error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ detail: "Error" }),
    });

    const { result } = renderHook(
      () => useReplyComment("note-1"),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.replyToComment({
        parentComment: mockParentComment,
        content: "Reply content",
      });
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
