/**
 * Integration tests for Notes API routes
 *
 * Tests all CRUD endpoints with authentication and authorization scenarios.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

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

import { GET, POST } from "@/app/api/notes/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "@/app/api/notes/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper to create NextRequest
function createRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  const { method = "GET", body } = options;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  });
}

describe("Notes API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notes", () => {
    describe("authentication", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes");
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.type).toBe("https://plumenote.app/errors/unauthorized");
        expect(json.detail).toBe("Authentication required");
      });
    });

    describe("success scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should return paginated notes with default pagination", async () => {
        const mockNotes = [
          {
            id: "note-1",
            title: "Note 1",
            content: "Content 1",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "user-1",
          },
        ];
        vi.mocked(prisma.$transaction).mockResolvedValue([mockNotes, 1]);

        const request = createRequest("http://localhost:3000/api/notes");
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toHaveLength(1);
        expect(json.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
      });

      it("should respect custom pagination params", async () => {
        vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

        const request = createRequest(
          "http://localhost:3000/api/notes?page=2&pageSize=10"
        );
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.meta.page).toBe(2);
        expect(json.meta.pageSize).toBe(10);
      });

      it("should return empty array when user has no notes", async () => {
        vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

        const request = createRequest("http://localhost:3000/api/notes");
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toEqual([]);
        expect(json.meta.total).toBe(0);
      });
    });

    // Note: Query parameter validation is tested in note.schema.test.ts
    // The API route uses safeParse which handles validation gracefully
  });

  describe("POST /api/notes", () => {
    describe("authentication", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes", {
          method: "POST",
          body: { title: "Test" },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.type).toBe("https://plumenote.app/errors/unauthorized");
      });
    });

    describe("success scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should create note with title and content", async () => {
        const mockNote = {
          id: "note-123",
          title: "My Note",
          content: "# Hello",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "user-1",
        };
        vi.mocked(prisma.note.create).mockResolvedValue(mockNote);

        const request = createRequest("http://localhost:3000/api/notes", {
          method: "POST",
          body: { title: "My Note", content: "# Hello" },
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.data.title).toBe("My Note");
      });

      it("should create note with empty body (defaults)", async () => {
        const mockNote = {
          id: "note-123",
          title: "Sans titre",
          content: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "user-1",
        };
        vi.mocked(prisma.note.create).mockResolvedValue(mockNote);

        const request = createRequest("http://localhost:3000/api/notes", {
          method: "POST",
          body: {},
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      });
    });

    // Note: Body validation is tested in note.schema.test.ts
    // The API route uses safeParse which handles validation gracefully
  });

  describe("GET /api/notes/[id]", () => {
    const createParams = (id: string) => Promise.resolve({ id });

    describe("authentication", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc");
        const response = await GET_BY_ID(request, {
          params: createParams("clh2abc123def456ghi789"),
        });
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.type).toBe("https://plumenote.app/errors/unauthorized");
      });
    });

    describe("success scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should return note when user is owner", async () => {
        const mockNote = {
          id: "clh2abc123def456ghi789",
          title: "My Note",
          content: "Content",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "user-1",
        };
        vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);

        const request = createRequest("http://localhost:3000/api/notes/abc");
        const response = await GET_BY_ID(request, {
          params: createParams("clh2abc123def456ghi789"),
        });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.title).toBe("My Note");
      });
    });

    describe("error scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should return 404 when note not found", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc");
        const response = await GET_BY_ID(request, {
          params: createParams("clh2abc123def456ghi789"),
        });
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.type).toBe("https://plumenote.app/errors/not-found");
      });

      it("should return 403 when user is not owner", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
          id: "clh2abc123def456ghi789",
          title: "Note",
          content: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "other-user",
          ydoc: null,
          searchVector: null,
        });

        const request = createRequest("http://localhost:3000/api/notes/abc");
        const response = await GET_BY_ID(request, {
          params: createParams("clh2abc123def456ghi789"),
        });
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.type).toBe("https://plumenote.app/errors/forbidden");
      });

      it("should return 400 for invalid ID format", async () => {
        const request = createRequest("http://localhost:3000/api/notes/abc");
        const response = await GET_BY_ID(request, {
          params: createParams("invalid-id"),
        });
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.detail).toBe("Invalid note ID format");
      });
    });
  });

  describe("PATCH /api/notes/[id]", () => {
    const createParams = (id: string) => Promise.resolve({ id });

    describe("authentication", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "PATCH",
          body: { title: "Updated" },
        });
        const response = await PATCH(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(401);
      });
    });

    describe("success scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should update note title", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
          createdById: "user-1",
        });
        vi.mocked(prisma.note.update).mockResolvedValue({
          id: "clh2abc123def456ghi789",
          title: "Updated Title",
          content: "Content",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: "user-1",
        });

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "PATCH",
          body: { title: "Updated Title" },
        });
        const response = await PATCH(request, {
          params: createParams("clh2abc123def456ghi789"),
        });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data.title).toBe("Updated Title");
      });
    });

    // Note: Body validation is tested in note.schema.test.ts
    // The API route uses safeParse which handles validation gracefully

    describe("error scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should return 404 when note not found", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "PATCH",
          body: { title: "Test" },
        });
        const response = await PATCH(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(404);
      });

      it("should return 403 when user is not owner", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
          createdById: "other-user",
        });

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "PATCH",
          body: { title: "Test" },
        });
        const response = await PATCH(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(403);
      });
    });
  });

  describe("DELETE /api/notes/[id]", () => {
    const createParams = (id: string) => Promise.resolve({ id });

    describe("authentication", () => {
      it("should return 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "DELETE",
        });
        const response = await DELETE(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(401);
      });
    });

    describe("success scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should delete note and return 204", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
          createdById: "user-1",
        });
        vi.mocked(prisma.note.delete).mockResolvedValue({} as never);

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "DELETE",
        });
        const response = await DELETE(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(204);
      });
    });

    describe("error scenarios", () => {
      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", name: "Test", role: "EDITOR" },
          expires: "",
        });
      });

      it("should return 404 when note not found", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "DELETE",
        });
        const response = await DELETE(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(404);
      });

      it("should return 403 when user is not owner", async () => {
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
          createdById: "other-user",
        });

        const request = createRequest("http://localhost:3000/api/notes/abc", {
          method: "DELETE",
        });
        const response = await DELETE(request, {
          params: createParams("clh2abc123def456ghi789"),
        });

        expect(response.status).toBe(403);
      });
    });
  });

  describe("RFC 7807 Error Format", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(null);
    });

    it("should include type, title, status, and detail in error responses", async () => {
      const request = createRequest("http://localhost:3000/api/notes");
      const response = await GET(request);
      const json = await response.json();

      expect(json).toHaveProperty("type");
      expect(json).toHaveProperty("title");
      expect(json).toHaveProperty("status");
      expect(json).toHaveProperty("detail");
      expect(json.type).toMatch(/^https:\/\/plumenote\.app\/errors\//);
    });
  });
});
