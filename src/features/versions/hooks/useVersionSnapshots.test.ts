/**
 * Unit tests for useVersionSnapshots hook
 *
 * Tests automatic version snapshot functionality including:
 * - Activity tracking
 * - Interval snapshots
 * - Visibility change handling
 * - Page close (beforeunload) handling
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVersionSnapshots } from "./useVersionSnapshots";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn();
Object.defineProperty(navigator, "sendBeacon", {
  value: mockSendBeacon,
  writable: true,
});

describe("useVersionSnapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true });
    mockSendBeacon.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("trackActivity", () => {
    it("should return a trackActivity function", () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      expect(typeof result.current.trackActivity).toBe("function");
    });

    it("should be callable without errors", () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      expect(() => result.current.trackActivity()).not.toThrow();
    });
  });

  describe("triggerSnapshot", () => {
    it("should return a triggerSnapshot function", () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      expect(typeof result.current.triggerSnapshot).toBe("function");
    });

    it("should call fetch with correct endpoint when triggered", async () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      await act(async () => {
        await result.current.triggerSnapshot();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: "note-123" }),
      });
    });

    it("should not call fetch when noteId is null", async () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: null,
          isEditing: true,
        })
      );

      await act(async () => {
        await result.current.triggerSnapshot();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("interval snapshots", () => {
    it("should not start interval when not editing", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: false,
        })
      );

      // Advance time by 5 minutes
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not start interval when noteId is null", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: null,
          isEditing: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not start interval when disabled", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
          enabled: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should create snapshot at interval when editing and recently active", async () => {
      const { result } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      // Advance time by 4 minutes, track activity, then advance 1 more minute
      // This ensures the activity is within the 5-minute window when interval fires
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
      });

      // Track activity at 4 minutes
      act(() => {
        result.current.trackActivity();
      });

      // Advance by 1 minute to trigger the interval (at 5 min mark)
      // Activity was 1 minute ago, so timeSinceActivity < SNAPSHOT_INTERVAL_MS is true
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: "note-123" }),
      });
    });

    it("should skip snapshot at interval when not recently active", async () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      // Don't track activity, simulate 6 minutes of inactivity
      // First advance past the activity window
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000);
      });

      // The interval fires at 5 min but activity was 6 min ago
      // Clear any calls and check next interval
      mockFetch.mockClear();

      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should not have called since no recent activity
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("visibility change handling", () => {
    it("should create beacon snapshot when page becomes hidden", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      // Simulate visibility change to hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/notes/snapshot",
        JSON.stringify({ noteId: "note-123" })
      );
    });

    it("should not create snapshot when page becomes visible", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      // Simulate visibility change to visible
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("should not react to visibility change when disabled", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
          enabled: false,
        })
      );

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });
  });

  describe("beforeunload handling", () => {
    it("should create beacon snapshot on beforeunload", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        "/api/notes/snapshot",
        JSON.stringify({ noteId: "note-123" })
      );
    });

    it("should not create snapshot on beforeunload when disabled", () => {
      renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
          enabled: false,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });
  });

  describe("cleanup on unmount", () => {
    it("should create snapshot on unmount when enabled", async () => {
      const { unmount } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      mockFetch.mockClear();

      await act(async () => {
        unmount();
      });

      // Should have called fetch for unmount snapshot
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should not create snapshot on unmount when disabled", async () => {
      const { unmount } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
          enabled: false,
        })
      );

      mockFetch.mockClear();

      await act(async () => {
        unmount();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should cleanup event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
      const windowRemoveEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useVersionSnapshots({
          noteId: "note-123",
          isEditing: true,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
      windowRemoveEventListenerSpy.mockRestore();
    });
  });

  describe("noteId changes", () => {
    it("should track new noteId when it changes", async () => {
      const { result, rerender } = renderHook(
        ({ noteId }) =>
          useVersionSnapshots({
            noteId,
            isEditing: true,
          }),
        { initialProps: { noteId: "note-123" } }
      );

      // Change noteId
      rerender({ noteId: "note-456" });

      // Trigger snapshot with new noteId
      await act(async () => {
        await result.current.triggerSnapshot();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/notes/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: "note-456" }),
      });
    });
  });
});
