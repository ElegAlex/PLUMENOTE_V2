/**
 * @vitest-environment jsdom
 * Tests for useAdminStats hook
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminStats, adminStatsQueryKey } from "./useAdminStats";
import type { AdminStats } from "../types/admin-stats";
import type { ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockStats: AdminStats = {
  totalNotes: 100,
  notesThisWeek: 15,
  activeUsers: 10,
  dailyActivity: [{ date: "2026-01-17", created: 5, modified: 3 }],
  topNotes: [
    { id: "note-1", title: "Test Note", viewCount: 50, workspaceName: "Team" },
  ],
  topContributors: [
    {
      id: "user-1",
      name: "Alice",
      image: null,
      notesCreated: 20,
      notesModified: 10,
    },
  ],
};

describe("useAdminStats", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("adminStatsQueryKey", () => {
    it("should generate correct query key without workspace", () => {
      expect(adminStatsQueryKey()).toEqual(["admin", "stats", "all"]);
    });

    it("should generate correct query key with workspace", () => {
      expect(adminStatsQueryKey("workspace-123")).toEqual([
        "admin",
        "stats",
        "workspace-123",
      ]);
    });

    it("should handle null workspace as 'all'", () => {
      expect(adminStatsQueryKey(null)).toEqual(["admin", "stats", "all"]);
    });
  });

  describe("useAdminStats hook", () => {
    it("should fetch admin stats successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStats }),
      });

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/stats");
    });

    it("should include workspace filter in request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStats }),
      });

      const { result } = renderHook(
        () => useAdminStats({ workspaceId: "workspace-123" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/stats?workspaceId=workspace-123"
      );
    });

    it("should handle API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Admin access required" }),
      });

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Admin access required");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("should not fetch when disabled", async () => {
      const { result } = renderHook(() => useAdminStats({ enabled: false }), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should provide refetch function", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockStats }),
      });

      const { result } = renderHook(() => useAdminStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Trigger refetch
      await result.current.refetch();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
