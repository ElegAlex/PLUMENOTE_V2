/**
 * Unit tests for /api/workspaces/[id] endpoints
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Helper to create mock request
function createMockRequest(
  url = "http://localhost:3000/api/workspaces/workspace-123",
  options: RequestInit = {}
) {
  return new NextRequest(new URL(url), options);
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

vi.mock("@/features/workspaces/services/workspaces.service", () => ({
  getWorkspaceById: vi.fn(),
  updateWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
}));

import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import {
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "@/features/workspaces/services/workspaces.service";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";

describe("/api/workspaces/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
    description: "A test workspace",
    icon: "folder",
    isPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: "user-1",
  };

  // Helper to create route params
  const createParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  describe("GET /api/workspaces/[id]", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(
        createMockRequest(),
        createParams("workspace-123")
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should return workspace when found and user is owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspaceById).mockResolvedValue(mockWorkspace);

      const response = await GET(
        createMockRequest("http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx"),
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(mockWorkspace.id);
      expect(getWorkspaceById).toHaveBeenCalledWith("clxxxxxxxxxxxxxxxxxxxxxxxxx", "user-1");
    });

    it("should return 400 for invalid workspace ID format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const response = await GET(
        createMockRequest("http://localhost:3000/api/workspaces/invalid-id"),
        createParams("invalid-id")
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.type).toContain("validation");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspaceById).mockRejectedValue(
        new NotFoundError("Workspace not found")
      );

      const response = await GET(
        createMockRequest(),
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.type).toContain("not-found");
    });

    it("should return 403 when user is not owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspaceById).mockRejectedValue(
        new ForbiddenError("You do not have permission")
      );

      const response = await GET(
        createMockRequest(),
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.type).toContain("forbidden");
    });
  });

  describe("PATCH /api/workspaces/[id]", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/workspace-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );

      const response = await PATCH(request, createParams("workspace-123"));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should update workspace with valid data", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWorkspace).mockResolvedValue({
        ...mockWorkspace,
        name: "Updated Name",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Name" }),
        }
      );

      const response = await PATCH(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Updated Name");
      expect(updateWorkspace).toHaveBeenCalledWith(
        "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        "user-1",
        { name: "Updated Name" }
      );
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          method: "PATCH",
          body: "invalid json",
        }
      );

      const response = await PATCH(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.detail).toBe("Invalid JSON body");
    });

    it("should return 400 when no fields provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          method: "PATCH",
          body: JSON.stringify({}),
        }
      );

      const response = await PATCH(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.detail).toContain("At least one field must be provided");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWorkspace).mockRejectedValue(
        new NotFoundError("Workspace not found")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Test" }),
        }
      );

      const response = await PATCH(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 403 when user is not owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWorkspace).mockRejectedValue(
        new ForbiddenError("You do not have permission")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Test" }),
        }
      );

      const response = await PATCH(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/workspaces/[id]", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/workspace-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, createParams("workspace-123"));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should delete workspace when user is owner and workspace is empty", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWorkspace).mockResolvedValue(undefined);

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );

      expect(response.status).toBe(204);
      expect(deleteWorkspace).toHaveBeenCalledWith(
        "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        "user-1"
      );
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWorkspace).mockRejectedValue(
        new NotFoundError("Workspace not found")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(404);
    });

    it("should return 403 when user is not owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWorkspace).mockRejectedValue(
        new ForbiddenError("You do not have permission")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return 409 when workspace has notes", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWorkspace).mockRejectedValue(
        new ConflictError("Cannot delete workspace: it contains notes")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/workspaces/clxxxxxxxxxxxxxxxxxxxxxxxxx",
        { method: "DELETE" }
      );

      const response = await DELETE(
        request,
        createParams("clxxxxxxxxxxxxxxxxxxxxxxxxx")
      );
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.type).toContain("conflict");
    });
  });
});
