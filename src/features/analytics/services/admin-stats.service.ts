/**
 * Admin Statistics Service
 *
 * Provides aggregated statistics for the admin dashboard.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import type {
  AdminStats,
  DailyActivity,
  TopNote,
  TopContributor,
} from "../types/admin-stats";

/**
 * Get admin dashboard statistics
 *
 * @param workspaceId - Optional workspace filter
 * @returns Complete admin statistics
 */
export async function getAdminStats(
  workspaceId?: string | null
): Promise<AdminStats> {
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  // Build workspace filter condition
  const workspaceFilter = workspaceId ? { workspaceId } : {};

  // Execute all queries in parallel for performance
  const [
    totalNotes,
    notesThisWeek,
    activeUsers,
    dailyActivity,
    topNotes,
    topContributors,
  ] = await Promise.all([
    // 1. Total notes (non-deleted)
    prisma.note.count({
      where: {
        deletedAt: null,
        ...workspaceFilter,
      },
    }),

    // 2. Notes created this week
    prisma.note.count({
      where: {
        deletedAt: null,
        createdAt: { gte: weekAgo },
        ...workspaceFilter,
      },
    }),

    // 3. Active users (users who viewed a note in last 7 days)
    getActiveUsersCount(weekAgo, workspaceId),

    // 4. Daily activity (30 days)
    getDailyActivity(thirtyDaysAgo, workspaceId),

    // 5. Top 10 notes by view count
    getTopNotes(10, workspaceId),

    // 6. Top 5 contributors
    getTopContributors(5, workspaceId),
  ]);

  return {
    totalNotes,
    notesThisWeek,
    activeUsers,
    dailyActivity,
    topNotes,
    topContributors,
  };
}

/**
 * Count unique active users (users who viewed notes in the period)
 */
async function getActiveUsersCount(
  since: Date,
  workspaceId?: string | null
): Promise<number> {
  // If filtering by workspace, we need to join with notes
  if (workspaceId) {
    const result = await prisma.userNoteView.findMany({
      where: {
        viewedAt: { gte: since },
        note: { workspaceId },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    return result.length;
  }

  // Without workspace filter, simpler query
  const result = await prisma.userNoteView.findMany({
    where: {
      viewedAt: { gte: since },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return result.length;
}

/**
 * Get daily activity for the last N days
 *
 * Fetches notes created and modified in the period and aggregates by day.
 */
async function getDailyActivity(
  since: Date,
  workspaceId?: string | null
): Promise<DailyActivity[]> {
  const workspaceFilter = workspaceId ? { workspaceId } : {};

  // Fetch notes with their timestamps
  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      ...workspaceFilter,
    },
    select: {
      createdAt: true,
      updatedAt: true,
    },
  });

  // Build a map of dates for the last 30 days
  const activityMap = new Map<string, DailyActivity>();
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = startOfDay(subDays(now, i));
    const dateStr = format(date, "yyyy-MM-dd");
    activityMap.set(dateStr, { date: dateStr, created: 0, modified: 0 });
  }

  // Aggregate notes by day
  for (const note of notes) {
    // Count created notes
    if (note.createdAt >= since) {
      const dateStr = format(startOfDay(note.createdAt), "yyyy-MM-dd");
      const activity = activityMap.get(dateStr);
      if (activity) {
        activity.created += 1;
      }
    }

    // Count modified notes (only if modified after creation)
    if (
      note.updatedAt >= since &&
      note.updatedAt.getTime() !== note.createdAt.getTime()
    ) {
      const dateStr = format(startOfDay(note.updatedAt), "yyyy-MM-dd");
      const activity = activityMap.get(dateStr);
      if (activity) {
        activity.modified += 1;
      }
    }
  }

  // Convert to sorted array (oldest first for chart display)
  return Array.from(activityMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Get top N notes by view count
 */
async function getTopNotes(
  limit: number,
  workspaceId?: string | null
): Promise<TopNote[]> {
  const workspaceFilter = workspaceId ? { workspaceId } : {};

  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      viewCount: { gt: 0 },
      ...workspaceFilter,
    },
    orderBy: { viewCount: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      viewCount: true,
      workspace: {
        select: { name: true },
      },
    },
  });

  return notes.map((note) => ({
    id: note.id,
    title: note.title,
    viewCount: note.viewCount,
    workspaceName: note.workspace?.name ?? null,
  }));
}

/**
 * Get top N contributors by activity
 *
 * Combines notes created + notes last modified (unique contributions)
 */
async function getTopContributors(
  limit: number,
  workspaceId?: string | null
): Promise<TopContributor[]> {
  const workspaceFilter = workspaceId ? { workspaceId } : {};

  // Get notes created count per user
  const createdCounts = await prisma.note.groupBy({
    by: ["createdById"],
    where: {
      deletedAt: null,
      ...workspaceFilter,
    },
    _count: true,
  });

  // Get notes modified count per user (lastModifiedById)
  const modifiedCounts = await prisma.note.groupBy({
    by: ["lastModifiedById"],
    where: {
      deletedAt: null,
      lastModifiedById: { not: null },
      ...workspaceFilter,
    },
    _count: true,
  });

  // Merge counts by user
  const userStats = new Map<
    string,
    { created: number; modified: number; total: number }
  >();

  for (const item of createdCounts) {
    const userId = item.createdById;
    const existing = userStats.get(userId) || {
      created: 0,
      modified: 0,
      total: 0,
    };
    existing.created = item._count;
    existing.total += item._count;
    userStats.set(userId, existing);
  }

  for (const item of modifiedCounts) {
    const userId = item.lastModifiedById;
    if (!userId) continue;
    const existing = userStats.get(userId) || {
      created: 0,
      modified: 0,
      total: 0,
    };
    existing.modified = item._count;
    existing.total += item._count;
    userStats.set(userId, existing);
  }

  // Sort by total activity and take top N
  const sortedUserIds = Array.from(userStats.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([userId]) => userId);

  // Fetch user details
  const users = await prisma.user.findMany({
    where: { id: { in: sortedUserIds } },
    select: {
      id: true,
      name: true,
      image: true,
    },
  });

  // Create Map for O(1) user lookup instead of O(n) Array.find()
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Map to TopContributor format, preserving sort order
  return sortedUserIds.map((userId) => {
    const user = userMap.get(userId);
    const stats = userStats.get(userId)!;
    return {
      id: userId,
      name: user?.name ?? null,
      image: user?.image ?? null,
      notesCreated: stats.created,
      notesModified: stats.modified,
    };
  });
}
