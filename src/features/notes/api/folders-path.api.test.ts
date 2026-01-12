/**
 * Integration tests for Folders Path API route
 *
 * Tests the GET /api/folders/[id]/path endpoint for breadcrumb navigation.
 *
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: {
      findUnique: vi.fn(),
    },
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

import { GET } from "@/app/api/folders/[id]/path/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper to create NextRequest
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "GET",
  });
}

// Helper to create route params
const createParams = (id: string) => Promise.resolve({ id });

// Mock folder data with valid CUID format IDs
const mockFolderRoot = {
  id: "clh0000000000000root0000",
  name: "Documents",
  parentId: null,
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: "clu0000000000000user0001",
};

const mockFolderMiddle = {
  id: "clh0000000000000middle00",
  name: "Projects",
  parentId: "clh0000000000000root0000",
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: "clu0000000000000user0001",
};

const mockFolderLeaf = {
  id: "clh0000000000000leaf0000",
  name: "Current",
  parentId: "clh0000000000000middle00",
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: "clu0000000000000user0001",
};

describe("Folders Path API - GET /api/folders/[id]/path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/folders/clh0000000000000leaf0000/path");
      const response = await GET(request, { params: createParams("clh0000000000000leaf0000") });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.type).toBe("https://plumenote.app/errors/unauthorized");
      expect(json.detail).toBe("Authentification requise");
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "clu0000000000000user0001", name: "Test", role: "EDITOR" },
        expires: "",
      });
    });

    it("should return 400 for invalid folder ID format", async () => {
      const request = createRequest("http://localhost:3000/api/folders/invalid/path");
      const response = await GET(request, { params: createParams("invalid") });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.type).toBe("https://plumenote.app/errors/validation");
      expect(json.detail).toBe("Format d'ID de dossier invalide");
    });
  });

  describe("success scenarios", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "clu0000000000000user0001", name: "Test", role: "EDITOR" },
        expires: "",
      });
    });

    it("should return folder path for single folder (root)", async () => {
      vi.mocked(prisma.folder.findUnique).mockResolvedValueOnce(mockFolderRoot);

      const request = createRequest("http://localhost:3000/api/folders/clh0000000000000root0000/path");
      const response = await GET(request, { params: createParams("clh0000000000000root0000") });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("clh0000000000000root0000");
      expect(json.data[0].name).toBe("Documents");
    });

    it("should return complete path for nested folder", async () => {
      // Mock the recursive folder lookups (leaf -> middle -> root)
      vi.mocked(prisma.folder.findUnique)
        .mockResolvedValueOnce(mockFolderLeaf)    // First call: get leaf folder
        .mockResolvedValueOnce(mockFolderMiddle)  // Second call: get parent (middle)
        .mockResolvedValueOnce(mockFolderRoot);   // Third call: get grandparent (root)

      const request = createRequest("http://localhost:3000/api/folders/clh0000000000000leaf0000/path");
      const response = await GET(request, { params: createParams("clh0000000000000leaf0000") });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(3);
      // Path should be ordered from root to leaf
      expect(json.data[0].id).toBe("clh0000000000000root0000");
      expect(json.data[1].id).toBe("clh0000000000000middle00");
      expect(json.data[2].id).toBe("clh0000000000000leaf0000");
    });
  });

  describe("error scenarios", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "clu0000000000000user0001", name: "Test", role: "EDITOR" },
        expires: "",
      });
    });

    it("should return empty path when folder not found", async () => {
      vi.mocked(prisma.folder.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost:3000/api/folders/clh0000000000notfound00/path");
      const response = await GET(request, { params: createParams("clh0000000000notfound00") });
      const json = await response.json();

      // getFolderPath returns empty array when folder not found (not an error)
      expect(response.status).toBe(200);
      expect(json.data).toEqual([]);
    });

    it("should return 403 when user does not own folder", async () => {
      const otherUserFolder = {
        ...mockFolderRoot,
        createdById: "clu0000000000other0user",
      };
      vi.mocked(prisma.folder.findUnique).mockResolvedValueOnce(otherUserFolder);

      const request = createRequest("http://localhost:3000/api/folders/clh0000000000000root0000/path");
      const response = await GET(request, { params: createParams("clh0000000000000root0000") });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.type).toBe("https://plumenote.app/errors/forbidden");
    });
  });

  describe("RFC 7807 Error Format", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(null);
    });

    it("should include type, title, status, and detail in error responses", async () => {
      const request = createRequest("http://localhost:3000/api/folders/clh0000000000000leaf0000/path");
      const response = await GET(request, { params: createParams("clh0000000000000leaf0000") });
      const json = await response.json();

      expect(json).toHaveProperty("type");
      expect(json).toHaveProperty("title");
      expect(json).toHaveProperty("status");
      expect(json).toHaveProperty("detail");
      expect(json.type).toMatch(/^https:\/\/plumenote\.app\/errors\//);
    });
  });
});
