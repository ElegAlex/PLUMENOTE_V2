/**
 * Tests for useTemplates hook
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTemplates, templateKeys } from "./useTemplates";
import type { Template } from "../types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample templates for testing
const mockTemplates: Template[] = [
  {
    id: "tpl-1",
    name: "Fiche Serveur",
    description: "Template pour documenter un serveur",
    content: "# {{nom}}\n\n## Informations",
    icon: "server",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: null,
  },
  {
    id: "tpl-2",
    name: "Procedure",
    description: "Template pour une procedure",
    content: "# Procedure\n\n## Etapes",
    icon: "list-checks",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: null,
  },
  {
    id: "tpl-3",
    name: "Mon Template",
    description: "Mon template custom",
    content: "# Custom\n\nContenu",
    icon: "file-text",
    isSystem: false,
    createdAt: new Date("2026-01-12"),
    updatedAt: new Date("2026-01-12"),
    createdById: "user-1",
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

describe("useTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("templateKeys", () => {
    it("should define correct query keys", () => {
      expect(templateKeys.all).toEqual(["templates"]);
      expect(templateKeys.list()).toEqual(["templates", "list"]);
      expect(templateKeys.detail("tpl-1")).toEqual(["templates", "detail", "tpl-1"]);
    });
  });

  describe("fetching templates", () => {
    it("should fetch templates successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTemplates }),
      });

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check data
      expect(result.current.data?.data).toHaveLength(3);
      expect(result.current.data?.data?.[0]?.name).toBe("Fiche Serveur");
      expect(result.current.data?.data?.[0]?.isSystem).toBe(true);
    });

    it("should call the correct API endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/templates");
      });
    });

    it("should handle fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal server error" }),
      });

      const { result } = renderHook(() => useTemplates(), {
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

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Authentication required");
    });

    it("should return empty array when no templates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useTemplates(), {
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
      const { result } = renderHook(() => useTemplates({ enabled: false }), {
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
        json: async () => ({ data: mockTemplates }),
      });

      const { result } = renderHook(() => useTemplates({ enabled: true }), {
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
        json: async () => ({ data: mockTemplates }),
      });

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call should use cache (same wrapper = same client)
      const { result: result2 } = renderHook(() => useTemplates(), { wrapper });

      // Should immediately have data from cache
      expect(result2.current.data?.data).toHaveLength(3);

      // Fetch should only be called once due to staleTime
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
