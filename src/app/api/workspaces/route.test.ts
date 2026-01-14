/**
 * Unit tests for /api/workspaces endpoints
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Helper to create mock request
function createMockRequest(
  url = "http://localhost:3000/api/workspaces",
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
  createWorkspace: vi.fn(),
  getWorkspacesByUser: vi.fn(),
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import {
  createWorkspace,
  getWorkspacesByUser,
} from "@/features/workspaces/services/workspaces.service";

describe("/api/workspaces", () => {
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

  describe("GET /api/workspaces", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should return workspaces for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspacesByUser).mockResolvedValue([mockWorkspace]);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(mockWorkspace.id);
      expect(getWorkspacesByUser).toHaveBeenCalledWith("user-1");
    });

    it("should return empty array when user has no workspaces", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspacesByUser).mockResolvedValue([]);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    it("should return 500 on service error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getWorkspacesByUser).mockRejectedValue(new Error("DB error"));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.type).toContain("internal");
    });
  });

  describe("POST /api/workspaces", () => {
    it("should return 401 if user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.type).toContain("unauthorized");
    });

    it("should create workspace with valid data", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(createWorkspace).mockResolvedValue(mockWorkspace);

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Workspace",
          description: "A test workspace",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.id).toBe(mockWorkspace.id);
      expect(createWorkspace).toHaveBeenCalledWith("user-1", {
        name: "Test Workspace",
        description: "A test workspace",
        isPersonal: false,
      });
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.detail).toBe("Invalid JSON body");
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ description: "No name" }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.type).toContain("validation");
    });

    it("should return 400 when name is empty", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.detail).toContain("Name is required");
    });

    it("should create workspace with optional fields", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(createWorkspace).mockResolvedValue({
        ...mockWorkspace,
        icon: "briefcase",
        isPersonal: true,
      });

      const request = createMockRequest("http://localhost:3000/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: "Work",
          icon: "briefcase",
          isPersonal: true,
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(createWorkspace).toHaveBeenCalledWith("user-1", {
        name: "Work",
        icon: "briefcase",
        isPersonal: true,
      });
    });
  });
});
