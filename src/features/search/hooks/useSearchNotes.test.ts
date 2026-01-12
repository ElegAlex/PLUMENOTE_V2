/**
 * Unit tests for useSearchNotes hook
 *
 * @see Story 6.2: Command Palette et Recherche (Task 7)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSearchNotes } from "./useSearchNotes";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useSearchNotes", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty data for empty query", async () => {
    const { result } = renderHook(() => useSearchNotes(""), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled for empty string
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("should fetch search results after debounce", async () => {
    const mockResponse = {
      data: [{ id: "note-1", title: "Test Note" }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1, query: "test" },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useSearchNotes("test"), {
      wrapper: createWrapper(),
    });

    // Wait for debounce and fetch
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 500 }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useSearchNotes("test"), {
      wrapper: createWrapper(),
    });

    // Wait for debounce and fetch
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it("should include favoriteOnly parameter when specified", async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0, query: "test" },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    renderHook(() => useSearchNotes("test", { favoriteOnly: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("favoriteOnly=true")
        );
      },
      { timeout: 500 }
    );
  });

  it("should include folderId parameter when specified", async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0, query: "test" },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    renderHook(() => useSearchNotes("test", { folderId: "folder-123" }), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("folderId=folder-123")
        );
      },
      { timeout: 500 }
    );
  });

  it("should use custom pageSize when specified", async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 5, totalPages: 0, query: "test" },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    renderHook(() => useSearchNotes("test", { pageSize: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("pageSize=5")
        );
      },
      { timeout: 500 }
    );
  });

  it("should build correct URL with query parameter", async () => {
    const mockResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0, query: "my search" },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    renderHook(() => useSearchNotes("my search"), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/notes/search?")
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("query=my+search")
        );
      },
      { timeout: 500 }
    );
  });
});
