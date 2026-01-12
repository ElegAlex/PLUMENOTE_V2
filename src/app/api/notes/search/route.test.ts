/**
 * Unit tests for /api/notes/search endpoint
 *
 * @see Story 6.1: Index Full-Text PostgreSQL
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

vi.mock("@/features/notes/services/notes.service", () => ({
  searchNotes: vi.fn(),
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { searchNotes } from "@/features/notes/services/notes.service";

describe("GET /api/notes/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=test")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return 400 if query parameter is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 400 if query is empty", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return search results with highlights and rank", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    const mockResults = {
      notes: [
        {
          id: "note-1",
          title: "Test Note",
          content: "This is test content",
          folderId: null,
          isFavorite: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "user-1",
          tags: [],
          folder: null,
          highlight: "This is <mark>test</mark> content",
          rank: 0.75,
        },
      ],
      total: 1,
    };

    vi.mocked(searchNotes).mockResolvedValue(mockResults);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=test")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].highlight).toContain("<mark>");
    expect(body.data[0].rank).toBe(0.75);
    expect(body.meta.query).toBe("test");
    expect(body.meta.total).toBe(1);
  });

  it("should pass pagination parameters to service", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(searchNotes).mockResolvedValue({ notes: [], total: 0 });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=test&page=2&pageSize=10")
    );
    await GET(request);

    expect(searchNotes).toHaveBeenCalledWith("user-1", {
      query: "test",
      page: 2,
      pageSize: 10,
      folderId: undefined,
      favoriteOnly: undefined,
      tagIds: undefined,
    });
  });

  it("should pass filter parameters to service", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(searchNotes).mockResolvedValue({ notes: [], total: 0 });

    // Use valid CUIDs for tagIds (validation enforced since Story 6.1 Code Review)
    const request = new NextRequest(
      new URL(
        "http://localhost:3000/api/notes/search?query=test&favoriteOnly=true&tagIds=clx1234567890abcdefghijkl,clx0987654321zyxwvutsrqpon"
      )
    );
    await GET(request);

    expect(searchNotes).toHaveBeenCalledWith("user-1", {
      query: "test",
      page: 1,
      pageSize: 20,
      folderId: undefined,
      favoriteOnly: true,
      tagIds: ["clx1234567890abcdefghijkl", "clx0987654321zyxwvutsrqpon"],
    });
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(searchNotes).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=test")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.type).toContain("internal");
  });

  it("should calculate totalPages correctly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      expires: new Date().toISOString(),
    });

    vi.mocked(searchNotes).mockResolvedValue({ notes: [], total: 45 });

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/search?query=test&pageSize=10")
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.meta.totalPages).toBe(5);
  });
});
