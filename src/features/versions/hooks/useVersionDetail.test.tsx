/**
 * Tests for useVersionDetail hook
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #4, #5 - Prévisualisation du contenu
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVersionDetail } from "./useVersionDetail";
import type { NoteVersion } from "../types";

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
function createMockVersion(overrides: Partial<NoteVersion> = {}): NoteVersion {
  return {
    id: "version-1",
    version: 1,
    title: "Test Note",
    content: "# Test Content\n\nThis is test content.",
    ydoc: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    noteId: "note-1",
    createdById: "user-1",
    ...overrides,
  };
}

describe("useVersionDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial fetch", () => {
    it("should return loading state initially", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: createMockVersion() }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.version).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should fetch version detail when enabled", async () => {
      const mockVersion = createMockVersion({
        content: "# Hello World\n\nTest content with **bold**.",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockVersion }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version).not.toBeNull();
      expect(result.current.version?.content).toContain("Hello World");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notes/note-1/versions/version-1"
      );
    });

    it("should not fetch when disabled", async () => {
      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1", { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.version).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not fetch when noteId is undefined", async () => {
      const { result } = renderHook(
        () => useVersionDetail(undefined, "version-1"),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.version).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not fetch when versionId is undefined", async () => {
      const { result } = renderHook(
        () => useVersionDetail("note-1", undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.version).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("data handling", () => {
    it("should return version with full content", async () => {
      const mockVersion = createMockVersion({
        id: "version-5",
        version: 5,
        title: "My Note Title",
        content: "# Full Content\n\nWith multiple paragraphs.\n\n- List item 1\n- List item 2",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockVersion }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-5"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version?.id).toBe("version-5");
      expect(result.current.version?.version).toBe(5);
      expect(result.current.version?.title).toBe("My Note Title");
      expect(result.current.version?.content).toContain("Full Content");
      expect(result.current.version?.content).toContain("List item 1");
    });

    it("should handle version with null content", async () => {
      const mockVersion = createMockVersion({
        content: null,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockVersion }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.version?.content).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Version not found" }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "invalid-version"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Version not found");
      expect(result.current.version).toBeNull();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("should handle forbidden access", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({ detail: "You do not have permission to access this version" }),
      });

      const { result } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain("permission");
    });
  });

  describe("caching", () => {
    it("should use cached data on subsequent fetches", async () => {
      const mockVersion = createMockVersion();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockVersion }),
      });

      const wrapper = createWrapper();

      // First render
      const { result: result1, unmount } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      unmount();

      // Second render with same IDs - should use cache
      const { result: result2 } = renderHook(
        () => useVersionDetail("note-1", "version-1"),
        { wrapper }
      );

      // Should have cached data immediately (not loading)
      expect(result2.current.version).not.toBeNull();
      // Should not make another fetch due to staleTime
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
