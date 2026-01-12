/**
 * useRecentNotes Hook Tests
 *
 * @see Story 6.4: Notes Récentes (AC: #1, #3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecentNotes, recentNotesKeys } from "./useRecentNotes";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useRecentNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("query keys", () => {
    it("should have correct query key structure", () => {
      expect(recentNotesKeys.all).toEqual(["notes", "recent"]);
    });
  });

  describe("successful fetch", () => {
    it("should return empty arrays initially while loading", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      expect(result.current.recentlyViewed).toEqual([]);
      expect(result.current.recentlyModified).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("should fetch and return recently viewed notes", async () => {
      const mockData = {
        data: {
          recentlyViewed: [
            {
              id: "note-1",
              title: "Viewed Note",
              folderId: null,
              updatedAt: "2026-01-12T10:00:00.000Z",
              viewedAt: "2026-01-12T12:00:00.000Z",
            },
          ],
          recentlyModified: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recentlyViewed).toHaveLength(1);
      expect(result.current.recentlyViewed[0].id).toBe("note-1");
      expect(result.current.recentlyViewed[0].viewedAt).toBe(
        "2026-01-12T12:00:00.000Z"
      );
    });

    it("should fetch and return recently modified notes", async () => {
      const mockData = {
        data: {
          recentlyViewed: [],
          recentlyModified: [
            {
              id: "note-2",
              title: "Modified Note",
              folderId: "folder-1",
              updatedAt: "2026-01-12T11:00:00.000Z",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recentlyModified).toHaveLength(1);
      expect(result.current.recentlyModified[0].id).toBe("note-2");
      expect(result.current.recentlyModified[0].folderId).toBe("folder-1");
    });

    it("should call correct API endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { recentlyViewed: [], recentlyModified: [] },
          }),
      });

      renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/recent");
      });
    });
  });

  describe("error handling", () => {
    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ detail: "Database error" }),
      });

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Database error");
      expect(result.current.recentlyViewed).toEqual([]);
      expect(result.current.recentlyModified).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("should use statusText when JSON parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Service Unavailable");
    });
  });

  describe("options", () => {
    it("should not fetch when enabled is false", async () => {
      const { result } = renderHook(() => useRecentNotes({ enabled: false }), {
        wrapper: createWrapper(),
      });

      // Give time for potential fetch
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should fetch when enabled is true (default)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { recentlyViewed: [], recentlyModified: [] },
          }),
      });

      renderHook(() => useRecentNotes({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("invalidate function", () => {
    it("should provide invalidate function", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { recentlyViewed: [], recentlyModified: [] },
          }),
      });

      const { result } = renderHook(() => useRecentNotes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.invalidate).toBe("function");
    });
  });
});
