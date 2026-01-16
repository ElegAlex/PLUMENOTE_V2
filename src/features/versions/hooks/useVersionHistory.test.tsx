/**
 * Tests for useVersionHistory hook
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #7 - Pagination avec "Charger plus"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVersionHistory, versionHistoryKeys } from "./useVersionHistory";
import type { NoteVersionSummary } from "../types";

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
 * Mock version data factory
 */
function createMockVersion(overrides: Partial<NoteVersionSummary> = {}): NoteVersionSummary {
  return {
    id: "version-1",
    version: 1,
    title: "Test Note",
    createdAt: new Date("2026-01-16T10:00:00Z"),
    noteId: "note-1",
    createdById: "user-1",
    createdBy: { name: "Test User", image: null },
    ...overrides,
  };
}

describe("useVersionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial fetch", () => {
    it("should return loading state initially", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.versions).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should fetch versions when enabled", async () => {
      const mockVersions = [
        createMockVersion({ id: "v1", version: 2 }),
        createMockVersion({ id: "v2", version: 1 }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVersions,
          meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
        }),
      });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.versions).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(result.current.hasNextPage).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/note-1/versions")
      );
    });

    it("should not fetch when disabled", async () => {
      const { result } = renderHook(
        () => useVersionHistory("note-1", { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.versions).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not fetch when noteId is undefined", async () => {
      const { result } = renderHook(() => useVersionHistory(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.versions).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    it("should indicate hasNextPage when more pages exist", async () => {
      const mockVersions = Array.from({ length: 20 }, (_, i) =>
        createMockVersion({ id: `v${i}`, version: 20 - i })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVersions,
          meta: { total: 50, page: 1, pageSize: 20, totalPages: 3 },
        }),
      });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.total).toBe(50);
    });

    it("should fetch next page when fetchNextPage is called", async () => {
      const page1Versions = Array.from({ length: 20 }, (_, i) =>
        createMockVersion({ id: `v1-${i}`, version: 40 - i })
      );
      const page2Versions = Array.from({ length: 20 }, (_, i) =>
        createMockVersion({ id: `v2-${i}`, version: 20 - i })
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: page1Versions,
            meta: { total: 40, page: 1, pageSize: 20, totalPages: 2 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: page2Versions,
            meta: { total: 40, page: 2, pageSize: 20, totalPages: 2 },
          }),
        });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.versions).toHaveLength(20);
      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.versions).toHaveLength(40);
      });

      expect(result.current.hasNextPage).toBe(false);
    });

    it("should respect custom pageSize", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [createMockVersion()],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        }),
      });

      renderHook(() => useVersionHistory("note-1", { pageSize: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=10")
      );
    });
  });

  describe("error handling", () => {
    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Note not found" }),
      });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Note not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
    });
  });

  describe("query keys", () => {
    it("should export correct query keys", () => {
      expect(versionHistoryKeys.all).toEqual(["versions"]);
      expect(versionHistoryKeys.list("note-123")).toEqual([
        "versions",
        "list",
        "note-123",
      ]);
      expect(versionHistoryKeys.detail("version-456")).toEqual([
        "versions",
        "detail",
        "version-456",
      ]);
    });
  });

  describe("empty state", () => {
    it("should handle empty versions list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      const { result } = renderHook(() => useVersionHistory("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.versions).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasNextPage).toBe(false);
    });
  });
});
