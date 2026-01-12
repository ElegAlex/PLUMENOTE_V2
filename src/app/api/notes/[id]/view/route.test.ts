/**
 * Unit tests for /api/notes/[id]/view endpoint
 *
 * @see Story 6.4: Notes Récentes - Track note views
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    note: {
      findFirst: vi.fn(),
    },
    userNoteView: {
      upsert: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("POST /api/notes/[id]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/test-note-id/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "test-note-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return 400 if note ID is invalid format", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/invalid/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "invalid" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 404 if note not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain("not-found");
  });

  it("should track view and return viewedAt timestamp", async () => {
    const viewedAt = new Date();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    vi.mocked(prisma.userNoteView.upsert).mockResolvedValue({
      id: "view-1",
      userId: "user-1",
      noteId: "clx1234567890abcdefghijkl",
      viewedAt,
    } as never);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.viewedAt).toBe(viewedAt.toISOString());
  });

  it("should verify note ownership before tracking", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    vi.mocked(prisma.userNoteView.upsert).mockResolvedValue({
      id: "view-1",
      userId: "user-1",
      noteId: "clx1234567890abcdefghijkl",
      viewedAt: new Date(),
    } as never);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });

    // Verify ownership check query
    expect(prisma.note.findFirst).toHaveBeenCalledWith({
      where: {
        id: "clx1234567890abcdefghijkl",
        createdById: "user-1",
        deletedAt: null,
      },
      select: { id: true },
    });
  });

  it("should use upsert to avoid duplicate view records", async () => {
    const viewedAt = new Date();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    vi.mocked(prisma.userNoteView.upsert).mockResolvedValue({
      id: "view-1",
      userId: "user-1",
      noteId: "clx1234567890abcdefghijkl",
      viewedAt,
    } as never);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });

    // Verify upsert was called with correct parameters
    expect(prisma.userNoteView.upsert).toHaveBeenCalledWith({
      where: {
        userId_noteId: {
          userId: "user-1",
          noteId: "clx1234567890abcdefghijkl",
        },
      },
      update: expect.objectContaining({
        viewedAt: expect.any(Date),
      }),
      create: {
        userId: "user-1",
        noteId: "clx1234567890abcdefghijkl",
      },
    });
  });
});
