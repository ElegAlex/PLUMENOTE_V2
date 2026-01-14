/**
 * useWorkspacesMutation Hook Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWorkspacesMutation } from "./useWorkspacesMutation";
import { workspaceKeys } from "./useWorkspaces";
import type { Workspace } from "../types";

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Mock workspace response
const mockWorkspace: Workspace = {
  id: "workspace-1",
  name: "Test Workspace",
  description: "Test description",
  icon: "briefcase",
  isPersonal: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: "user-1",
};

describe("useWorkspacesMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createWorkspaceAsync", () => {
    it("calls POST /api/workspaces with correct data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkspace }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.createWorkspaceAsync({
        name: "New Workspace",
        description: "New description",
        icon: "folder",
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Workspace",
          description: "New description",
          icon: "folder",
        }),
      });
    });

    it("throws error when API returns error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Validation failed" }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.createWorkspaceAsync({
          name: "",
        })
      ).rejects.toThrow("Validation failed");
    });

    it("sets isCreating to true during mutation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      const mutationPromise = result.current.createWorkspaceAsync({
        name: "Test Workspace",
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkspace }),
      });

      await mutationPromise;
    });
  });

  describe("updateWorkspaceAsync", () => {
    it("calls PATCH /api/workspaces/:id with correct data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkspace }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.updateWorkspaceAsync({
        id: "workspace-1",
        data: { name: "Updated Name" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/workspaces/workspace-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });
    });

    it("throws error when workspace not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Workspace not found" }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.updateWorkspaceAsync({
          id: "non-existent",
          data: { name: "Updated" },
        })
      ).rejects.toThrow("Workspace not found");
    });
  });

  describe("deleteWorkspaceAsync", () => {
    it("calls DELETE /api/workspaces/:id", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.deleteWorkspaceAsync("workspace-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/workspaces/workspace-1", {
        method: "DELETE",
      });
    });

    it("throws error when workspace has notes", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({ detail: "Cannot delete workspace with notes" }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.deleteWorkspaceAsync("workspace-with-notes")
      ).rejects.toThrow("Cannot delete workspace with notes");
    });
  });

  describe("moveNotesAsync", () => {
    it("calls POST /api/workspaces/:sourceId/move-notes with target workspace", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              movedCount: 5,
              sourceWorkspaceId: "ws-1",
              targetWorkspaceId: "ws-2",
            },
          }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.moveNotesAsync({
        sourceId: "ws-1",
        targetId: "ws-2",
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/workspaces/ws-1/move-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWorkspaceId: "ws-2" }),
      });
    });

    it("throws error when moving to same workspace", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: "Source and target workspace cannot be the same",
          }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.moveNotesAsync({
          sourceId: "ws-1",
          targetId: "ws-1",
        })
      ).rejects.toThrow("Source and target workspace cannot be the same");
    });

    it("throws error when source workspace not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: "Source workspace with ID 'non-existent' not found",
          }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.moveNotesAsync({
          sourceId: "non-existent",
          targetId: "ws-2",
        })
      ).rejects.toThrow("Source workspace with ID 'non-existent' not found");
    });

    it("throws error when target workspace not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: "Target workspace with ID 'non-existent' not found",
          }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.moveNotesAsync({
          sourceId: "ws-1",
          targetId: "non-existent",
        })
      ).rejects.toThrow("Target workspace with ID 'non-existent' not found");
    });

    it("throws error when user lacks permission", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: "You do not have permission to move notes from this workspace",
          }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.moveNotesAsync({
          sourceId: "ws-1",
          targetId: "ws-2",
        })
      ).rejects.toThrow("You do not have permission to move notes from this workspace");
    });
  });

  describe("cache invalidation", () => {
    it("invalidates workspace list cache after create", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkspace }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });

      await result.current.createWorkspaceAsync({
        name: "Test",
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: workspaceKeys.list(),
      });
    });

    it("invalidates workspace detail cache after update", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkspace }),
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });

      await result.current.updateWorkspaceAsync({
        id: "workspace-1",
        data: { name: "Updated" },
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: workspaceKeys.list(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: workspaceKeys.detail("workspace-1"),
      });
    });

    it("removes workspace from cache after delete", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const removeQueriesSpy = vi.spyOn(queryClient, "removeQueries");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useWorkspacesMutation(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });

      await result.current.deleteWorkspaceAsync("workspace-1");

      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: workspaceKeys.detail("workspace-1"),
      });
    });
  });
});
