/**
 * API Route Tests: GET /api/notes/[id]/backlinks
 *
 * Tests for the backlinks endpoint that returns notes linking TO the specified note.
 *
 * @see Story 6.7: Panneau Backlinks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/note-links", () => ({
  getBacklinks: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { getBacklinks } from "@/lib/note-links";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockGetBacklinks = vi.mocked(getBacklinks);
const mockFindUnique = vi.mocked(prisma.note.findUnique);

describe("GET /api/notes/[id]/backlinks", () => {
  const validNoteId = "cltest123456789";
  const mockParams = { params: Promise.resolve({ id: validNoteId }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
    expect(body.title).toBe("Unauthorized");
  });

  it("returns 404 if note does not exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user123", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain("not-found");
  });

  it("returns 404 if note is soft-deleted", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user123", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindUnique.mockResolvedValue({
      id: validNoteId,
      createdById: "user123",
      deletedAt: new Date(),
    } as never);

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain("not-found");
  });

  it("returns empty array when no backlinks exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user123", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindUnique.mockResolvedValue({
      id: validNoteId,
      createdById: "user123",
      deletedAt: null,
    } as never);
    mockGetBacklinks.mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(mockGetBacklinks).toHaveBeenCalledWith(validNoteId);
  });

  it("returns backlinks with correct format", async () => {
    const mockBacklinks = [
      { id: "note1", title: "Note One", linkTitle: "Reference" },
      { id: "note2", title: "Note Two", linkTitle: null },
    ];

    mockAuth.mockResolvedValue({
      user: { id: "user123", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindUnique.mockResolvedValue({
      id: validNoteId,
      createdById: "user123",
      deletedAt: null,
    } as never);
    mockGetBacklinks.mockResolvedValue(mockBacklinks);

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(mockBacklinks);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toHaveProperty("id", "note1");
    expect(body.data[0]).toHaveProperty("title", "Note One");
    expect(body.data[0]).toHaveProperty("linkTitle", "Reference");
  });

  it("returns 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user123", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockFindUnique.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/notes/test/backlinks");
    const response = await GET(request, mockParams);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.type).toContain("internal");
  });
});
