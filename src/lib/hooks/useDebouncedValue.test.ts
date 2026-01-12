/**
 * Unit tests for useDebouncedValue hook
 *
 * @see Story 6.2: Command Palette et Recherche (Task 7)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 500));

    expect(result.current).toBe("initial");
  });

  it("should debounce value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    expect(result.current).toBe("initial");

    // Update value
    rerender({ value: "updated", delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe("initial");

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now the value should be updated
    expect(result.current).toBe("updated");
  });

  it("should cancel previous timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    // Multiple rapid changes
    rerender({ value: "change1", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "change2", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "change3", delay: 500 });

    // Still at initial because debounce keeps resetting
    expect(result.current).toBe("initial");

    // Fast-forward past the debounce delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should have the latest value
    expect(result.current).toBe("change3");
  });

  it("should respect different delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "initial", delay: 150 } }
    );

    rerender({ value: "updated", delay: 150 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Not yet
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Now it should update (150ms total)
    expect(result.current).toBe("updated");
  });

  it("should work with different types", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 42, delay: 300 } }
    );

    expect(result.current).toBe(42);

    rerender({ value: 100, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(100);
  });

  it("should work with objects", () => {
    const initialObj = { name: "test" };
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: initialObj, delay: 200 } }
    );

    expect(result.current).toBe(initialObj);

    const newObj = { name: "updated" };
    rerender({ value: newObj, delay: 200 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(newObj);
  });
});
