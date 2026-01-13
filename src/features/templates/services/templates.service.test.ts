/**
 * Unit tests for templates service
 *
 * Tests all CRUD operations with role-based access control.
 * @see Story 7.1: Modele Template et Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
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

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "./templates.service";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";

describe("templates.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Common mock data
  const mockTemplate = {
    id: "template-123",
    name: "Test Template",
    description: "A test template",
    content: "# Template Content",
    icon: "file-text",
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  };

  const mockSystemTemplate = {
    ...mockTemplate,
    id: "system-template-1",
    name: "System Template",
    isSystem: true,
    createdById: null,
  };

  describe("createTemplate", () => {
    it("should create a template when user is admin", async () => {
      vi.mocked(prisma.template.create).mockResolvedValue(mockTemplate);

      const result = await createTemplate("user-1", "ADMIN", {
        name: "Test Template",
        content: "# Template Content",
        description: "A test template",
      });

      expect(result.id).toBe(mockTemplate.id);
      expect(result.name).toBe(mockTemplate.name);
      expect(prisma.template.create).toHaveBeenCalledWith({
        data: {
          name: "Test Template",
          description: "A test template",
          content: "# Template Content",
          icon: "file-text",
          isSystem: false,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should throw ForbiddenError when user is not admin", async () => {
      await expect(
        createTemplate("user-1", "EDITOR", {
          name: "Test",
          content: "Content",
        })
      ).rejects.toThrow(ForbiddenError);

      await expect(
        createTemplate("user-1", "VIEWER", {
          name: "Test",
          content: "Content",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.template.create).not.toHaveBeenCalled();
    });

    it("should use default icon when not provided", async () => {
      vi.mocked(prisma.template.create).mockResolvedValue(mockTemplate);

      await createTemplate("user-1", "ADMIN", {
        name: "Test",
        content: "Content",
      });

      expect(prisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icon: "file-text",
        }),
        select: expect.any(Object),
      });
    });

    it("should use provided icon", async () => {
      vi.mocked(prisma.template.create).mockResolvedValue({
        ...mockTemplate,
        icon: "server",
      });

      await createTemplate("user-1", "ADMIN", {
        name: "Server Template",
        content: "Content",
        icon: "server",
      });

      expect(prisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icon: "server",
        }),
        select: expect.any(Object),
      });
    });

    it("should create system template when isSystem=true", async () => {
      vi.mocked(prisma.template.create).mockResolvedValue({
        ...mockTemplate,
        isSystem: true,
      });

      await createTemplate("user-1", "ADMIN", {
        name: "System Template",
        content: "Content",
        isSystem: true,
      });

      expect(prisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSystem: true,
        }),
        select: expect.any(Object),
      });
    });

    it("should handle null description", async () => {
      vi.mocked(prisma.template.create).mockResolvedValue({
        ...mockTemplate,
        description: null,
      });

      await createTemplate("user-1", "ADMIN", {
        name: "Test",
        content: "Content",
        description: null,
      });

      expect(prisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
        select: expect.any(Object),
      });
    });
  });

  describe("getAllTemplates", () => {
    it("should return all templates sorted by isSystem desc, name asc", async () => {
      const templates = [mockSystemTemplate, mockTemplate];
      vi.mocked(prisma.template.findMany).mockResolvedValue(templates);

      const result = await getAllTemplates();

      expect(result).toHaveLength(2);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      });
    });

    it("should return empty array when no templates exist", async () => {
      vi.mocked(prisma.template.findMany).mockResolvedValue([]);

      const result = await getAllTemplates();

      expect(result).toHaveLength(0);
    });
  });

  describe("getTemplateById", () => {
    it("should return template when found", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate);

      const result = await getTemplateById("template-123");

      expect(result).toMatchObject({
        id: mockTemplate.id,
        name: mockTemplate.name,
      });
      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: "template-123" },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundError when template not found", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      await expect(getTemplateById("nonexistent")).rejects.toThrow(NotFoundError);
      await expect(getTemplateById("nonexistent")).rejects.toThrow(
        "Template with ID 'nonexistent' not found"
      );
    });
  });

  describe("updateTemplate", () => {
    it("should update template when user is admin", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      });
      vi.mocked(prisma.template.update).mockResolvedValue({
        ...mockTemplate,
        name: "Updated Name",
      });

      const result = await updateTemplate("template-123", "user-1", "ADMIN", {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: "template-123" },
        data: { name: "Updated Name" },
        select: expect.any(Object),
      });
    });

    it("should update template when user is creator", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1",
        isSystem: false,
      });
      vi.mocked(prisma.template.update).mockResolvedValue({
        ...mockTemplate,
        content: "Updated content",
      });

      const result = await updateTemplate("template-123", "user-1", "EDITOR", {
        content: "Updated content",
      });

      expect(result).toBeDefined();
      expect(prisma.template.update).toHaveBeenCalled();
    });

    it("should throw NotFoundError when template not found", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      await expect(
        updateTemplate("nonexistent", "user-1", "ADMIN", { name: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when user is not admin and not creator", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      });

      await expect(
        updateTemplate("template-123", "user-1", "EDITOR", { name: "Test" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        updateTemplate("template-123", "user-1", "EDITOR", { name: "Test" })
      ).rejects.toThrow("You do not have permission to update this template");
    });

    it("should throw ForbiddenError when non-admin tries to update system template", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1", // User is creator
        isSystem: true, // But template is system
      });

      await expect(
        updateTemplate("template-123", "user-1", "EDITOR", { name: "Test" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        updateTemplate("template-123", "user-1", "EDITOR", { name: "Test" })
      ).rejects.toThrow("Only admins can modify system templates");
    });

    it("should allow admin to update system template", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: null,
        isSystem: true,
      });
      vi.mocked(prisma.template.update).mockResolvedValue(mockSystemTemplate);

      await updateTemplate("system-template-1", "admin-1", "ADMIN", {
        name: "Updated System Template",
      });

      expect(prisma.template.update).toHaveBeenCalled();
    });

    it("should only update provided fields", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1",
        isSystem: false,
      });
      vi.mocked(prisma.template.update).mockResolvedValue(mockTemplate);

      await updateTemplate("template-123", "user-1", "ADMIN", {
        name: "New Name",
        description: "New description",
      });

      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: "template-123" },
        data: {
          name: "New Name",
          description: "New description",
        },
        select: expect.any(Object),
      });
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template when user is admin", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      });
      vi.mocked(prisma.template.delete).mockResolvedValue(mockTemplate);

      await deleteTemplate("template-123", "admin-1", "ADMIN");

      expect(prisma.template.delete).toHaveBeenCalledWith({
        where: { id: "template-123" },
      });
    });

    it("should delete template when user is creator", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "user-1",
        isSystem: false,
      });
      vi.mocked(prisma.template.delete).mockResolvedValue(mockTemplate);

      await deleteTemplate("template-123", "user-1", "EDITOR");

      expect(prisma.template.delete).toHaveBeenCalledWith({
        where: { id: "template-123" },
      });
    });

    it("should throw NotFoundError when template not found", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

      await expect(
        deleteTemplate("nonexistent", "user-1", "ADMIN")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for system template", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: null,
        isSystem: true,
      });

      await expect(
        deleteTemplate("system-template-1", "admin-1", "ADMIN")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        deleteTemplate("system-template-1", "admin-1", "ADMIN")
      ).rejects.toThrow("System templates cannot be deleted");

      expect(prisma.template.delete).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenError when user is not admin and not creator", async () => {
      vi.mocked(prisma.template.findUnique).mockResolvedValue({
        createdById: "other-user",
        isSystem: false,
      });

      await expect(
        deleteTemplate("template-123", "user-1", "EDITOR")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        deleteTemplate("template-123", "user-1", "EDITOR")
      ).rejects.toThrow("You do not have permission to delete this template");

      expect(prisma.template.delete).not.toHaveBeenCalled();
    });
  });
});
