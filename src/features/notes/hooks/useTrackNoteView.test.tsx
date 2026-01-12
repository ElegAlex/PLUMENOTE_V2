/**
 * useTrackNoteView Hook Tests
 *
 * @see Story 6.4: Notes Récentes (AC: #2, #4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTrackNoteView } from "./useTrackNoteView";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.warn to verify warning messages
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

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

describe("useTrackNoteView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleWarn.mockClear();
  });

  describe("auto-tracking", () => {
    it("should automatically track view on mount when noteId is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-123/view", {
          method: "POST",
        });
      });
    });

    it("should not track when noteId is undefined", async () => {
      renderHook(() => useTrackNoteView(undefined), {
        wrapper: createWrapper(),
      });

      // Give time for potential tracking
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should track only once even with multiple renders (StrictMode behavior)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      const { rerender } = renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      // Wait for initial tracking
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rerender multiple times
      rerender();
      rerender();
      rerender();

      // Still only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should reset tracking when noteId changes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      const { rerender } = renderHook(
        ({ noteId }) => useTrackNoteView(noteId),
        {
          wrapper: createWrapper(),
          initialProps: { noteId: "note-1" },
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-1/view", {
          method: "POST",
        });
      });

      // Change noteId
      rerender({ noteId: "note-2" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-2/view", {
          method: "POST",
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("manual tracking with autoTrack: false", () => {
    it("should not auto-track when autoTrack is false", async () => {
      renderHook(() => useTrackNoteView("note-123", { autoTrack: false }), {
        wrapper: createWrapper(),
      });

      // Give time for potential tracking
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should track manually via trackView function", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      const { result } = renderHook(
        () => useTrackNoteView("note-123", { autoTrack: false }),
        { wrapper: createWrapper() }
      );

      expect(mockFetch).not.toHaveBeenCalled();

      // Manually track
      act(() => {
        result.current.trackView();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-123/view", {
          method: "POST",
        });
      });
    });

    it("should only track once via manual trackView", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      const { result } = renderHook(
        () => useTrackNoteView("note-123", { autoTrack: false }),
        { wrapper: createWrapper() }
      );

      // Call trackView multiple times
      act(() => {
        result.current.trackView();
        result.current.trackView();
        result.current.trackView();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully via onError handler", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Should log warning from trackNoteView function
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to track note view"),
          500
        );
      });

      // Hook should still be usable (mutation onError handles the error)
      expect(typeof result.current.trackView).toBe("function");
    });

    it("should log warning and propagate error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Warning from trackNoteView
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to track note view"),
          404
        );
        // Warning from mutation onError
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          "Failed to track note view:",
          expect.any(Error)
        );
      });
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // onError handler logs the error
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          "Failed to track note view:",
          expect.any(Error)
        );
      });

      // Hook should remain stable
      expect(typeof result.current.trackView).toBe("function");
    });
  });

  describe("return values", () => {
    it("should return isTracking state during mutation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      // Should be tracking while fetch is pending
      await waitFor(() => {
        expect(result.current.isTracking).toBe(true);
      });

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      await waitFor(() => {
        expect(result.current.isTracking).toBe(false);
      });
    });

    it("should return hasTracked state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      const { result } = renderHook(() => useTrackNoteView("note-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasTracked).toBe(true);
      });
    });
  });

  describe("cache invalidation", () => {
    it("should invalidate recent notes cache on successful tracking", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { viewedAt: "2026-01-12T12:00:00.000Z" } }),
      });

      function Wrapper({ children }: { children: React.ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
      }

      renderHook(() => useTrackNoteView("note-123"), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["notes", "recent"],
        });
      });
    });
  });
});
