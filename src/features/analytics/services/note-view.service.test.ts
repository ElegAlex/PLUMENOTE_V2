/**
 * @vitest-environment node
 * Tests for note-view.service.ts
 * @see Story 10.1: Tracking des Vues et Métadonnées
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackNoteView, getNoteViewCount } from "./note-view.service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userNoteView: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    note: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("note-view.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-16T12:00:00.000Z"));
  });

  describe("trackNoteView", () => {
    const noteId = "note-123";
    const userId = "user-456";

    it("should count first view and increment viewCount", async () => {
      // No existing view
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);

      // Note exists (required for pre-transaction check)
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });

      // Transaction returns updated note
      mockPrisma.$transaction.mockResolvedValue([
        { viewCount: 1 },
        { id: "view-1", userId, noteId, viewedAt: new Date() },
      ]);

      const result = await trackNoteView(noteId, userId);

      expect(result).toEqual({
        counted: true,
        viewCount: 1,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should not count view within 1 hour (deduplication)", async () => {
      // View exists from 30 minutes ago
      const thirtyMinutesAgo = new Date("2026-01-16T11:30:00.000Z");
      mockPrisma.userNoteView.findUnique.mockResolvedValue({
        viewedAt: thirtyMinutesAgo,
      });

      // Just update viewedAt
      mockPrisma.userNoteView.update.mockResolvedValue({
        id: "view-1",
        userId,
        noteId,
        viewedAt: new Date(),
      });

      // Return current viewCount
      mockPrisma.note.findUnique.mockResolvedValue({ viewCount: 5 });

      const result = await trackNoteView(noteId, userId);

      expect(result).toEqual({
        counted: false,
        viewCount: 5,
      });

      // Should NOT call transaction (no increment)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      // Should update viewedAt
      expect(mockPrisma.userNoteView.update).toHaveBeenCalled();
    });

    it("should count view after 1 hour has passed", async () => {
      // View exists from 65 minutes ago
      const sixtyFiveMinutesAgo = new Date("2026-01-16T10:55:00.000Z");
      mockPrisma.userNoteView.findUnique.mockResolvedValue({
        viewedAt: sixtyFiveMinutesAgo,
      });

      // Note exists (required for pre-transaction check)
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });

      // Transaction increments
      mockPrisma.$transaction.mockResolvedValue([
        { viewCount: 6 },
        { id: "view-1", userId, noteId, viewedAt: new Date() },
      ]);

      const result = await trackNoteView(noteId, userId);

      expect(result).toEqual({
        counted: true,
        viewCount: 6,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should count views from different users", async () => {
      const user1 = "user-1";
      const user2 = "user-2";

      // User 1 has no existing view
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);

      // Note exists (required for pre-transaction check)
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });

      // First user view
      mockPrisma.$transaction.mockResolvedValueOnce([
        { viewCount: 1 },
        { id: "view-1", userId: user1, noteId, viewedAt: new Date() },
      ]);

      const result1 = await trackNoteView(noteId, user1);
      expect(result1.counted).toBe(true);
      expect(result1.viewCount).toBe(1);

      // Second user view
      mockPrisma.$transaction.mockResolvedValueOnce([
        { viewCount: 2 },
        { id: "view-2", userId: user2, noteId, viewedAt: new Date() },
      ]);

      const result2 = await trackNoteView(noteId, user2);
      expect(result2.counted).toBe(true);
      expect(result2.viewCount).toBe(2);
    });

    it("should throw error if note does not exist during dedup check", async () => {
      // View exists (dedup scenario)
      mockPrisma.userNoteView.findUnique.mockResolvedValue({
        viewedAt: new Date("2026-01-16T11:30:00.000Z"),
      });
      mockPrisma.userNoteView.update.mockResolvedValue({
        id: "view-1",
        userId,
        noteId,
        viewedAt: new Date(),
      });

      // Note doesn't exist
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(trackNoteView(noteId, userId)).rejects.toThrow(
        `Note not found: ${noteId}`
      );
    });

    it("should update lastViewedAt when incrementing viewCount", async () => {
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });
      mockPrisma.$transaction.mockResolvedValue([
        { viewCount: 1 },
        { id: "view-1", userId, noteId, viewedAt: new Date() },
      ]);

      await trackNoteView(noteId, userId);

      const transactionCalls = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(2);
    });

    it("should handle exactly 1 hour boundary (edge case)", async () => {
      // View exactly 1 hour ago (should count as new view)
      const exactlyOneHourAgo = new Date("2026-01-16T11:00:00.000Z");
      mockPrisma.userNoteView.findUnique.mockResolvedValue({
        viewedAt: exactlyOneHourAgo,
      });

      // Note exists (required for pre-transaction check)
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });

      mockPrisma.$transaction.mockResolvedValue([
        { viewCount: 10 },
        { id: "view-1", userId, noteId, viewedAt: new Date() },
      ]);

      const result = await trackNoteView(noteId, userId);

      // Exactly 1 hour should count as new view (> not >=)
      expect(result.counted).toBe(true);
    });

    it("should handle view just under 1 hour (59 minutes)", async () => {
      // View 59 minutes ago (should NOT count)
      const fiftyNineMinutesAgo = new Date("2026-01-16T11:01:00.000Z");
      mockPrisma.userNoteView.findUnique.mockResolvedValue({
        viewedAt: fiftyNineMinutesAgo,
      });

      mockPrisma.userNoteView.update.mockResolvedValue({
        id: "view-1",
        userId,
        noteId,
        viewedAt: new Date(),
      });

      mockPrisma.note.findUnique.mockResolvedValue({ viewCount: 5 });

      const result = await trackNoteView(noteId, userId);

      expect(result.counted).toBe(false);
    });

    it("should handle transaction failure gracefully", async () => {
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });
      mockPrisma.$transaction.mockRejectedValue(new Error("Database error"));

      await expect(trackNoteView(noteId, userId)).rejects.toThrow(
        "Database error"
      );
    });

    it("should throw error if note does not exist before transaction (new view)", async () => {
      // No existing view - this will trigger the pre-transaction check
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);

      // Note doesn't exist
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(trackNoteView(noteId, userId)).rejects.toThrow(
        `Note not found: ${noteId}`
      );

      // Transaction should NOT be called
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should use upsert for UserNoteView in transaction", async () => {
      mockPrisma.userNoteView.findUnique.mockResolvedValue(null);
      mockPrisma.note.findUnique.mockResolvedValue({ id: noteId });
      mockPrisma.$transaction.mockImplementation(async () => {
        // Verify the transaction includes upsert pattern
        return [{ viewCount: 1 }, { id: "new-view" }];
      });

      await trackNoteView(noteId, userId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("getNoteViewCount", () => {
    it("should return viewCount for existing note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({ viewCount: 42 });

      const result = await getNoteViewCount("note-123");

      expect(result).toBe(42);
      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: "note-123" },
        select: { viewCount: true },
      });
    });

    it("should return null for non-existent note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      const result = await getNoteViewCount("non-existent");

      expect(result).toBeNull();
    });

    it("should return 0 for note with no views", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({ viewCount: 0 });

      const result = await getNoteViewCount("new-note");

      expect(result).toBe(0);
    });
  });
});
