/**
 * Tests for useGraphData hook
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Données du graphe pour visualisation
 * @see AC: #6 - staleTime 60s (données moins volatiles)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGraphData } from "./useGraphData";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe("useGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns nodes and edges on successful fetch", async () => {
    const mockData = {
      data: {
        nodes: [{ id: "note-1", title: "Test Note", linkCount: 2 }],
        edges: [{ source: "note-1", target: "note-2" }],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes).toEqual(mockData.data.nodes);
    expect(result.current.edges).toEqual(mockData.data.edges);
  });

  it("returns isLoading true while fetching", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({ data: { nodes: [], edges: [] } }),
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns error if fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Server error" }),
    });

    const { result } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toContain("Server error");
  });

  it("returns empty arrays by default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { nodes: [], edges: [] } }),
    });

    const { result } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    // Before fetch completes, should return empty arrays
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After fetch, still empty arrays (matching API response)
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  it("provides refetch function", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { nodes: [], edges: [] } }),
    });

    const { result } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });

  it("calls API with correct endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { nodes: [], edges: [], outOfScopeEdges: [] } }),
    });

    renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/graph");
    });
  });

  // Story 6.9: Folder filtering tests
  describe("folder filtering (Story 6.9)", () => {
    it("passes folderId to API when specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { nodes: [], edges: [], outOfScopeEdges: [] } }),
      });

      renderHook(() => useGraphData("folder-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/graph?folderId=folder-123");
      });
    });

    it("includes folderId in queryKey for proper caching", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { nodes: [], edges: [], outOfScopeEdges: [] } }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // First call without folderId
      const { result: result1 } = renderHook(() => useGraphData(), { wrapper });
      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      // Second call with folderId - should be a different cache entry
      const { result: result2 } = renderHook(() => useGraphData("folder-1"), { wrapper });

      // Should trigger a new fetch because queryKey includes folderId
      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      // Both fetches should have been made
      expect(mockFetch).toHaveBeenCalledWith("/api/graph");
      expect(mockFetch).toHaveBeenCalledWith("/api/graph?folderId=folder-1");
    });

    it("returns outOfScopeEdges from API response", async () => {
      const mockData = {
        data: {
          nodes: [{ id: "note-1", title: "Test Note", linkCount: 1 }],
          edges: [],
          outOfScopeEdges: [{ source: "note-1", target: "note-outside" }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useGraphData("folder-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.outOfScopeEdges).toEqual(mockData.data.outOfScopeEdges);
    });

    it("returns empty outOfScopeEdges by default", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { nodes: [], edges: [], outOfScopeEdges: [] } }),
      });

      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      // Before fetch completes
      expect(result.current.outOfScopeEdges).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After fetch
      expect(result.current.outOfScopeEdges).toEqual([]);
    });
  });
});
