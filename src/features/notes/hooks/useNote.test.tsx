/**
 * Unit tests for useNote hook
 *
 * Tests React Query-based note fetching and mutations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNote, noteKeys } from "./useNote";
import type { ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("noteKeys", () => {
  it("should generate correct query keys", () => {
    expect(noteKeys.all).toEqual(["notes"]);
    expect(noteKeys.lists()).toEqual(["notes", "list"]);
    expect(noteKeys.list({ search: "test" })).toEqual([
      "notes",
      "list",
      { search: "test" },
    ]);
    expect(noteKeys.details()).toEqual(["notes", "detail"]);
    expect(noteKeys.detail("123")).toEqual(["notes", "detail", "123"]);
  });
});

describe("useNote", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch note successfully", async () => {
    const mockNote = {
      id: "123",
      title: "Test Note",
      content: "<p>Content</p>",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockNote }),
    });

    const { result } = renderHook(() => useNote("123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.note).toEqual(mockNote);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Note not found" }),
    });

    const { result } = renderHook(() => useNote("invalid-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.note).toBeUndefined();
    expect(result.current.error?.message).toBe("Note not found");
  });

  it("should not fetch when disabled", async () => {
    renderHook(() => useNote("123", { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not fetch when id is empty", async () => {
    renderHook(() => useNote(""), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should provide updateNote mutation", async () => {
    const mockNote = {
      id: "123",
      title: "Test Note",
      content: "<p>Content</p>",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedNote = { ...mockNote, title: "Updated Title" };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNote }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedNote }),
      });

    const { result } = renderHook(() => useNote("123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call mutation
    result.current.updateNote({ title: "Updated Title" });

    await waitFor(() => {
      expect(result.current.note?.title).toBe("Updated Title");
    });
  });

  it("should call PATCH with correct parameters", async () => {
    const mockNote = {
      id: "123",
      title: "Test Note",
      content: "<p>Content</p>",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNote }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockNote, title: "New Title" } }),
      });

    const { result } = renderHook(() => useNote("123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.updateNote({ title: "New Title" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notes/123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      });
    });
  });
});
