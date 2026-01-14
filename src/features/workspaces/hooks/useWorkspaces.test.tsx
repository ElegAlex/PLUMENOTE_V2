/**
 * Tests for useWorkspaces hook
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWorkspaces, useWorkspace, workspaceKeys } from "./useWorkspaces";
import type { WorkspaceWithCount } from "../types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample workspaces for testing
const mockWorkspaces: WorkspaceWithCount[] = [
  {
    id: "ws-1",
    name: "Mon Projet",
    description: "Un workspace pour mon projet",
    icon: "briefcase",
    isPersonal: false,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    ownerId: "user-1",
    _count: { notes: 5 },
  },
  {
    id: "ws-2",
    name: "Personnel",
    description: "Mon workspace personnel",
    icon: "folder",
    isPersonal: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    ownerId: "user-1",
    _count: { notes: 0 },
  },
];

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("workspaceKeys", () => {
    it("should define correct query keys", () => {
      expect(workspaceKeys.all).toEqual(["workspaces"]);
      expect(workspaceKeys.list()).toEqual(["workspaces", "list"]);
      expect(workspaceKeys.detail("ws-1")).toEqual(["workspaces", "detail", "ws-1"]);
    });
  });

  describe("fetching workspaces", () => {
    it("should fetch workspaces successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockWorkspaces }),
      });

      const { result } = renderHook(() => useWorkspaces(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check data
      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data?.[0]?.name).toBe("Mon Projet");
    });

    it("should call the correct API endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderHook(() => useWorkspaces(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/workspaces");
      });
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal server error" }),
      });

      const { result } = renderHook(() => useWorkspaces(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Internal server error");
    });

    it("should handle 401 unauthorized error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Authentication required" }),
      });

      const { result } = renderHook(() => useWorkspaces(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Authentication required");
    });

    it("should return empty array when no workspaces", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useWorkspaces(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toEqual([]);
    });
  });

  describe("enabled option", () => {
    it("should not fetch when enabled is false", async () => {
      const { result } = renderHook(() => useWorkspaces({ enabled: false }), {
        wrapper: createWrapper(),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch when enabled is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockWorkspaces }),
      });

      const { result } = renderHook(() => useWorkspaces({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("caching", () => {
    it("should use staleTime for caching", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockWorkspaces }),
      });

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(() => useWorkspaces(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call should use cache (same wrapper = same client)
      const { result: result2 } = renderHook(() => useWorkspaces(), { wrapper });

      // Should immediately have data from cache
      expect(result2.current.data?.data).toHaveLength(2);

      // Fetch should only be called once due to staleTime
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe("useWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch single workspace by ID", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockWorkspaces[0] }),
    });

    const { result } = renderHook(() => useWorkspace("ws-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.name).toBe("Mon Projet");
    expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1");
  });

  it("should not fetch when ID is empty", async () => {
    const { result } = renderHook(() => useWorkspace(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not fetch when enabled is false", async () => {
    const { result } = renderHook(() => useWorkspace("ws-1", { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle not found error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Workspace not found" }),
    });

    const { result } = renderHook(() => useWorkspace("non-existent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Workspace not found");
  });
});
