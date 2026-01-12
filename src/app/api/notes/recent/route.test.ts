/**
 * Unit tests for /api/notes/recent endpoint
 *
 * @see Story 6.4: Notes Récentes - Get recently viewed and modified notes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Helper to create mock request
function createMockRequest(url = "http://localhost:3000/api/notes/recent") {
  return new NextRequest(new URL(url), { method: "GET" });
}

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userNoteView: {
      findMany: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/notes/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return empty arrays when no notes exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recentlyViewed).toEqual([]);
    expect(body.data.recentlyModified).toEqual([]);
  });

  it("should return recently viewed notes with viewedAt", async () => {
    const viewedAt = new Date("2026-01-12T10:00:00Z");
    const updatedAt = new Date("2026-01-11T10:00:00Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([
      {
        id: "view-1",
        userId: "user-1",
        noteId: "note-1",
        viewedAt,
        note: {
          id: "note-1",
          title: "Test Note",
          folderId: null,
          updatedAt,
        },
      },
    ] as never);

    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recentlyViewed).toHaveLength(1);
    expect(body.data.recentlyViewed[0]).toEqual({
      id: "note-1",
      title: "Test Note",
      folderId: null,
      updatedAt: updatedAt.toISOString(),
      viewedAt: viewedAt.toISOString(),
    });
  });

  it("should return recently modified notes with updatedAt", async () => {
    const updatedAt = new Date("2026-01-12T10:00:00Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([
      {
        id: "note-2",
        title: "Modified Note",
        folderId: "folder-1",
        updatedAt,
      },
    ] as never);

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recentlyModified).toHaveLength(1);
    expect(body.data.recentlyModified[0]).toEqual({
      id: "note-2",
      title: "Modified Note",
      folderId: "folder-1",
      updatedAt: updatedAt.toISOString(),
    });
  });

  it("should limit results to 5 notes each", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    await GET(createMockRequest());

    // Verify limit of 5 is passed
    expect(prisma.userNoteView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        orderBy: { viewedAt: "desc" },
      })
    );

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        orderBy: { updatedAt: "desc" },
      })
    );
  });

  it("should exclude deleted notes", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    await GET(createMockRequest());

    // Verify deletedAt: null filter is applied
    expect(prisma.userNoteView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          note: { deletedAt: null },
        }),
      })
    );

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });

  it("should return both lists together", async () => {
    const viewedAt = new Date("2026-01-12T12:00:00Z");
    const updatedAt = new Date("2026-01-12T11:00:00Z");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([
      {
        viewedAt,
        note: {
          id: "note-1",
          title: "Viewed Note",
          folderId: null,
          updatedAt: new Date("2026-01-10T10:00:00Z"),
        },
      },
    ] as never);

    vi.mocked(prisma.note.findMany).mockResolvedValue([
      {
        id: "note-2",
        title: "Modified Note",
        folderId: null,
        updatedAt,
      },
    ] as never);

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty("recentlyViewed");
    expect(body.data).toHaveProperty("recentlyModified");
    expect(body.data.recentlyViewed).toHaveLength(1);
    expect(body.data.recentlyModified).toHaveLength(1);
  });

  it("should accept custom limit parameter", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    await GET(createMockRequest("http://localhost:3000/api/notes/recent?limit=10"));

    expect(prisma.userNoteView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it("should cap limit at maximum of 20", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    await GET(createMockRequest("http://localhost:3000/api/notes/recent?limit=100"));

    expect(prisma.userNoteView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20, // Capped at MAX_LIMIT
      })
    );
  });

  it("should use default limit for invalid limit values", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.userNoteView.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    await GET(createMockRequest("http://localhost:3000/api/notes/recent?limit=invalid"));

    expect(prisma.userNoteView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5, // Default RECENT_NOTES_LIMIT
      })
    );
  });
});
