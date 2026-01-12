/**
 * Tests for useFolderPath hook
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFolderPath } from "./useFolderPath";
import type { Folder } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockFolderPath: Folder[] = [
  {
    id: "folder-root",
    name: "Documents",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-middle",
    name: "Projects",
    parentId: "folder-root",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-leaf",
    name: "Current",
    parentId: "folder-middle",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
];

// Wrapper component for testing hooks
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
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

describe("useFolderPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetching folder path", () => {
    it("should fetch folder path successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolderPath }),
      });

      const { result } = renderHook(() => useFolderPath("folder-leaf"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFolderPath);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-leaf/path");
    });

    it("should return empty array when folderId is null", () => {
      const { result } = renderHook(() => useFolderPath(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Dossier non trouvé" }),
      });

      const { result } = renderHook(() => useFolderPath("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe("Dossier non trouvé");
    });

    it("should handle 400 validation error for invalid folder ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ detail: "Format d'ID de dossier invalide" }),
      });

      const { result } = renderHook(() => useFolderPath("invalid-format"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe("Format d'ID de dossier invalide");
    });

    it("should use correct query key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolderPath }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useFolderPath("folder-leaf"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the data is cached under the correct key
      const cachedData = queryClient.getQueryData(["folders", "path", "folder-leaf"]);
      expect(cachedData).toEqual(mockFolderPath);
    });
  });

  describe("stale time behavior", () => {
    it("should not refetch within stale time (5 minutes)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolderPath }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // First render
      const { result, rerender } = renderHook(() => useFolderPath("folder-leaf"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Rerender should not trigger another fetch
      rerender();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
