/**
 * Tests for useFolders hook
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFolders, folderKeys } from "./useFolders";
import type { FolderWithCount, FolderWithChildren } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockFoldersList: FolderWithCount[] = [
  {
    id: "folder-1",
    name: "Work",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
    _count: { notes: 5, children: 2 },
  },
  {
    id: "folder-2",
    name: "Projects",
    parentId: "folder-1",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
    _count: { notes: 3, children: 0 },
  },
];

const mockFoldersTree: FolderWithChildren[] = [
  {
    id: "folder-1",
    name: "Work",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
    children: [
      {
        id: "folder-2",
        name: "Projects",
        parentId: "folder-1",
        createdAt: new Date("2026-01-10"),
        updatedAt: new Date("2026-01-10"),
        createdById: "user-1",
        children: [],
      },
    ],
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

describe("useFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("folderKeys", () => {
    it("should generate correct query keys", () => {
      expect(folderKeys.all).toEqual(["folders"]);
      expect(folderKeys.list()).toEqual(["folders", "list"]);
      expect(folderKeys.tree()).toEqual(["folders", "tree"]);
      expect(folderKeys.detail("folder-1")).toEqual([
        "folders",
        "detail",
        "folder-1",
      ]);
    });
  });

  describe("fetching folders list", () => {
    it("should fetch folders list successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.folders).toEqual(mockFoldersList);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/folders");
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Server error" }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe("Server error");
    });
  });

  describe("fetching folders tree", () => {
    it("should fetch folders tree when tree option is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      const { result } = renderHook(() => useFolders({ tree: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.folders).toEqual(mockFoldersTree);
      expect(mockFetch).toHaveBeenCalledWith("/api/folders?tree=true");
    });
  });

  describe("createFolder mutation", () => {
    it("should create a folder successfully", async () => {
      const newFolder = {
        id: "folder-3",
        name: "Nouveau dossier",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      };

      // First call for initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Setup mock for create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newFolder }),
      });

      // Setup mock for refetch after mutation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [...mockFoldersList, newFolder] }),
      });

      result.current.createFolder({ name: "Nouveau dossier" });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nouveau dossier" }),
      });
    });

    it("should create a subfolder with parentId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFolder = {
        id: "folder-3",
        name: "Sous-dossier",
        parentId: "folder-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newFolder }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [...mockFoldersList, newFolder] }),
      });

      result.current.createFolder({
        name: "Sous-dossier",
        parentId: "folder-1",
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Sous-dossier", parentId: "folder-1" }),
      });
    });

    it("should handle create error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Conflict",
        json: async () => ({
          detail: "Un dossier avec ce nom existe déjà",
        }),
      });

      result.current.createFolder({ name: "Work" });

      await waitFor(() => {
        expect(result.current.createError).not.toBeNull();
      });

      expect(result.current.createError?.message).toBe(
        "Un dossier avec ce nom existe déjà"
      );
    });
  });

  describe("deleteFolder mutation", () => {
    it("should delete a folder successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockFoldersList[0]] }),
      });

      result.current.deleteFolder("folder-2");

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-2", {
        method: "DELETE",
      });
    });

    it("should handle delete error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersList }),
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Dossier non trouvé" }),
      });

      result.current.deleteFolder("non-existent");

      await waitFor(() => {
        expect(result.current.deleteError).not.toBeNull();
      });

      expect(result.current.deleteError?.message).toBe("Dossier non trouvé");
    });
  });

  describe("enabled option", () => {
    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(() => useFolders({ enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.folders).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
