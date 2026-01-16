/**
 * Unit tests for /api/notes/[id]/view endpoint
 *
 * @see Story 6.4: Notes Récentes - Track note views
 * @see Story 10.1: Enhanced with viewCount tracking and deduplication
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
  },
}));

// Mock analytics service (Story 10.1)
vi.mock("@/features/analytics", () => ({
  trackNoteView: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackNoteView } from "@/features/analytics";

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

  it("should track view and return counted and viewCount (Story 10.1)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    // Story 10.1: trackNoteView returns { counted, viewCount }
    vi.mocked(trackNoteView).mockResolvedValue({
      counted: true,
      viewCount: 5,
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.counted).toBe(true);
    expect(body.data.viewCount).toBe(5);
  });

  it("should return counted=false when view is deduplicated (Story 10.1)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    // Story 10.1: View not counted due to deduplication
    vi.mocked(trackNoteView).mockResolvedValue({
      counted: false,
      viewCount: 5,
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    const response = await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.counted).toBe(false);
    expect(body.data.viewCount).toBe(5);
  });

  it("should verify note access before tracking (personal + workspace notes)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    vi.mocked(trackNoteView).mockResolvedValue({
      counted: true,
      viewCount: 1,
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });

    // Story 10.1: Access check includes workspace membership
    expect(prisma.note.findFirst).toHaveBeenCalledWith({
      where: {
        id: "clx1234567890abcdefghijkl",
        deletedAt: null,
        OR: [
          { createdById: "user-1", workspaceId: null },
          { workspace: { ownerId: "user-1" } },
          { workspace: { members: { some: { userId: "user-1" } } } },
        ],
      },
      select: { id: true },
    });
  });

  it("should call trackNoteView service with correct parameters (Story 10.1)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.note.findFirst).mockResolvedValue({
      id: "clx1234567890abcdefghijkl",
    } as never);

    vi.mocked(trackNoteView).mockResolvedValue({
      counted: true,
      viewCount: 10,
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/clx1234567890abcdefghijkl/view"),
      { method: "POST" }
    );
    await POST(request, {
      params: Promise.resolve({ id: "clx1234567890abcdefghijkl" }),
    });

    // Verify trackNoteView was called with noteId and userId
    expect(trackNoteView).toHaveBeenCalledWith(
      "clx1234567890abcdefghijkl",
      "user-1"
    );
  });
});
