/**
 * Snapshot Service
 *
 * Handles automatic version creation (snapshots) for notes.
 * Implements deduplication to avoid creating duplicate versions.
 *
 * Snapshots are created:
 * - At intervals (every 5 minutes of active editing)
 * - When a note is closed or user navigates away
 * - When user explicitly requests (future feature)
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ForbiddenError } from "@/lib/api-error";
import { createVersion } from "./versions.service";
import type { SnapshotResult } from "../types";

/**
 * Create a snapshot of a note if content has changed since last version
 *
 * Implements deduplication by comparing title and content with the latest version.
 * If they're identical, no new version is created.
 *
 * @param noteId - ID of the note to snapshot
 * @param userId - ID of the user creating the snapshot
 * @returns Result indicating if snapshot was created and why
 */
export async function createSnapshotIfChanged(
  noteId: string,
  userId: string
): Promise<SnapshotResult> {
  try {
    // 1. Fetch the current note state
    const note = await prisma.note.findUnique({
      where: { id: noteId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        ydoc: true,
      },
    });

    if (!note) {
      logger.warn({ noteId, userId }, "Snapshot skipped: note not found");
      return { created: false, reason: "note_not_found" };
    }

    // 2. Fetch the latest version to compare
    const latestVersion = await prisma.noteVersion.findFirst({
      where: { noteId },
      orderBy: { version: "desc" },
      select: {
        version: true,
        title: true,
        content: true,
      },
    });

    // 3. Compare: if title AND content are identical, skip
    if (latestVersion) {
      const titleUnchanged = latestVersion.title === note.title;
      const contentUnchanged = latestVersion.content === note.content;

      if (titleUnchanged && contentUnchanged) {
        logger.debug(
          { noteId, userId, latestVersion: latestVersion.version },
          "Snapshot skipped: no changes since last version"
        );
        return { created: false, reason: "no_changes" };
      }
    }

    // 4. Create the new version
    const version = await createVersion(noteId, userId, {
      title: note.title,
      content: note.content,
      ydoc: note.ydoc,
    });

    logger.info(
      { noteId, userId, versionId: version.id, version: version.version },
      "Snapshot created"
    );

    return {
      created: true,
      versionId: version.id,
      version: version.version,
      reason: "created",
    };
  } catch (error) {
    // Distinguish permission errors from other errors
    if (error instanceof ForbiddenError) {
      logger.warn(
        { noteId, userId },
        "Snapshot forbidden: user lacks permission"
      );
      return { created: false, reason: "forbidden" };
    }

    logger.error(
      { error, noteId, userId },
      "Failed to create snapshot"
    );
    return { created: false, reason: "error" };
  }
}

/**
 * Create an interval snapshot
 *
 * Called by the client every 5 minutes during active editing.
 * Uses deduplication to avoid creating versions if content hasn't changed.
 *
 * @param noteId - ID of the note
 * @param userId - ID of the user
 * @returns Snapshot result
 */
export async function createIntervalSnapshot(
  noteId: string,
  userId: string
): Promise<SnapshotResult> {
  logger.debug({ noteId, userId }, "Interval snapshot requested");
  return createSnapshotIfChanged(noteId, userId);
}

/**
 * Create a close snapshot
 *
 * Called when:
 * - User closes the note
 * - User navigates away (visibilitychange to 'hidden')
 * - Browser/tab is closed (beforeunload via sendBeacon)
 * - Hocuspocus connection closes
 *
 * Uses deduplication to avoid duplicate versions.
 *
 * @param noteId - ID of the note
 * @param userId - ID of the user
 * @returns Snapshot result
 */
export async function createCloseSnapshot(
  noteId: string,
  userId: string
): Promise<SnapshotResult> {
  logger.debug({ noteId, userId }, "Close snapshot requested");
  return createSnapshotIfChanged(noteId, userId);
}

/**
 * Create a forced snapshot
 *
 * Creates a version regardless of whether content has changed.
 * Used for explicit user-requested snapshots (future feature).
 *
 * @param noteId - ID of the note
 * @param userId - ID of the user
 * @returns Snapshot result
 */
export async function createForcedSnapshot(
  noteId: string,
  userId: string
): Promise<SnapshotResult> {
  try {
    // Fetch the current note state
    const note = await prisma.note.findUnique({
      where: { id: noteId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        ydoc: true,
      },
    });

    if (!note) {
      logger.warn({ noteId, userId }, "Forced snapshot failed: note not found");
      return { created: false, reason: "note_not_found" };
    }

    // Create the version without checking for changes
    const version = await createVersion(noteId, userId, {
      title: note.title,
      content: note.content,
      ydoc: note.ydoc,
    });

    logger.info(
      { noteId, userId, versionId: version.id, version: version.version },
      "Forced snapshot created"
    );

    return {
      created: true,
      versionId: version.id,
      version: version.version,
      reason: "created",
    };
  } catch (error) {
    // Distinguish permission errors from other errors
    if (error instanceof ForbiddenError) {
      logger.warn(
        { noteId, userId },
        "Forced snapshot forbidden: user lacks permission"
      );
      return { created: false, reason: "forbidden" };
    }

    logger.error({ error, noteId, userId }, "Failed to create forced snapshot");
    return { created: false, reason: "error" };
  }
}
