/**
 * API integration tests for /api/templates endpoints
 *
 * Tests all CRUD operations with authentication and authorization.
 * @see Story 7.1: Modele Template et Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Helper to create mock request
function createMockRequest(
  url = "http://localhost:3000/api/templates",
  options: RequestInit = {}
) {
  return new NextRequest(new URL(url), options);
}

// Helper to create mock request with JSON body
function createMockRequestWithBody(
  url: string,
  body: unknown,
  method = "POST"
) {
  return new NextRequest(new URL(url), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
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
    template: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import after mocks
import { GET, POST } from "@/app/api/templates/route";
import { GET as GETById, PATCH, DELETE } from "@/app/api/templates/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("/api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock template data
  const mockTemplate = {
    id: "clh2abc123def456ghi789",
    name: "Test Template",
    description: "A test template",
    content: "# Template Content",
    icon: "file-text",
    isSystem: false,
    createdAt: new Date("2026-01-10T10:00:00Z"),
    updatedAt: new Date("2026-01-10T10:00:00Z"),
    createdById: "user-1",
  };

  const mockSystemTemplate = {
    ...mockTemplate,
    id: "clh2xyz789abc123def456",
    name: "System Template",
    isSystem: true,
    createdById: null,
  };

  describe("GET /api/templates", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should return all templates for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "VIEWER" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findMany).mockResolvedValue([
        mockSystemTemplate,
        mockTemplate,
      ]);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe("System Template");
      expect(body.data[1].name).toBe("Test Template");
    });

    it("should return empty array when no templates exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "VIEWER" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findMany).mockResolvedValue([]);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe("POST /api/templates", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates",
        { name: "Test", content: "Content" }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should return 403 if user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates",
        { name: "Test", content: "Content" }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.type).toContain("forbidden");
      expect(body.detail).toContain("Admin role required");
    });

    it("should create template when user is admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.create).mockResolvedValue(mockTemplate);

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates",
        {
          name: "Test Template",
          content: "# Template Content",
          description: "A test template",
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe("Test Template");
      expect(prisma.template.create).toHaveBeenCalled();
    });

    it("should return 400 for invalid request body", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates",
        { name: "", content: "" } // Empty name and content
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.type).toContain("validation");
    });
  });

  describe("GET /api/templates/[id]", () => {
    const mockParams = Promise.resolve({ id: "clh2abc123def456ghi789" });

    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789"
      );

      const response = await GETById(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should return template when found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "VIEWER" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789"
      );

      const response = await GETById(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Test Template");
    });

    it("should return 404 when template not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "VIEWER" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789"
      );

      const response = await GETById(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.type).toContain("not-found");
    });

    it("should return 400 for invalid ID format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "VIEWER" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/templates/invalid-id"
      );

      const response = await GETById(request, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.type).toContain("validation");
    });
  });

  describe("PATCH /api/templates/[id]", () => {
    const mockParams = Promise.resolve({ id: "clh2abc123def456ghi789" });

    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { name: "Updated" },
        "PATCH"
      );

      const response = await PATCH(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should update template when user is admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      } as never);

      vi.mocked(prisma.template.update).mockResolvedValue({
        ...mockTemplate,
        name: "Updated Name",
      });

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { name: "Updated Name" },
        "PATCH"
      );

      const response = await PATCH(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Updated Name");
    });

    it("should update template when user is creator", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1",
        isSystem: false,
      } as never);

      vi.mocked(prisma.template.update).mockResolvedValue({
        ...mockTemplate,
        content: "Updated content",
      });

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { content: "Updated content" },
        "PATCH"
      );

      const response = await PATCH(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 403 when user is not admin and not creator", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      } as never);

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { name: "Updated" },
        "PATCH"
      );

      const response = await PATCH(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.type).toContain("forbidden");
    });

    it("should return 403 when non-admin tries to update system template", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1", // User is creator
        isSystem: true, // But template is system
      } as never);

      const request = createMockRequestWithBody(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { name: "Updated" },
        "PATCH"
      );

      const response = await PATCH(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.detail).toContain("Only admins can modify system templates");
    });
  });

  describe("DELETE /api/templates/[id]", () => {
    const mockParams = Promise.resolve({ id: "clh2abc123def456ghi789" });

    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should delete template when user is admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      } as never);

      vi.mocked(prisma.template.delete).mockResolvedValue(mockTemplate);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });

      expect(response.status).toBe(204);
      expect(prisma.template.delete).toHaveBeenCalled();
    });

    it("should delete template when user is creator", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1",
        isSystem: false,
      } as never);

      vi.mocked(prisma.template.delete).mockResolvedValue(mockTemplate);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });

      expect(response.status).toBe(204);
    });

    it("should return 403 for system template", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: null,
        isSystem: true,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.detail).toContain("System templates cannot be deleted");
    });

    it("should return 403 when user is not admin and not creator", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "EDITOR" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.type).toContain("forbidden");
    });

    it("should return 404 when template not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/templates/clh2abc123def456ghi789",
        { method: "DELETE" }
      );

      const response = await DELETE(request, { params: mockParams });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.type).toContain("not-found");
    });
  });
});
