/**
 * @vitest-environment node
 * Tests for admin-stats.service.ts
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminStats } from "./admin-stats.service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    userNoteView: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("admin-stats.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T12:00:00.000Z"));
  });

  describe("getAdminStats", () => {
    const setupDefaultMocks = () => {
      // Total notes (first call)
      mockPrisma.note.count.mockResolvedValueOnce(100);
      // Notes this week (second call)
      mockPrisma.note.count.mockResolvedValueOnce(15);

      // Active users
      mockPrisma.userNoteView.findMany.mockResolvedValueOnce([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ] as unknown[]);

      // Daily activity - notes with timestamps (first findMany call)
      mockPrisma.note.findMany.mockResolvedValueOnce([
        {
          createdAt: new Date("2026-01-15T10:00:00Z"),
          updatedAt: new Date("2026-01-15T14:00:00Z"),
        },
        {
          createdAt: new Date("2026-01-16T09:00:00Z"),
          updatedAt: new Date("2026-01-16T09:00:00Z"),
        },
        {
          createdAt: new Date("2026-01-16T11:00:00Z"),
          updatedAt: new Date("2026-01-17T08:00:00Z"),
        },
      ] as unknown[]);

      // Top notes (second findMany call)
      mockPrisma.note.findMany.mockResolvedValueOnce([
        {
          id: "note-1",
          title: "Popular Note",
          viewCount: 150,
          workspace: { name: "Team" },
        },
        {
          id: "note-2",
          title: "Second Note",
          viewCount: 100,
          workspace: null,
        },
      ] as unknown[]);

      // Top contributors - created (first groupBy call)
      mockPrisma.note.groupBy.mockResolvedValueOnce([
        { createdById: "user-1", _count: 20 },
        { createdById: "user-2", _count: 15 },
      ] as unknown[]);

      // Top contributors - modified (second groupBy call)
      mockPrisma.note.groupBy.mockResolvedValueOnce([
        { lastModifiedById: "user-1", _count: 30 },
        { lastModifiedById: "user-3", _count: 10 },
      ] as unknown[]);

      // User details
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: "user-1", name: "Alice", image: "https://example.com/alice.jpg" },
        { id: "user-2", name: "Bob", image: null },
        {
          id: "user-3",
          name: "Charlie",
          image: "https://example.com/charlie.jpg",
        },
      ] as unknown[]);
    };

    it("should return complete admin statistics", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      expect(result.totalNotes).toBe(100);
      expect(result.notesThisWeek).toBe(15);
      expect(result.activeUsers).toBe(3);
      expect(result.dailyActivity).toHaveLength(30);
      expect(result.topNotes).toHaveLength(2);
      expect(result.topContributors.length).toBeGreaterThan(0);
    });

    it("should count total notes excluding deleted ones", async () => {
      setupDefaultMocks();

      await getAdminStats();

      expect(mockPrisma.note.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it("should count notes created in last 7 days", async () => {
      setupDefaultMocks();

      await getAdminStats();

      const secondCall = mockPrisma.note.count.mock.calls[1][0];
      expect(secondCall.where).toMatchObject({
        deletedAt: null,
        createdAt: expect.objectContaining({ gte: expect.any(Date) }),
      });
    });

    it("should count unique active users from last 7 days", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      expect(result.activeUsers).toBe(3);
      expect(mockPrisma.userNoteView.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            viewedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          distinct: ["userId"],
        })
      );
    });

    it("should return 30 days of daily activity data", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      expect(result.dailyActivity).toHaveLength(30);
      // Should be sorted oldest first (from 29 days ago to today)
      // System time is 2026-01-17, so 29 days ago is 2025-12-19
      expect(result.dailyActivity[0].date).toBe("2025-12-19");
      expect(result.dailyActivity[29].date).toBe("2026-01-17");
    });

    it("should aggregate daily activity correctly", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      // Check that the aggregation worked
      const jan15 = result.dailyActivity.find((d) => d.date === "2026-01-15");
      const jan16 = result.dailyActivity.find((d) => d.date === "2026-01-16");

      // Jan 15: 1 created, 1 modified (different times)
      expect(jan15?.created).toBe(1);
      expect(jan15?.modified).toBe(1);

      // Jan 16: 2 created, 0 modified (one has same create/update time)
      expect(jan16?.created).toBe(2);
      expect(jan16?.modified).toBe(0);
    });

    it("should return top 10 notes by view count", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      expect(result.topNotes[0]).toEqual({
        id: "note-1",
        title: "Popular Note",
        viewCount: 150,
        workspaceName: "Team",
      });
      expect(result.topNotes[1]).toEqual({
        id: "note-2",
        title: "Second Note",
        viewCount: 100,
        workspaceName: null,
      });
    });

    it("should return top contributors sorted by total activity", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      // User-1 has highest total (20 created + 30 modified = 50)
      expect(result.topContributors[0].id).toBe("user-1");
      expect(result.topContributors[0].notesCreated).toBe(20);
      expect(result.topContributors[0].notesModified).toBe(30);
    });

    it("should filter by workspaceId when provided", async () => {
      setupDefaultMocks();
      const workspaceId = "workspace-123";

      await getAdminStats(workspaceId);

      // Check that note.count was called with workspace filter
      expect(mockPrisma.note.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workspaceId }),
        })
      );
    });

    it("should handle empty results gracefully", async () => {
      // Empty mocks
      mockPrisma.note.count.mockResolvedValue(0);
      mockPrisma.userNoteView.findMany.mockResolvedValue([]);
      mockPrisma.note.groupBy.mockResolvedValue([]);
      mockPrisma.note.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getAdminStats();

      expect(result.totalNotes).toBe(0);
      expect(result.notesThisWeek).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.dailyActivity).toHaveLength(30);
      expect(result.topNotes).toHaveLength(0);
      expect(result.topContributors).toHaveLength(0);
    });

    it("should only include notes with viewCount > 0 in top notes", async () => {
      setupDefaultMocks();

      await getAdminStats();

      // Find the call for top notes (second findMany call)
      const calls = mockPrisma.note.findMany.mock.calls;
      const topNotesCall = calls.find(
        (call) => call[0]?.orderBy?.viewCount === "desc"
      );

      expect(topNotesCall?.[0]?.where).toMatchObject({
        viewCount: { gt: 0 },
      });
    });

    it("should use workspace filter for active users when provided", async () => {
      setupDefaultMocks();
      const workspaceId = "workspace-123";

      await getAdminStats(workspaceId);

      expect(mockPrisma.userNoteView.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            note: { workspaceId },
          }),
        })
      );
    });

    it("should include user details for top contributors", async () => {
      setupDefaultMocks();

      const result = await getAdminStats();

      expect(result.topContributors[0]).toMatchObject({
        id: "user-1",
        name: "Alice",
        image: "https://example.com/alice.jpg",
      });
    });

    it("should handle contributors with only created notes", async () => {
      // Reset mocks
      mockPrisma.note.count.mockResolvedValue(10);
      mockPrisma.userNoteView.findMany.mockResolvedValue([]);
      mockPrisma.note.findMany.mockResolvedValue([]);

      // User-2 only has created notes, no modifications
      mockPrisma.note.groupBy.mockResolvedValueOnce([
        { createdById: "user-2", _count: 10 },
      ] as unknown[]);
      mockPrisma.note.groupBy.mockResolvedValueOnce([]); // No modifications

      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-2", name: "Bob", image: null },
      ] as unknown[]);

      const result = await getAdminStats();

      expect(result.topContributors[0]).toMatchObject({
        id: "user-2",
        notesCreated: 10,
        notesModified: 0,
      });
    });
  });
});
