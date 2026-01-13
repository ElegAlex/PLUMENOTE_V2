/**
 * Note Links Utility
 *
 * Parses note content to extract internal link references [[noteId|title]].
 * Updates NoteLink table to maintain backlinks for Story 6.7.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 * @see Story 6.7: Backlinks
 */

import { prisma } from "@/lib/prisma";

/**
 * Internal link data extracted from content
 */
export interface ExtractedLink {
  noteId: string;
  title: string;
}

/**
 * Extract internal links from HTML content
 *
 * Looks for spans with data-internal-link and data-note-id attributes.
 * Format: <span data-internal-link data-note-id="xxx" data-title="yyy">[[title]]</span>
 */
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  if (!html) return [];

  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  // Match internal link spans: <span data-internal-link data-note-id="xxx" data-title="yyy">
  const regex = /<span[^>]*data-internal-link[^>]*data-note-id="([^"]+)"[^>]*data-title="([^"]*)"[^>]*>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const noteId = match[1];
    const title = match[2];

    // Avoid duplicates
    if (noteId && !seen.has(noteId)) {
      seen.add(noteId);
      links.push({ noteId, title: title || "" });
    }
  }

  // Also check for reverse attribute order
  const regex2 = /<span[^>]*data-note-id="([^"]+)"[^>]*data-internal-link[^>]*data-title="([^"]*)"[^>]*>/gi;
  while ((match = regex2.exec(html)) !== null) {
    const noteId = match[1];
    const title = match[2];

    if (noteId && !seen.has(noteId)) {
      seen.add(noteId);
      links.push({ noteId, title: title || "" });
    }
  }

  return links;
}

/**
 * Update note links in the database
 *
 * This should be called when a note is saved to sync the NoteLink table.
 * It performs a diff to only create/delete changed links.
 */
export async function syncNoteLinks(
  sourceNoteId: string,
  newContent: string
): Promise<void> {
  // Extract links from new content
  const newLinks = extractLinksFromHtml(newContent);
  const newLinkIds = new Set(newLinks.map((l) => l.noteId));

  // Get existing links from database
  const existingLinks = await prisma.noteLink.findMany({
    where: { sourceNoteId },
    select: { targetNoteId: true },
  });
  const existingLinkIds = new Set(existingLinks.map((l) => l.targetNoteId));

  // Calculate diffs
  const toAdd = newLinks.filter((l) => !existingLinkIds.has(l.noteId));
  const toRemove = existingLinks.filter((l) => !newLinkIds.has(l.targetNoteId));

  // Perform updates in a transaction
  if (toAdd.length > 0 || toRemove.length > 0) {
    await prisma.$transaction([
      // Delete removed links
      prisma.noteLink.deleteMany({
        where: {
          sourceNoteId,
          targetNoteId: { in: toRemove.map((l) => l.targetNoteId) },
        },
      }),
      // Create new links
      ...toAdd.map((link) =>
        prisma.noteLink.create({
          data: {
            sourceNoteId,
            targetNoteId: link.noteId,
            linkTitle: link.title,
          },
        })
      ),
    ]);
  }
}

/**
 * Get backlinks for a note (notes that link TO this note)
 */
export async function getBacklinks(noteId: string): Promise<{
  id: string;
  title: string;
  linkTitle: string | null;
}[]> {
  const links = await prisma.noteLink.findMany({
    where: { targetNoteId: noteId },
    include: {
      sourceNote: {
        select: {
          id: true,
          title: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Filter out deleted notes and map to response format
  return links
    .filter((l) => l.sourceNote.deletedAt === null)
    .map((l) => ({
      id: l.sourceNote.id,
      title: l.sourceNote.title,
      linkTitle: l.linkTitle,
    }));
}

/**
 * Get outgoing links from a note (notes that this note links TO)
 */
export async function getOutgoingLinks(noteId: string): Promise<{
  id: string;
  title: string;
  linkTitle: string | null;
}[]> {
  const links = await prisma.noteLink.findMany({
    where: { sourceNoteId: noteId },
    include: {
      targetNote: {
        select: {
          id: true,
          title: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Filter out deleted notes and map to response format
  return links
    .filter((l) => l.targetNote.deletedAt === null)
    .map((l) => ({
      id: l.targetNote.id,
      title: l.targetNote.title,
      linkTitle: l.linkTitle,
    }));
}
