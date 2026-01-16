/**
 * Note view tracking service
 * @see Story 10.1: Tracking des Vues et Métadonnées
 *
 * Handles tracking note views with deduplication logic:
 * - Only counts 1 view per user per hour
 * - Updates viewCount and lastViewedAt atomically
 * - Uses UserNoteView for detailed tracking (from Story 6.4)
 */

import { prisma } from "@/lib/prisma";
import type { ViewTrackingResult } from "../types";

/** Deduplication window in milliseconds (1 hour) */
const DEDUP_WINDOW_MS = 60 * 60 * 1000;

/**
 * Track a note view with deduplication
 *
 * Uses a 1-hour deduplication window per user/note combination.
 * If the same user views the same note within 1 hour, the view is
 * not counted but the viewedAt timestamp is still updated.
 *
 * **Note on race conditions:** There's a small window between checking
 * the existing view and executing the transaction where concurrent requests
 * could both pass the dedup check. This is acceptable as:
 * 1. The window is very small (milliseconds)
 * 2. Impact is minimal (potential over-count of 1 view)
 * 3. The upsert ensures UserNoteView stays consistent
 *
 * @param noteId - The ID of the note being viewed
 * @param userId - The ID of the user viewing the note
 * @returns ViewTrackingResult with counted flag and current viewCount
 * @throws Error if note doesn't exist
 *
 * @example
 * const result = await trackNoteView('note-123', 'user-456');
 * if (result.counted) {
 *   console.log(`View counted! Total: ${result.viewCount}`);
 * }
 */
export async function trackNoteView(
  noteId: string,
  userId: string
): Promise<ViewTrackingResult> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - DEDUP_WINDOW_MS);

  // Check if user has viewed this note within the last hour
  const existingView = await prisma.userNoteView.findUnique({
    where: { userId_noteId: { userId, noteId } },
    select: { viewedAt: true },
  });

  // If viewed within deduplication window, just update viewedAt without incrementing
  if (existingView && existingView.viewedAt > oneHourAgo) {
    await prisma.userNoteView.update({
      where: { userId_noteId: { userId, noteId } },
      data: { viewedAt: now },
    });

    // Get current viewCount without incrementing
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { viewCount: true },
    });

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    return {
      counted: false,
      viewCount: note.viewCount,
    };
  }

  // Verify note exists before attempting transaction (provides clearer error message)
  const noteExists = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true },
  });

  if (!noteExists) {
    throw new Error(`Note not found: ${noteId}`);
  }

  // New view (or first view after dedup window): increment viewCount atomically
  const [updatedNote] = await prisma.$transaction([
    prisma.note.update({
      where: { id: noteId },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: now,
      },
      select: { viewCount: true },
    }),
    prisma.userNoteView.upsert({
      where: { userId_noteId: { userId, noteId } },
      update: { viewedAt: now },
      create: { userId, noteId, viewedAt: now },
    }),
  ]);

  return {
    counted: true,
    viewCount: updatedNote.viewCount,
  };
}

/**
 * Get the current view count for a note
 *
 * This is a simple read operation that returns the cached viewCount
 * from the Note table without performing any tracking or deduplication.
 *
 * @param noteId - The ID of the note to get view count for
 * @returns The current view count (number), or null if note doesn't exist
 *
 * @example
 * const count = await getNoteViewCount('note-123');
 * if (count !== null) {
 *   console.log(`This note has ${count} views`);
 * }
 */
export async function getNoteViewCount(noteId: string): Promise<number | null> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { viewCount: true },
  });

  return note?.viewCount ?? null;
}
