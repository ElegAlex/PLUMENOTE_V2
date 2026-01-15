/**
 * Unit tests for snapshot service
 *
 * Tests automatic version creation with deduplication logic.
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
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./versions.service", () => ({
  createVersion: vi.fn(),
}));

import {
  createSnapshotIfChanged,
  createIntervalSnapshot,
  createCloseSnapshot,
  createForcedSnapshot,
} from "./snapshot.service";
import { prisma } from "@/lib/prisma";
import { createVersion } from "./versions.service";

describe("snapshot.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNote = {
    id: "note-123",
    title: "Current Title",
    content: "# Current Content",
    ydoc: Buffer.from([0x01, 0x02]),
  };

  const mockVersion = {
    id: "version-1",
    version: 1,
    title: "Current Title",
    content: "# Current Content",
    ydoc: null,
    createdAt: new Date(),
    noteId: "note-123",
    createdById: "user-1",
  };

  describe("createSnapshotIfChanged", () => {
    it("should skip snapshot when note is not found", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(false);
      expect(result.reason).toBe("note_not_found");
      expect(createVersion).not.toHaveBeenCalled();
    });

    it("should create snapshot when no previous versions exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(createVersion).mockResolvedValue(mockVersion);

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(result.reason).toBe("created");
      expect(result.versionId).toBe("version-1");
      expect(createVersion).toHaveBeenCalledWith("note-123", "user-1", {
        title: mockNote.title,
        content: mockNote.content,
        ydoc: mockNote.ydoc,
      });
    });

    it("should create snapshot when title has changed", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        title: "New Title",
      });
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue({
        version: 1,
        title: "Old Title",
        content: "# Current Content",
      });
      vi.mocked(createVersion).mockResolvedValue({
        ...mockVersion,
        version: 2,
        title: "New Title",
      });

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(result.reason).toBe("created");
      expect(createVersion).toHaveBeenCalled();
    });

    it("should create snapshot when content has changed", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue({
        ...mockNote,
        content: "# New Content",
      });
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue({
        version: 1,
        title: "Current Title",
        content: "# Old Content",
      });
      vi.mocked(createVersion).mockResolvedValue({
        ...mockVersion,
        version: 2,
        content: "# New Content",
      });

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(result.reason).toBe("created");
      expect(createVersion).toHaveBeenCalled();
    });

    it("should skip snapshot when title and content are unchanged", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue({
        version: 1,
        title: mockNote.title,
        content: mockNote.content,
      });

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(false);
      expect(result.reason).toBe("no_changes");
      expect(createVersion).not.toHaveBeenCalled();
    });

    it("should return error result when createVersion throws", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(createVersion).mockRejectedValue(new Error("DB error"));

      const result = await createSnapshotIfChanged("note-123", "user-1");

      expect(result.created).toBe(false);
      expect(result.reason).toBe("error");
    });
  });

  describe("createIntervalSnapshot", () => {
    it("should delegate to createSnapshotIfChanged", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(createVersion).mockResolvedValue(mockVersion);

      const result = await createIntervalSnapshot("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(createVersion).toHaveBeenCalled();
    });
  });

  describe("createCloseSnapshot", () => {
    it("should delegate to createSnapshotIfChanged", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
      vi.mocked(createVersion).mockResolvedValue(mockVersion);

      const result = await createCloseSnapshot("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(createVersion).toHaveBeenCalled();
    });
  });

  describe("createForcedSnapshot", () => {
    it("should create snapshot even when content is unchanged", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(createVersion).mockResolvedValue(mockVersion);

      const result = await createForcedSnapshot("note-123", "user-1");

      expect(result.created).toBe(true);
      expect(result.reason).toBe("created");
      expect(createVersion).toHaveBeenCalledWith("note-123", "user-1", {
        title: mockNote.title,
        content: mockNote.content,
        ydoc: mockNote.ydoc,
      });
    });

    it("should return not_found when note does not exist", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

      const result = await createForcedSnapshot("note-123", "user-1");

      expect(result.created).toBe(false);
      expect(result.reason).toBe("note_not_found");
    });

    it("should return error result when createVersion throws", async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
      vi.mocked(createVersion).mockRejectedValue(new Error("DB error"));

      const result = await createForcedSnapshot("note-123", "user-1");

      expect(result.created).toBe(false);
      expect(result.reason).toBe("error");
    });
  });
});
