/**
 * Unit tests for useTags hook
 *
 * Tests tag CRUD operations with React Query.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTags } from "./useTags";
import type { ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTags = [
  { id: "tag-1", name: "work", color: "#3b82f6" },
  { id: "tag-2", name: "personal", color: "#22c55e" },
];

describe("useTags", () => {
  let queryClient: QueryClient;

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("fetching tags", () => {
    it("should fetch user tags on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tags).toEqual(mockTags);
      expect(mockFetch).toHaveBeenCalledWith("/api/tags");
    });

    it("should return empty array when no tags", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tags).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Server error" }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Server error");
    });

    it("should not fetch when disabled", () => {
      const { result } = renderHook(() => useTags({ enabled: false }), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("createTag", () => {
    it("should create a new tag", async () => {
      const newTag = { id: "tag-3", name: "urgent", color: "#ef4444" };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newTag }),
      });

      await act(async () => {
        await result.current.createTagAsync({ name: "urgent", color: "#ef4444" });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "urgent", color: "#ef4444" }),
      });
    });

    it("should handle create error", async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create tag fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Conflict",
        json: async () => ({ detail: "Tag already exists" }),
      });

      await expect(
        act(async () => {
          await result.current.createTagAsync({ name: "work" });
        })
      ).rejects.toThrow("Tag already exists");
    });
  });

  describe("deleteTag", () => {
    it("should delete a tag", async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Delete tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await act(async () => {
        await result.current.deleteTagAsync("tag-1");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tags/tag-1", {
        method: "DELETE",
      });
    });
  });

  describe("updateTag", () => {
    it("should update a tag", async () => {
      const updatedTag = { id: "tag-1", name: "work-updated", color: "#3b82f6" };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTags }),
      });

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedTag }),
      });

      await act(async () => {
        await result.current.updateTagAsync({ id: "tag-1", name: "work-updated" });
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/tags/tag-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "work-updated" }),
      });
    });
  });
});
