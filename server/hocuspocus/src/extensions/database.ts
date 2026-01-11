/**
 * Hocuspocus Database Extension
 *
 * Persists Y.js documents to PostgreSQL using Prisma.
 * Documents are stored as binary data in the Note.ydoc field.
 * Text content is extracted for full-text search indexing.
 */

import { Database } from "@hocuspocus/extension-database";
import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import * as Y from "yjs";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import { extractNoteId } from "../types.js";

// Singleton Prisma client
let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 */
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return prisma;
}

/**
 * Database extension configuration
 */
export interface DatabaseExtensionConfig {
  logger: Logger;
}

/**
 * Block-level node types in ProseMirror that should be separated
 */
const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "bulletList",
  "orderedList",
  "horizontalRule",
]);

/**
 * Extract text content from Y.Doc state for full-text search indexing.
 * Converts the ProseMirror document structure to plain text.
 * Preserves document structure by separating block-level nodes.
 *
 * @param state - The Y.Doc binary state (Uint8Array)
 * @returns Plain text content extracted from the document, or null if empty/failed
 */
export function extractTextFromYDoc(state: Uint8Array): string | null {
  const ydoc = new Y.Doc();

  try {
    Y.applyUpdate(ydoc, state);

    // Tiptap uses 'default' as the fragment name for the main document
    const json = yDocToProsemirrorJSON(ydoc, "default");

    if (!json) {
      return null;
    }

    // Recursively extract text from ProseMirror JSON structure
    const output: string[] = [];

    const parseNode = (node: Record<string, unknown>): void => {
      const nodeType = node.type as string | undefined;

      // Extract text content
      if (typeof node.text === "string") {
        output.push(node.text);
      }

      // Process children
      if (Array.isArray(node.content)) {
        node.content.forEach((child) => parseNode(child as Record<string, unknown>));
      }

      // Add separator after block-level nodes for search proximity
      if (nodeType && BLOCK_NODES.has(nodeType)) {
        output.push("\n");
      }
    };

    parseNode(json as Record<string, unknown>);

    const content = output.join("").trim();

    // Return null for empty content (consistent with extraction failure)
    return content.length > 0 ? content : null;
  } finally {
    // Always destroy the Y.Doc to prevent memory leaks
    ydoc.destroy();
  }
}

/**
 * Create the database extension for Y.js document persistence
 */
export function createDatabaseExtension(config: DatabaseExtensionConfig): Database {
  const { logger } = config;
  const db = getPrismaClient();

  return new Database({
    /**
     * Fetch Y.js document from database
     * Called when a client connects to a document
     */
    fetch: async ({ documentName }) => {
      const noteId = extractNoteId(documentName);

      if (!noteId) {
        logger.warn({ documentName }, "Invalid document name format");
        return null;
      }

      try {
        const note = await db.note.findUnique({
          where: { id: noteId },
          select: { ydoc: true },
        });

        if (!note) {
          logger.debug({ noteId, documentName }, "Note not found in database");
          return null;
        }

        if (!note.ydoc) {
          logger.debug({ noteId, documentName }, "Note has no Y.js document yet");
          return null;
        }

        logger.debug(
          { noteId, documentName, size: note.ydoc.length },
          "Y.js document loaded from database"
        );

        // Return as Uint8Array - Prisma returns Buffer which is compatible
        return new Uint8Array(note.ydoc);
      } catch (error) {
        logger.error({ noteId, documentName, error }, "Failed to fetch document from database");
        // Don't crash - return null and let Hocuspocus create a new document
        return null;
      }
    },

    /**
     * Store Y.js document to database
     * Called periodically when document changes (debounced)
     * Also extracts text content for full-text search indexing
     */
    store: async ({ documentName, state }) => {
      const noteId = extractNoteId(documentName);

      if (!noteId) {
        logger.warn({ documentName }, "Cannot store: Invalid document name format");
        return;
      }

      try {
        // Convert Uint8Array to Buffer for Prisma
        const ydocBuffer = Buffer.from(state);

        // Extract text content for full-text search (Story 4-2)
        let content: string | null = null;
        try {
          content = extractTextFromYDoc(state);
        } catch (extractError) {
          // Log but continue - content extraction is not critical
          logger.warn(
            { noteId, documentName, error: extractError },
            "Failed to extract text content from Y.Doc"
          );
        }

        await db.note.update({
          where: { id: noteId },
          data: {
            ydoc: ydocBuffer,
            content: content, // Store extracted text for search
            updatedAt: new Date(),
          },
        });

        logger.debug(
          { noteId, documentName, ydocSize: ydocBuffer.length, contentLength: content?.length ?? 0 },
          "Y.js document stored to database"
        );
      } catch (error) {
        // Log error but don't crash the server
        logger.error({ noteId, documentName, error }, "Failed to store document to database");
      }
    },
  });
}

/**
 * Graceful shutdown - disconnect Prisma client
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
