/**
 * Tests for useBacklinks hook
 *
 * @see Story 6.7: Panneau Backlinks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useBacklinks } from "./useBacklinks";

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useBacklinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array initially and isLoading true", () => {
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useBacklinks("note123"), {
      wrapper: createWrapper(),
    });

    expect(result.current.backlinks).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("returns backlinks on successful fetch", async () => {
    const mockBacklinks = [
      { id: "note1", title: "Note One", linkTitle: "Reference" },
      { id: "note2", title: "Note Two", linkTitle: null },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBacklinks }),
    } as Response);

    const { result } = renderHook(() => useBacklinks("note123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backlinks).toEqual(mockBacklinks);
    expect(result.current.error).toBe(null);
  });

  it("returns error on failed fetch", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: "Note not found" }),
    } as Response);

    const { result } = renderHook(() => useBacklinks("note123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backlinks).toEqual([]);
    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.message).toBe("Note not found");
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(
      () => useBacklinks("note123", { enabled: false }),
      { wrapper: createWrapper() }
    );

    // Wait a tick to ensure no fetch was made
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.backlinks).toEqual([]);
  });

  it("does not fetch when noteId is undefined", async () => {
    const { result } = renderHook(() => useBacklinks(undefined), {
      wrapper: createWrapper(),
    });

    // Wait a tick to ensure no fetch was made
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.backlinks).toEqual([]);
  });

  it("fetches from correct URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    renderHook(() => useBacklinks("my-note-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/my-note-id/backlinks");
    });
  });

  it("returns refetch function", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    const { result } = renderHook(() => useBacklinks("note123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
