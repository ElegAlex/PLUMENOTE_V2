/**
 * Unit tests for useAutoSave hook
 *
 * Tests debounced auto-save functionality with merge support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "./useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onSave after delay", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Test" });
    });

    // Should not be called immediately
    expect(onSave).not.toHaveBeenCalled();

    // Advance timer
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledWith({ title: "Test" });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should debounce multiple calls", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "First" });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save({ title: "Second" });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Should not be called yet (timer reset)
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Now it should be called with merged data
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ title: "Second" });
  });

  it("should merge partial updates by default", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Title" });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save({ content: "Content" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should be called with merged data
    expect(onSave).toHaveBeenCalledWith({ title: "Title", content: "Content" });
  });

  it("should not merge when merge option is false", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave(onSave, { delay: 1000, merge: false })
    );

    act(() => {
      result.current.save({ title: "Title" });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.save({ content: "Content" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should only have content (no merge)
    expect(onSave).toHaveBeenCalledWith({ content: "Content" });
  });

  it("should not save when disabled", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave(onSave, { delay: 1000, enabled: false })
    );

    act(() => {
      result.current.save({ title: "Test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("should flush pending save immediately", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Test" });
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flush();
    });

    expect(onSave).toHaveBeenCalledWith({ title: "Test" });
  });

  it("should return true from flush when data was saved", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Test" });
    });

    let wasSaved = false;
    await act(async () => {
      wasSaved = await result.current.flush();
    });

    expect(wasSaved).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should return false from flush when nothing was pending", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    // No save called, directly flush
    let wasSaved = true;
    await act(async () => {
      wasSaved = await result.current.flush();
    });

    expect(wasSaved).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should cancel pending save", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Test" });
    });

    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("should clear timeout on unmount", async () => {
    const onSave = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAutoSave(onSave, { delay: 1000 })
    );

    act(() => {
      result.current.save({ title: "Test" });
    });

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("should handle async onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(onSave, { delay: 1000 }));

    act(() => {
      result.current.save({ title: "Test" });
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledWith({ title: "Test" });
  });

  it("should not call onSave twice if still saving", async () => {
    let resolvePromise: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const onSave = vi.fn().mockReturnValue(savePromise);

    const { result } = renderHook(() => useAutoSave(onSave, { delay: 100 }));

    // First save
    act(() => {
      result.current.save({ title: "First" });
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    // Try to flush while still saving
    act(() => {
      result.current.save({ title: "Second" });
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Should still be 1 because first save is still in progress
    // and pendingData was cleared
    expect(onSave).toHaveBeenCalledTimes(1);

    // Resolve first save
    await act(async () => {
      resolvePromise!();
    });
  });
});
