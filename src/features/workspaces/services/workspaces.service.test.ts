/**
 * Unit tests for workspaces service
 *
 * Tests all CRUD operations with ownership-based access control.
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createWorkspace,
  getWorkspacesByUser,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "./workspaces.service";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";

describe("workspaces.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Common mock data
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

  const mockPersonalWorkspace = {
    ...mockWorkspace,
    id: "personal-workspace-1",
    name: "Personal Workspace",
    isPersonal: true,
  };

  describe("createWorkspace", () => {
    it("should create a workspace for any authenticated user", async () => {
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace);

      const result = await createWorkspace("user-1", {
        name: "Test Workspace",
        description: "A test workspace",
      });

      expect(result.id).toBe(mockWorkspace.id);
      expect(result.name).toBe(mockWorkspace.name);
      expect(result.ownerId).toBe("user-1");
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "Test Workspace",
          description: "A test workspace",
          icon: "folder",
          isPersonal: false,
          ownerId: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should use default icon when not provided", async () => {
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace);

      await createWorkspace("user-1", {
        name: "Test",
      });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icon: "folder",
        }),
        select: expect.any(Object),
      });
    });

    it("should use provided icon", async () => {
      vi.mocked(prisma.workspace.create).mockResolvedValue({
        ...mockWorkspace,
        icon: "briefcase",
      });

      await createWorkspace("user-1", {
        name: "Work Workspace",
        icon: "briefcase",
      });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icon: "briefcase",
        }),
        select: expect.any(Object),
      });
    });

    it("should create personal workspace when isPersonal=true", async () => {
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockPersonalWorkspace);

      await createWorkspace("user-1", {
        name: "Personal Workspace",
        isPersonal: true,
      });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPersonal: true,
        }),
        select: expect.any(Object),
      });
    });

    it("should handle null description", async () => {
      vi.mocked(prisma.workspace.create).mockResolvedValue({
        ...mockWorkspace,
        description: null,
      });

      await createWorkspace("user-1", {
        name: "Test",
        description: null,
      });

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
        select: expect.any(Object),
      });
    });
  });

  describe("getWorkspacesByUser", () => {
    it("should return all workspaces for user sorted by isPersonal desc, name asc", async () => {
      const workspaces = [mockPersonalWorkspace, mockWorkspace];
      vi.mocked(prisma.workspace.findMany).mockResolvedValue(workspaces);

      const result = await getWorkspacesByUser("user-1");

      expect(result).toHaveLength(2);
      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
        select: expect.any(Object),
        orderBy: [{ isPersonal: "desc" }, { name: "asc" }],
      });
    });

    it("should return empty array when user has no workspaces", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([]);

      const result = await getWorkspacesByUser("user-1");

      expect(result).toHaveLength(0);
    });

    it("should only return workspaces owned by the user", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([mockWorkspace]);

      await getWorkspacesByUser("user-1");

      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
        select: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe("getWorkspaceById", () => {
    it("should return workspace when found and user is owner", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace);

      const result = await getWorkspaceById("workspace-123", "user-1");

      expect(result).toMatchObject({
        id: mockWorkspace.id,
        name: mockWorkspace.name,
      });
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: "workspace-123" },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundError when workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(getWorkspaceById("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
      await expect(getWorkspaceById("nonexistent", "user-1")).rejects.toThrow(
        "Workspace with ID 'nonexistent' not found"
      );
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace);

      await expect(
        getWorkspaceById("workspace-123", "other-user")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        getWorkspaceById("workspace-123", "other-user")
      ).rejects.toThrow("You do not have permission to access this workspace");
    });
  });

  describe("updateWorkspace", () => {
    it("should update workspace when user is owner", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
      });
      vi.mocked(prisma.workspace.update).mockResolvedValue({
        ...mockWorkspace,
        name: "Updated Name",
      });

      const result = await updateWorkspace("workspace-123", "user-1", {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "workspace-123" },
        data: { name: "Updated Name" },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundError when workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(
        updateWorkspace("nonexistent", "user-1", { name: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "other-user",
      });

      await expect(
        updateWorkspace("workspace-123", "user-1", { name: "Test" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        updateWorkspace("workspace-123", "user-1", { name: "Test" })
      ).rejects.toThrow("You do not have permission to update this workspace");
    });

    it("should only update provided fields", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
      });
      vi.mocked(prisma.workspace.update).mockResolvedValue(mockWorkspace);

      await updateWorkspace("workspace-123", "user-1", {
        name: "New Name",
        description: "New description",
      });

      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "workspace-123" },
        data: {
          name: "New Name",
          description: "New description",
        },
        select: expect.any(Object),
      });
    });

    it("should update icon when provided", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
      });
      vi.mocked(prisma.workspace.update).mockResolvedValue({
        ...mockWorkspace,
        icon: "briefcase",
      });

      await updateWorkspace("workspace-123", "user-1", {
        icon: "briefcase",
      });

      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "workspace-123" },
        data: { icon: "briefcase" },
        select: expect.any(Object),
      });
    });
  });

  describe("deleteWorkspace", () => {
    it("should delete workspace when user is owner and workspace is empty", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        _count: { notes: 0 },
      });
      vi.mocked(prisma.workspace.delete).mockResolvedValue(mockWorkspace);

      await deleteWorkspace("workspace-123", "user-1");

      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: "workspace-123" },
      });
    });

    it("should throw NotFoundError when workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(deleteWorkspace("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "other-user",
        _count: { notes: 0 },
      });

      await expect(
        deleteWorkspace("workspace-123", "user-1")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        deleteWorkspace("workspace-123", "user-1")
      ).rejects.toThrow("You do not have permission to delete this workspace");

      expect(prisma.workspace.delete).not.toHaveBeenCalled();
    });

    it("should throw ConflictError when workspace has notes", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        _count: { notes: 5 },
      });

      await expect(
        deleteWorkspace("workspace-123", "user-1")
      ).rejects.toThrow(ConflictError);
      await expect(
        deleteWorkspace("workspace-123", "user-1")
      ).rejects.toThrow(
        "Cannot delete workspace: it contains 5 note(s). Move or delete them first."
      );

      expect(prisma.workspace.delete).not.toHaveBeenCalled();
    });

    it("should throw ConflictError with correct count when workspace has one note", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        _count: { notes: 1 },
      });

      await expect(
        deleteWorkspace("workspace-123", "user-1")
      ).rejects.toThrow("Cannot delete workspace: it contains 1 note(s)");
    });
  });
});
