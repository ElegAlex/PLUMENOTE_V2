/**
 * useTemplatesMutation Hook Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTemplatesMutation } from "./useTemplatesMutation";
import { templateKeys } from "./useTemplates";
import type { Template } from "../types";

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

// Mock template response
const mockTemplate: Template = {
  id: "template-1",
  name: "Test Template",
  description: "Test description",
  content: "<p>Test content</p>",
  icon: "file-text",
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: "user-1",
};

describe("useTemplatesMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTemplateAsync", () => {
    it("calls POST /api/templates with correct data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTemplate }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.createTemplateAsync({
        name: "New Template",
        content: "<p>Content</p>",
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Template",
          content: "<p>Content</p>",
        }),
      });
    });

    it("throws error when API returns error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Admin role required" }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.createTemplateAsync({
          name: "New Template",
          content: "<p>Content</p>",
        })
      ).rejects.toThrow("Admin role required");
    });

    it("sets isCreating to true during mutation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      const mutationPromise = result.current.createTemplateAsync({
        name: "Test",
        content: "<p>Test</p>",
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: mockTemplate }),
      });

      await mutationPromise;
    });
  });

  describe("updateTemplateAsync", () => {
    it("calls PATCH /api/templates/:id with correct data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTemplate }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.updateTemplateAsync({
        id: "template-1",
        data: { name: "Updated Name" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/templates/template-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });
    });

    it("throws error when template not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({ detail: "Template not found" }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.updateTemplateAsync({
          id: "non-existent",
          data: { name: "Updated" },
        })
      ).rejects.toThrow("Template not found");
    });
  });

  describe("deleteTemplateAsync", () => {
    it("calls DELETE /api/templates/:id", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.deleteTemplateAsync("template-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/templates/template-1", {
        method: "DELETE",
      });
    });

    it("throws error when deleting system template", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({ detail: "System templates cannot be deleted" }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.deleteTemplateAsync("system-template")
      ).rejects.toThrow("System templates cannot be deleted");
    });
  });

  describe("cache invalidation", () => {
    it("invalidates template list cache after create", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTemplate }),
      });

      const { result } = renderHook(() => useTemplatesMutation(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });

      await result.current.createTemplateAsync({
        name: "Test",
        content: "<p>Test</p>",
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: templateKeys.list(),
      });
    });
  });
});
