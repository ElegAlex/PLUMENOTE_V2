import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  const mockOnCreateNote = vi.fn();
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup any lingering event listeners
    vi.restoreAllMocks();
  });

  it("calls onCreateNote when Ctrl+N is pressed", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnCreateNote).toHaveBeenCalledTimes(1);
  });

  it("calls onCreateNote when Cmd+N is pressed (Mac)", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "n",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnCreateNote).toHaveBeenCalledTimes(1);
  });

  it("calls onSearch when Ctrl+K is pressed", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onSearch: mockOnSearch,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnSearch).toHaveBeenCalledTimes(1);
  });

  it("calls onSearch when Cmd+K is pressed (Mac)", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onSearch: mockOnSearch,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnSearch).toHaveBeenCalledTimes(1);
  });

  it("does not call onSearch when Ctrl+K is pressed in an input", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onSearch: mockOnSearch,
      })
    );

    // Create an input element and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input });
    window.dispatchEvent(event);

    expect(mockOnSearch).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it("does not call handlers when shortcuts are disabled", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
        enabled: false,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnCreateNote).not.toHaveBeenCalled();
  });

  it("does not call handlers for regular N key press without modifier", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "n",
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnCreateNote).not.toHaveBeenCalled();
  });

  it("works with uppercase N key", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
      })
    );

    const event = new KeyboardEvent("keydown", {
      key: "N",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockOnCreateNote).toHaveBeenCalledTimes(1);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        onCreateNote: mockOnCreateNote,
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });
});
