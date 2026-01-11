/**
 * Unit tests for useMoveNote hook
 *
 * Tests React Query-based note moving between folders.
 * Now optimized to get previousFolderId from cache instead of API.
 *
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMoveNote } from "./useMoveNote";
import { noteKeys } from "./useNote";
import type { ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create wrapper with QueryClient and optional cache data
function createWrapper(cacheData?: { noteId: string; folderId: string | null }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Pre-populate cache if provided
  if (cacheData) {
    queryClient.setQueryData(noteKeys.detail(cacheData.noteId), {
      id: cacheData.noteId,
      folderId: cacheData.folderId,
    });
  }

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockNote = {
  id: "note-123",
  title: "Test Note",
  content: "<p>Content</p>",
  folderId: "folder-1",
  isFavorite: false,
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdById: "user-1",
};

describe("useMoveNote", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should move note to a folder successfully", async () => {
    const onSuccess = vi.fn();

    // Mock PATCH update only (no GET needed)
    const updatedNote = { ...mockNote, folderId: "folder-2" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedNote }),
    });

    const { result } = renderHook(() => useMoveNote({ onSuccess }), {
      wrapper: createWrapper({ noteId: "note-123", folderId: "folder-1" }),
    });

    expect(result.current.isMoving).toBe(false);

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: "folder-2" });
    });

    await waitFor(() => {
      expect(result.current.isMoving).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith({
      note: updatedNote,
      previousFolderId: "folder-1",
    });

    // Verify only 1 API call (PATCH)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: "folder-2" }),
    });
  });

  it("should move note to root (folderId: null)", async () => {
    const onSuccess = vi.fn();

    // Mock PATCH update
    const updatedNote = { ...mockNote, folderId: null };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedNote }),
    });

    const { result } = renderHook(() => useMoveNote({ onSuccess }), {
      wrapper: createWrapper({ noteId: "note-123", folderId: "folder-1" }),
    });

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: null });
    });

    await waitFor(() => {
      expect(result.current.isMoving).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith({
      note: updatedNote,
      previousFolderId: "folder-1",
    });

    // Verify PATCH was called with null folderId
    expect(mockFetch).toHaveBeenCalledWith("/api/notes/note-123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: null }),
    });
  });

  it("should handle move error", async () => {
    const onError = vi.fn();

    // Mock PATCH failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Folder not found" }),
    });

    const { result } = renderHook(() => useMoveNote({ onError }), {
      wrapper: createWrapper({ noteId: "note-123", folderId: "folder-1" }),
    });

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: "invalid-folder" });
    });

    await waitFor(() => {
      expect(result.current.isMoving).toBe(false);
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.error?.message).toBe("Folder not found");
  });

  it("should handle previousFolderId as null when not in cache", async () => {
    const onSuccess = vi.fn();

    // Mock PATCH update
    const updatedNote = { ...mockNote, folderId: "folder-2" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedNote }),
    });

    // No cache data - previousFolderId will be null
    const { result } = renderHook(() => useMoveNote({ onSuccess }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: "folder-2" });
    });

    await waitFor(() => {
      expect(result.current.isMoving).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith({
      note: updatedNote,
      previousFolderId: null,
    });
  });

  it("should capture previousFolderId as null when note is at root", async () => {
    const onSuccess = vi.fn();

    // Mock PATCH update
    const updatedNote = { ...mockNote, folderId: "folder-1" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedNote }),
    });

    const { result } = renderHook(() => useMoveNote({ onSuccess }), {
      wrapper: createWrapper({ noteId: "note-123", folderId: null }),
    });

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: "folder-1" });
    });

    await waitFor(() => {
      expect(result.current.isMoving).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith({
      note: updatedNote,
      previousFolderId: null,
    });
  });

  it("should provide async version for chaining", async () => {
    // Mock PATCH update
    const updatedNote = { ...mockNote, folderId: "folder-2" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedNote }),
    });

    const { result } = renderHook(() => useMoveNote(), {
      wrapper: createWrapper({ noteId: "note-123", folderId: "folder-1" }),
    });

    let moveResult;
    await act(async () => {
      moveResult = await result.current.moveNoteAsync({
        noteId: "note-123",
        folderId: "folder-2",
      });
    });

    expect(moveResult).toEqual({
      note: updatedNote,
      previousFolderId: "folder-1",
    });
  });

  it("should reset mutation state", async () => {
    // Mock PATCH failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Error" }),
    });

    const { result } = renderHook(() => useMoveNote(), {
      wrapper: createWrapper({ noteId: "note-123", folderId: "folder-1" }),
    });

    await act(async () => {
      result.current.moveNote({ noteId: "note-123", folderId: "folder-2" });
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    await act(async () => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
