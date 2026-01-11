/**
 * Unit tests for usePresence hook
 *
 * Tests presence tracking via Yjs Awareness API.
 * Co-located with usePresence.ts per project conventions.
 *
 * @see Story 4-5: Indicateur de Presence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresence } from "./usePresence";

// Mock HocuspocusProvider and Awareness
const createMockAwareness = () => {
  const listeners = new Map<string, Set<() => void>>();
  const states = new Map<number, Record<string, unknown>>();

  return {
    clientID: 1,
    getStates: () => states,
    setLocalStateField: vi.fn(),
    on: (event: string, handler: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(handler);
    },
    off: (event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler);
    },
    emit: (event: string) => {
      listeners.get(event)?.forEach((handler) => handler());
    },
    _states: states,
    _listeners: listeners,
  };
};

const createMockProvider = (awareness: ReturnType<typeof createMockAwareness>) => ({
  awareness,
});

describe("usePresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should return empty users when provider is null", () => {
      const { result } = renderHook(() => usePresence({ provider: null }));

      expect(result.current.users).toEqual([]);
      expect(result.current.userCount).toBe(0);
    });

    it("should return empty users when awareness has no other users", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      // Advance by a small amount for RAF callback
      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.userCount).toBe(0);
    });
  });

  describe("user tracking", () => {
    it("should track users from awareness states", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      // Add another user to awareness
      awareness._states.set(2, {
        user: {
          name: "Alice",
          color: "#ff0000",
          lastActivity: Date.now(),
        },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.userCount).toBe(1);
      expect(result.current.users[0]).toMatchObject({
        clientId: 2,
        name: "Alice",
        color: "#ff0000",
        isActive: true,
      });
    });

    it("should exclude self from users list", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      // Add self (clientId 1) and another user
      awareness._states.set(1, {
        user: { name: "Self", color: "#000000", lastActivity: Date.now() },
      });
      awareness._states.set(2, {
        user: { name: "Other", color: "#ffffff", lastActivity: Date.now() },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.userCount).toBe(1);
      expect(result.current.users[0].name).toBe("Other");
    });

    it("should handle users without user data", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      // Add a user without user data
      awareness._states.set(2, {});
      awareness._states.set(3, {
        user: { name: "Valid", color: "#00ff00", lastActivity: Date.now() },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.userCount).toBe(1);
      expect(result.current.users[0].name).toBe("Valid");
    });

    it("should use default values for missing user fields", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      // Add user with minimal data
      awareness._states.set(2, {
        user: {}, // No name, color, or lastActivity
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.userCount).toBe(1);
      expect(result.current.users[0].name).toBe("Anonyme");
      expect(result.current.users[0].color).toBe("#888888");
      expect(result.current.users[0].isActive).toBe(false); // No lastActivity = idle
    });

    it("should handle null user object gracefully", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      // Add entry with null user
      awareness._states.set(2, { user: null });
      awareness._states.set(3, {
        user: { name: "Valid", color: "#00ff00", lastActivity: Date.now() },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      // Should only have the valid user
      expect(result.current.userCount).toBe(1);
      expect(result.current.users[0].name).toBe("Valid");
    });
  });

  describe("activity tracking", () => {
    it("should mark users as active when within idle timeout", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);
      const now = Date.now();

      awareness._states.set(2, {
        user: {
          name: "Active User",
          color: "#ff0000",
          lastActivity: now - 10000, // 10 seconds ago
        },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never, idleTimeout: 30000 })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.users[0]?.isActive).toBe(true);
    });

    it("should mark users as inactive when beyond idle timeout", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);
      const now = Date.now();

      awareness._states.set(2, {
        user: {
          name: "Idle User",
          color: "#ff0000",
          lastActivity: now - 60000, // 60 seconds ago
        },
      });

      const { result } = renderHook(() =>
        usePresence({ provider: provider as never, idleTimeout: 30000 })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.users[0]?.isActive).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should clean up awareness listeners on unmount", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      const { unmount } = renderHook(() =>
        usePresence({ provider: provider as never })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(awareness._listeners.get("change")?.size).toBe(1);

      unmount();

      expect(awareness._listeners.get("change")?.size).toBe(0);
    });

    it("should clear users when provider disconnects", () => {
      const awareness = createMockAwareness();
      const provider = createMockProvider(awareness);

      awareness._states.set(2, {
        user: { name: "User", color: "#ff0000", lastActivity: Date.now() },
      });

      const { result, rerender } = renderHook(
        ({ provider }) => usePresence({ provider: provider as never }),
        { initialProps: { provider } }
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(result.current.userCount).toBe(1);

      // Disconnect provider
      rerender({ provider: null });

      expect(result.current.userCount).toBe(0);
    });
  });
});
