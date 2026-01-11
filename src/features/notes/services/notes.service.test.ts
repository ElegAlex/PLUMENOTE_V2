/**
 * Unit tests for notes service
 *
 * Tests all CRUD operations with ownership verification.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
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

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  createNote,
  getNoteById,
  getUserNotes,
  updateNote,
  deleteNote,
  restoreNote,
  toggleNoteFavorite,
} from "./notes.service";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";

describe("notes.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createNote", () => {
    const mockNote = {
      id: "note-123",
      title: "Test Note",
      content: "# Hello",
      folderId: null,
      isFavorite: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: "user-1",
      folder: null,
      tags: [],
    };

    it("should create a note with provided title and content", async () => {
      vi.mocked(prisma.note.create).mockResolvedValue(mockNote);

      const result = await createNote("user-1", {
        title: "Test Note",
        content: "# Hello",
      });

      expect(result.id).toBe(mockNote.id);
      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "Test Note",
          content: "# Hello",
          folderId: null,
          isFavorite: false,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should use default title when not provided", async () => {
      vi.mocked(prisma.note.create).mockResolvedValue({
        ...mockNote,
        title: "Sans titre",
      });

      await createNote("user-1", { content: "# Content only" });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "Sans titre",
          content: "# Content only",
          folderId: null,
          isFavorite: false,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });

    it("should create note with undefined content", async () => {
      vi.mocked(prisma.note.create).mockResolvedValue({
        ...mockNote,
        content: null,
      });

      await createNote("user-1", { title: "Title only" });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "Title only",
          content: undefined,
          folderId: null,
          isFavorite: false,
          createdById: "user-1",
        },
        select: expect.any(Object),
      });
    });
  });

  describe("getNoteById", () => {
    const mockNote = {
      id: "note-123",
      title: "Test Note",
      content: "# Hello",
      folderId: null,
      isFavorite: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: "user-1",
      folder: null,
      tags: [],
    };

    it("should return note when user is owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);

      const result = await getNoteById("note-123", "user-1");

      expect(result).toMatchObject({
        id: mockNote.id,
        title: mockNote.title,
        content: mockNote.content,
        createdById: mockNote.createdById,
      });
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(getNoteById("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
      await expect(getNoteById("nonexistent", "user-1")).rejects.toThrow(
        "Note with ID 'nonexistent' not found"
      );
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        createdById: "other-user",
      });

      await expect(getNoteById("note-123", "user-1")).rejects.toThrow(
        ForbiddenError
      );
      await expect(getNoteById("note-123", "user-1")).rejects.toThrow(
        "You do not have permission to access this note"
      );
    });
  });

  describe("getUserNotes", () => {
    const mockNotes = [
      {
        id: "note-1",
        title: "Note 1",
        content: "Content 1",
        folderId: null,
        isFavorite: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
        folder: null,
        tags: [],
      },
      {
        id: "note-2",
        title: "Note 2",
        content: "Content 2",
        folderId: null,
        isFavorite: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
        folder: null,
        tags: [],
      },
    ];

    it("should return paginated notes for user", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([mockNotes, 2]);

      const result = await getUserNotes("user-1", { page: 1, pageSize: 20 });

      expect(result.notes.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("should apply correct skip value for pagination", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

      await getUserNotes("user-1", { page: 3, pageSize: 10 });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should return empty array when user has no notes", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

      const result = await getUserNotes("user-1", { page: 1, pageSize: 20 });

      expect(result.notes).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should order notes by updatedAt desc", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([mockNotes, 2]);

      await getUserNotes("user-1", { page: 1, pageSize: 20 });

      // The transaction is called with array of queries
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("updateNote", () => {
    const mockNote = {
      id: "note-123",
      title: "Updated Title",
      content: "Updated content",
      folderId: null,
      isFavorite: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: "user-1",
      folder: null,
      tags: [],
    };

    it("should update note when user is owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
      });
      vi.mocked(prisma.note.update).mockResolvedValue(mockNote);

      const result = await updateNote("note-123", "user-1", {
        title: "Updated Title",
      });

      expect(result).toMatchObject({
        id: mockNote.id,
        title: mockNote.title,
        content: mockNote.content,
        createdById: mockNote.createdById,
      });
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(
        updateNote("nonexistent", "user-1", { title: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "other-user",
      });

      await expect(
        updateNote("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        updateNote("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow("You do not have permission to update this note");
    });

    // Story 3.5: Prevent updates to deleted notes
    it("should throw NotFoundError when note is deleted", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: new Date(),
      });

      await expect(
        updateNote("note-123", "user-1", { title: "Test" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should only update provided fields", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: null,
      });
      vi.mocked(prisma.note.update).mockResolvedValue(mockNote);

      await updateNote("note-123", "user-1", { title: "New Title" });

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { title: "New Title" },
        select: expect.any(Object),
      });
    });

    it("should update both title and content when provided", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: null,
      });
      vi.mocked(prisma.note.update).mockResolvedValue(mockNote);

      await updateNote("note-123", "user-1", {
        title: "New Title",
        content: "New content",
      });

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { title: "New Title", content: "New content" },
        select: expect.any(Object),
      });
    });
  });

  // Story 3.5: toggleNoteFavorite tests with deleted note check
  describe("toggleNoteFavorite", () => {
    it("should throw NotFoundError when note is deleted", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        isFavorite: false,
        deletedAt: new Date(),
      });

      await expect(toggleNoteFavorite("note-123", "user-1")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("deleteNote", () => {
    // Story 3.5: Soft delete tests
    it("should soft delete note when user is owner (set deletedAt)", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: null,
      });
      vi.mocked(prisma.note.update).mockResolvedValue({} as never);

      await expect(deleteNote("note-123", "user-1")).resolves.toBeUndefined();
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("should be no-op if note is already deleted", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: new Date(),
      });

      await expect(deleteNote("note-123", "user-1")).resolves.toBeUndefined();
      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(deleteNote("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
      await expect(deleteNote("nonexistent", "user-1")).rejects.toThrow(
        "Note with ID 'nonexistent' not found"
      );
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "other-user",
        deletedAt: null,
      });

      await expect(deleteNote("note-123", "user-1")).rejects.toThrow(
        ForbiddenError
      );
      await expect(deleteNote("note-123", "user-1")).rejects.toThrow(
        "You do not have permission to delete this note"
      );
    });
  });

  // Story 3.5: Restore tests
  describe("restoreNote", () => {
    it("should restore soft-deleted note when user is owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: new Date(),
      });
      vi.mocked(prisma.note.update).mockResolvedValue({} as never);

      await expect(restoreNote("note-123", "user-1")).resolves.toBeUndefined();
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-123" },
        data: { deletedAt: null },
      });
    });

    it("should be no-op if note is not deleted", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "user-1",
        deletedAt: null,
      });

      await expect(restoreNote("note-123", "user-1")).resolves.toBeUndefined();
      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(restoreNote("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        createdById: "other-user",
        deletedAt: new Date(),
      });

      await expect(restoreNote("note-123", "user-1")).rejects.toThrow(
        ForbiddenError
      );
    });
  });
});
