/**
 * Tests for useCollaboration hook
 *
 * Note: Tests that require HocuspocusProvider to work as a constructor
 * are limited due to Vitest mock hoisting. Full integration tests should
 * be done with a running Hocuspocus server.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock yjs - define mock factory inline
vi.mock("yjs", () => {
  return {
    Doc: class MockDoc {
      destroy = vi.fn();
    },
  };
});

// Mock HocuspocusProvider - simple mock that doesn't need constructor behavior
vi.mock("@hocuspocus/provider", () => ({
  HocuspocusProvider: vi.fn(),
}));

// Import after mocks are set up
import { useSession } from "next-auth/react";
import { useCollaboration } from "./useCollaboration";

const mockedUseSession = vi.mocked(useSession);

describe("useCollaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("authentication states", () => {
    it("should return disconnected status when session is loading", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.status).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);
      expect(result.current.provider).toBeNull();
    });

    it("should return error when session is unauthenticated and trying to connect", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      act(() => {
        result.current.connect();
      });

      expect(result.current.error).toBe("Authentication required");
      expect(result.current.status).toBe("disconnected");
    });

    it("should return error when session has no access token", () => {
      mockedUseSession.mockReturnValue({
        data: { user: { id: "1", name: "Test" }, expires: "2099-01-01" },
        status: "authenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      act(() => {
        result.current.connect();
      });

      expect(result.current.error).toBe("No access token available");
    });
  });

  describe("initialization", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue({
        data: {
          user: { id: "1", name: "Test" },
          expires: "2099-01-01",
          accessToken: "test-token",
        } as ReturnType<typeof useSession>["data"],
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("should create Y.Doc on initialization", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.ydoc).toBeDefined();
    });

    it("should not auto-connect when autoConnect is false", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.provider).toBeNull();
      expect(result.current.status).toBe("disconnected");
    });

    it("should return connect and disconnect functions", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(typeof result.current.connect).toBe("function");
      expect(typeof result.current.disconnect).toBe("function");
    });
  });

  describe("status flags", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });
    });

    it("should return correct isSynced flag when not synced", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.isSynced).toBe(false);
    });

    it("should return correct isConnected flag when disconnected", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.isConnected).toBe(false);
    });

    it("should return null error initially", () => {
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.error).toBeNull();
    });
  });

  describe("options handling", () => {
    it("should accept noteId option", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      // Should not throw
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "my-note-123" })
      );

      expect(result.current.ydoc).toBeDefined();
    });

    it("should accept autoConnect option", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      // Should not throw with autoConnect: false
      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      expect(result.current.status).toBe("disconnected");
    });

    it("should accept wsUrl option", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      // Should not throw with custom wsUrl
      const { result } = renderHook(() =>
        useCollaboration({
          noteId: "test-note",
          autoConnect: false,
          wsUrl: "ws://custom:9999",
        })
      );

      expect(result.current.ydoc).toBeDefined();
    });
  });

  describe("disconnect behavior", () => {
    it("should handle disconnect when not connected", () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCollaboration({ noteId: "test-note", autoConnect: false })
      );

      // Should not throw when disconnecting while not connected
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe("disconnected");
      expect(result.current.provider).toBeNull();
    });
  });
});
