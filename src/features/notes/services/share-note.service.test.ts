/**
 * Tests for Share Note Service
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    folder: {
      findFirst: vi.fn(),
    },
    noteTag: {
      createMany: vi.fn(),
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
  canEditNotes: vi.fn(),
}));

import { shareNoteToWorkspace } from "./share-note.service";
import { prisma } from "@/lib/prisma";
import { canEditNotes } from "@/features/workspaces/services/permissions.service";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";

describe("Share Note Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shareNoteToWorkspace", () => {
    const mockSourceNote = {
      id: "note-1",
      title: "Ma note personnelle",
      content: "Contenu de test",
      workspaceId: null, // Personal workspace
      folderId: null,
      createdById: "user-1",
      isFavorite: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      tags: [
        { tagId: "tag-1", tag: { id: "tag-1", name: "important", color: "#ff0000" } },
        { tagId: "tag-2", tag: { id: "tag-2", name: "todo", color: "#00ff00" } },
      ],
    };

    const mockTeamWorkspace = {
      id: "ws-team",
      name: "Équipe Dev",
      isPersonal: false,
    };

    const mockPersonalWorkspace = {
      id: "ws-personal",
      name: "Mon espace",
      isPersonal: true,
    };

    const mockSharedNote = {
      id: "note-shared",
      title: "Ma note personnelle",
      content: "Contenu de test",
      workspaceId: "ws-team",
      folderId: null,
      createdById: "user-1",
      isFavorite: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      tags: [
        { tagId: "tag-1", tag: { id: "tag-1", name: "important", color: "#ff0000" } },
        { tagId: "tag-2", tag: { id: "tag-2", name: "todo", color: "#00ff00" } },
      ],
    };

    it("should successfully share a personal note to a team workspace", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(true);

      // Mock transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txMock = {
          note: {
            create: vi.fn().mockResolvedValue({ id: "note-shared" }),
            findUnique: vi.fn().mockResolvedValue(mockSharedNote),
          },
          noteTag: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(txMock);
      });

      const result = await shareNoteToWorkspace(
        "note-1",
        "user-1",
        "ws-team"
      );

      expect(result.originalNote).toBeDefined();
      expect(result.sharedNote).toBeDefined();
      expect(result.sharedNote.workspaceId).toBe("ws-team");
    });

    it("should copy tags when sharing a note", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(true);

      let createdTagsData: any = null;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txMock = {
          note: {
            create: vi.fn().mockResolvedValue({ id: "note-shared" }),
            findUnique: vi.fn().mockResolvedValue(mockSharedNote),
          },
          noteTag: {
            createMany: vi.fn().mockImplementation((data) => {
              createdTagsData = data;
              return { count: 2 };
            }),
          },
        };
        return callback(txMock);
      });

      await shareNoteToWorkspace("note-1", "user-1", "ws-team");

      expect(createdTagsData).toBeDefined();
      expect(createdTagsData.data).toHaveLength(2);
      expect(createdTagsData.data[0].tagId).toBe("tag-1");
      expect(createdTagsData.data[1].tagId).toBe("tag-2");
    });

    it("should throw NotFoundError if source note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      await expect(
        shareNoteToWorkspace("note-nonexistent", "user-1", "ws-team")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if note is not in personal workspace", async () => {
      const noteInTeamWorkspace = {
        ...mockSourceNote,
        workspaceId: "ws-other", // Not personal (workspaceId is not null)
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValue(noteInTeamWorkspace as any);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow(ForbiddenError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow("Only notes from personal workspace can be shared");
    });

    it("should throw ForbiddenError if target workspace is personal", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockPersonalWorkspace as any);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-personal")
      ).rejects.toThrow(ForbiddenError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-personal")
      ).rejects.toThrow("Cannot share to a personal workspace");
    });

    it("should throw ForbiddenError if user does not have write permissions", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(false);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow(ForbiddenError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow("You do not have write permissions in this workspace");
    });

    it("should throw NotFoundError if target workspace does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-nonexistent")
      ).rejects.toThrow(NotFoundError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-nonexistent")
      ).rejects.toThrow("Target workspace not found");
    });

    it("should throw ForbiddenError if user does not own the source note", async () => {
      const noteOwnedByOther = {
        ...mockSourceNote,
        createdById: "user-other",
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValue(noteOwnedByOther as any);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow(ForbiddenError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team")
      ).rejects.toThrow("You can only share your own notes");
    });

    it("should share note to a specific folder in the workspace", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(true);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue({ id: "folder-1" } as any);

      let createdNoteData: any = null;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txMock = {
          note: {
            create: vi.fn().mockImplementation((data) => {
              createdNoteData = data;
              return { id: "note-shared" };
            }),
            findUnique: vi.fn().mockResolvedValue({
              ...mockSharedNote,
              folderId: "folder-1",
            }),
          },
          noteTag: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(txMock);
      });

      const result = await shareNoteToWorkspace(
        "note-1",
        "user-1",
        "ws-team",
        "folder-1"
      );

      expect(createdNoteData.data.folderId).toBe("folder-1");
    });

    it("should throw NotFoundError if target folder does not exist in workspace", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockSourceNote as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(true);
      vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team", "folder-nonexistent")
      ).rejects.toThrow(NotFoundError);

      await expect(
        shareNoteToWorkspace("note-1", "user-1", "ws-team", "folder-nonexistent")
      ).rejects.toThrow("Target folder not found in workspace");
    });

    it("should successfully share a note with no tags", async () => {
      const noteWithNoTags = {
        ...mockSourceNote,
        tags: [], // Empty tags array
      };

      const sharedNoteWithNoTags = {
        ...mockSharedNote,
        tags: [],
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValue(noteWithNoTags as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockTeamWorkspace as any);
      vi.mocked(canEditNotes).mockResolvedValue(true);

      let tagCreateManyCalled = false;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txMock = {
          note: {
            create: vi.fn().mockResolvedValue({ id: "note-shared" }),
            findUnique: vi.fn().mockResolvedValue(sharedNoteWithNoTags),
          },
          noteTag: {
            createMany: vi.fn().mockImplementation(() => {
              tagCreateManyCalled = true;
              return { count: 0 };
            }),
          },
        };
        return callback(txMock);
      });

      const result = await shareNoteToWorkspace("note-1", "user-1", "ws-team");

      expect(result.sharedNote).toBeDefined();
      expect(result.sharedNote.tags).toEqual([]);
      // noteTag.createMany should NOT be called when there are no tags
      expect(tagCreateManyCalled).toBe(false);
    });
  });
});
