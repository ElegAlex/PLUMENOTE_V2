/**
 * Tests for useFolder hook
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFolder } from "./useFolder";
import type { Folder } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockFolder: Folder = {
  id: "folder-1",
  name: "Work",
  parentId: null,
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: "user-1",
};

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

describe("useFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetching folder", () => {
    it("should fetch folder successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.folder).toEqual(mockFolder);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-1");
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Dossier non trouvé" }),
      });

      const { result } = renderHook(() => useFolder("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe("Dossier non trouvé");
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () => useFolder("folder-1", { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.folder).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("updateFolder mutation", () => {
    it("should update folder successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedFolder = { ...mockFolder, name: "Updated Work" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedFolder }),
      });

      result.current.updateFolder({ id: "folder-1", name: "Updated Work" });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Work" }),
      });
    });

    it("should handle update error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
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

      result.current.updateFolder({ id: "folder-1", name: "Existing" });

      await waitFor(() => {
        expect(result.current.updateError).not.toBeNull();
      });

      expect(result.current.updateError?.message).toBe(
        "Un dossier avec ce nom existe déjà"
      );
    });
  });

  describe("rename convenience method", () => {
    it("should rename folder successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const renamedFolder = { ...mockFolder, name: "New Name" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: renamedFolder }),
      });

      result.current.rename("New Name");

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
    });
  });

  describe("moveTo convenience method", () => {
    it("should move folder to new parent", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const movedFolder = { ...mockFolder, parentId: "folder-2" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: movedFolder }),
      });

      result.current.moveTo("folder-2");

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: "folder-2" }),
      });
    });

    it("should move folder to root (parentId: null)", async () => {
      const childFolder = { ...mockFolder, parentId: "parent-1" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: childFolder }),
      });

      const { result } = renderHook(() => useFolder("folder-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const movedFolder = { ...mockFolder, parentId: null };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: movedFolder }),
      });

      result.current.moveTo(null);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/folders/folder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: null }),
      });
    });
  });
});
