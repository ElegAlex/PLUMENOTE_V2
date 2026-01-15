/**
 * Unit tests for versions service
 *
 * Tests all CRUD operations with permission verification.
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
    },
    noteVersion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/workspaces/services/permissions.service", () => ({
  canAccessWorkspace: vi.fn(),
  canAccessFolder: vi.fn(),
}));

import {
  createVersion,
  getVersionsByNoteId,
  getVersionById,
  getVersionByNumber,
  getLatestVersionNumber,
} from "./versions.service";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import {
  canAccessWorkspace,
  canAccessFolder,
} from "@/features/workspaces/services/permissions.service";

describe("versions.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNote = {
    id: "note-123",
    workspaceId: null,
    folderId: null,
    createdById: "user-1",
    deletedAt: null,
  };

  const mockWorkspaceNote = {
    id: "note-456",
    workspaceId: "workspace-1",
    folderId: "folder-1",
    createdById: "user-2",
    deletedAt: null,
  };

  const mockVersion = {
    id: "version-1",
    version: 1,
    title: "Version 1",
    content: "# Content",
    ydoc: null,
    createdAt: new Date(),
    noteId: "note-123",
    createdById: "user-1",
  };

  describe("getLatestVersionNumber", () => {
    it("should return 0 when no versions exist", async () => {
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);

      const result = await getLatestVersionNumber("note-123");

      expect(result).toBe(0);
      expect(prisma.noteVersion.findFirst).toHaveBeenCalledWith({
        where: { noteId: "note-123" },
        orderBy: { version: "desc" },
        select: { version: true },
      });
    });

    it("should return latest version number when versions exist", async () => {
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue({ version: 5 });

      const result = await getLatestVersionNumber("note-123");

      expect(result).toBe(5);
    });
  });

  describe("createVersion", () => {
    it("should create a version with auto-incremented version number", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue({ version: 2 });
      vi.mocked(prisma.noteVersion.create).mockResolvedValue({
        ...mockVersion,
        version: 3,
      });

      const result = await createVersion("note-123", "user-1", {
        title: "Version 3",
        content: "# Content",
      });

      expect(result.version).toBe(3);
      expect(prisma.noteVersion.create).toHaveBeenCalledWith({
        data: {
          noteId: "note-123",
          version: 3,
          title: "Version 3",
          content: "# Content",
          ydoc: null,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should create first version (version 1) when no versions exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.noteVersion.create).mockResolvedValue({
        ...mockVersion,
        version: 1,
      });

      const result = await createVersion("note-123", "user-1", {
        title: "First Version",
      });

      expect(result.version).toBe(1);
      expect(prisma.noteVersion.create).toHaveBeenCalledWith({
        data: {
          noteId: "note-123",
          version: 1,
          title: "First Version",
          content: null,
          ydoc: null,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(
        createVersion("nonexistent", "user-1", { title: "Test" })
      ).rejects.toThrow(NotFoundError);
      await expect(
        createVersion("nonexistent", "user-1", { title: "Test" })
      ).rejects.toThrow("Note with ID 'nonexistent' not found");
    });

    it("should throw NotFoundError when note is soft-deleted", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        deletedAt: new Date(),
      });

      await expect(
        createVersion("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when user is not owner of personal note", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        createdById: "other-user",
      });

      await expect(
        createVersion("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        createVersion("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow("You do not have permission to access this note");
    });

    it("should allow version creation for workspace note with access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockWorkspaceNote);
      vi.mocked(canAccessWorkspace).mockResolvedValue(true);
      vi.mocked(canAccessFolder).mockResolvedValue(true);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.noteVersion.create).mockResolvedValue({
        ...mockVersion,
        noteId: "note-456",
      });

      const result = await createVersion("note-456", "user-1", {
        title: "Test",
      });

      expect(result).toBeDefined();
      expect(canAccessWorkspace).toHaveBeenCalledWith("user-1", "workspace-1");
      expect(canAccessFolder).toHaveBeenCalledWith("user-1", "folder-1");
    });

    it("should throw ForbiddenError when user has no workspace access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockWorkspaceNote);
      vi.mocked(canAccessWorkspace).mockResolvedValue(false);

      await expect(
        createVersion("note-456", "user-1", { title: "Test" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError when user has no folder access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockWorkspaceNote);
      vi.mocked(canAccessWorkspace).mockResolvedValue(true);
      vi.mocked(canAccessFolder).mockResolvedValue(false);

      await expect(
        createVersion("note-456", "user-1", { title: "Test" })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("getVersionsByNoteId", () => {
    const mockVersions = [
      {
        id: "v3",
        version: 3,
        title: "V3",
        createdAt: new Date(),
        noteId: "note-123",
        createdById: "user-1",
        createdBy: { name: "User", image: null },
      },
      {
        id: "v2",
        version: 2,
        title: "V2",
        createdAt: new Date(),
        noteId: "note-123",
        createdById: "user-1",
        createdBy: { name: "User", image: null },
      },
    ];

    it("should return paginated versions for note owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockVersions, 3]);

      const result = await getVersionsByNoteId("note-123", "user-1", {
        page: 1,
        pageSize: 20,
      });

      expect(result.versions).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should return empty list when no versions exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

      const result = await getVersionsByNoteId("note-123", "user-1", {
        page: 1,
        pageSize: 20,
      });

      expect(result.versions).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(
        getVersionsByNoteId("nonexistent", "user-1", { page: 1, pageSize: 20 })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when user has no access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        createdById: "other-user",
      });

      await expect(
        getVersionsByNoteId("note-123", "user-1", { page: 1, pageSize: 20 })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("getVersionById", () => {
    const mockVersionWithNote = {
      ...mockVersion,
      note: mockNote,
    };

    it("should return version when user has access", async () => {
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(
        mockVersionWithNote
      );

      const result = await getVersionById("version-1", "user-1");

      expect(result.id).toBe("version-1");
      expect(result.title).toBe("Version 1");
      // Should not include the nested note object
      expect((result as Record<string, unknown>).note).toBeUndefined();
    });

    it("should throw NotFoundError when version does not exist", async () => {
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(null);

      await expect(getVersionById("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
      await expect(getVersionById("nonexistent", "user-1")).rejects.toThrow(
        "Version with ID 'nonexistent' not found"
      );
    });

    it("should throw NotFoundError when parent note is deleted", async () => {
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue({
        ...mockVersionWithNote,
        note: { ...mockNote, deletedAt: new Date() },
      });

      await expect(getVersionById("version-1", "user-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw ForbiddenError when user has no access to note", async () => {
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue({
        ...mockVersionWithNote,
        note: { ...mockNote, createdById: "other-user" },
      });

      await expect(getVersionById("version-1", "user-1")).rejects.toThrow(
        ForbiddenError
      );
    });

    it("should check workspace permissions for workspace notes", async () => {
      const workspaceVersionWithNote = {
        ...mockVersion,
        noteId: "note-456",
        note: mockWorkspaceNote,
      };

      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(
        workspaceVersionWithNote
      );
      vi.mocked(canAccessWorkspace).mockResolvedValue(true);
      vi.mocked(canAccessFolder).mockResolvedValue(true);

      const result = await getVersionById("version-1", "user-1");

      expect(result).toBeDefined();
      expect(canAccessWorkspace).toHaveBeenCalledWith("user-1", "workspace-1");
      expect(canAccessFolder).toHaveBeenCalledWith("user-1", "folder-1");
    });
  });

  describe("getVersionByNumber", () => {
    it("should return version by number when user has access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(mockVersion);

      const result = await getVersionByNumber("note-123", 1, "user-1");

      expect(result.version).toBe(1);
      expect(prisma.noteVersion.findUnique).toHaveBeenCalledWith({
        where: {
          noteId_version: {
            noteId: "note-123",
            version: 1,
          },
        },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(
        getVersionByNumber("nonexistent", 1, "user-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when version number does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(null);

      await expect(getVersionByNumber("note-123", 999, "user-1")).rejects.toThrow(
        NotFoundError
      );
      await expect(getVersionByNumber("note-123", 999, "user-1")).rejects.toThrow(
        "Version 999 of note 'note-123' not found"
      );
    });

    it("should throw ForbiddenError when user has no access", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        createdById: "other-user",
      });

      await expect(
        getVersionByNumber("note-123", 1, "user-1")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
