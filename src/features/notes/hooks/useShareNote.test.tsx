/**
 * Tests for useShareNote hook
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useShareNote } from "./useShareNote";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useShareNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return initial state", () => {
    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSharing).toBe(false);
    expect(result.current.shareError).toBe(null);
    expect(result.current.sharedNote).toBeUndefined();
    expect(typeof result.current.shareNote).toBe("function");
    expect(typeof result.current.shareNoteAsync).toBe("function");
  });

  it("should successfully share a note", async () => {
    const mockResponse = {
      data: {
        originalNote: {
          id: "note-1",
          title: "Original Note",
          workspaceId: null,
        },
        sharedNote: {
          id: "note-shared",
          title: "Original Note",
          workspaceId: "ws-team",
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    await result.current.shareNoteAsync({
      sourceNoteId: "note-1",
      targetWorkspaceId: "ws-team",
    });

    await waitFor(() => {
      expect(result.current.sharedNote).toBeDefined();
    });

    expect(result.current.sharedNote?.id).toBe("note-shared");
    expect(result.current.sharedNote?.workspaceId).toBe("ws-team");
    expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-1/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetWorkspaceId: "ws-team",
        targetFolderId: undefined,
      }),
    });
  });

  it("should share a note to a specific folder", async () => {
    const mockResponse = {
      data: {
        originalNote: { id: "note-1" },
        sharedNote: { id: "note-shared", folderId: "folder-1" },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    await result.current.shareNoteAsync({
      sourceNoteId: "note-1",
      targetWorkspaceId: "ws-team",
      targetFolderId: "folder-1",
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-1/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetWorkspaceId: "ws-team",
        targetFolderId: "folder-1",
      }),
    });
  });

  it("should handle API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "You do not have write permissions" }),
    });

    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.shareNoteAsync({
        sourceNoteId: "note-1",
        targetWorkspaceId: "ws-team",
      })
    ).rejects.toThrow("You do not have write permissions");
  });

  it("should handle network error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("Not JSON");
      },
    });

    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.shareNoteAsync({
        sourceNoteId: "note-1",
        targetWorkspaceId: "ws-team",
      })
    ).rejects.toThrow("Internal Server Error");
  });

  it("should set isSharing to true during mutation", async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementationOnce(() => pendingPromise);

    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    // Start mutation but don't await
    result.current.shareNote({
      sourceNoteId: "note-1",
      targetWorkspaceId: "ws-team",
    });

    await waitFor(() => {
      expect(result.current.isSharing).toBe(true);
    });

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        data: { originalNote: {}, sharedNote: {} },
      }),
    });

    await waitFor(() => {
      expect(result.current.isSharing).toBe(false);
    });
  });

  it("should have a reset function", () => {
    const { result } = renderHook(() => useShareNote(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.reset).toBe("function");
  });
});
