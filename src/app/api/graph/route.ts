/**
 * API Route: GET /api/graph
 *
 * Returns graph data (nodes and edges) for all user's notes and their internal links.
 * Used by the GraphView component to visualize note connections.
 * Supports optional folder filtering via ?folderId query parameter (Story 6.9).
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Graphe interactif avec notes comme nœuds et liens comme arêtes
 * @see AC: #6 - Chargement < 500ms (optimized select query)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * Graph node representing a note
 */
interface GraphNode {
  id: string;
  title: string;
  linkCount: number;
}

/**
 * Graph edge representing a link between notes
 */
interface GraphEdge {
  source: string;
  target: string;
}

/**
 * Graph data structure for the frontend
 * @property outOfScopeEdges - Edges to notes outside the filtered folder scope (Story 6.9)
 */
interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  outOfScopeEdges: GraphEdge[];
}

/**
 * Get all descendant folder IDs recursively
 * @param folderId - The parent folder ID
 * @param userId - The user ID for security filtering
 * @returns Array of folder IDs including all descendants
 */
async function getAllDescendantFolderIds(folderId: string, userId: string): Promise<string[]> {
  const descendants: string[] = [];

  // Get all folders for this user (single query, then filter in memory for recursion)
  const allFolders = await prisma.folder.findMany({
    where: { createdById: userId },
    select: { id: true, parentId: true },
  });

  // Build a map of parent -> children for efficient recursion
  const childrenMap = new Map<string, string[]>();
  for (const folder of allFolders) {
    if (folder.parentId) {
      const children = childrenMap.get(folder.parentId) || [];
      children.push(folder.id);
      childrenMap.set(folder.parentId, children);
    }
  }

  // Recursive function to collect descendants
  function collectDescendants(parentId: string) {
    const children = childrenMap.get(parentId) || [];
    for (const childId of children) {
      descendants.push(childId);
      collectDescendants(childId);
    }
  }

  collectDescendants(folderId);
  return descendants;
}

/**
 * GET /api/graph
 *
 * Returns all notes as nodes and their internal links as edges.
 * Filters out soft-deleted notes automatically.
 * Supports optional folderId query parameter for folder-scoped filtering (Story 6.9).
 *
 * @param request.searchParams.folderId - Optional folder ID to filter by
 * @returns { data: { nodes: GraphNode[], edges: GraphEdge[], outOfScopeEdges: GraphEdge[] } }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401,
        "Unauthorized"
      );
    }

    // 2. Get optional folderId filter (Story 6.9)
    const folderId = request.nextUrl.searchParams.get("folderId");

    // 3. Build folder filter if folderId is specified
    let folderFilter: { folderId?: { in: string[] } } = {};
    if (folderId) {
      // Get all descendant folders recursively
      const descendantFolderIds = await getAllDescendantFolderIds(folderId, session.user.id);
      const allFolderIds = [folderId, ...descendantFolderIds];
      folderFilter = { folderId: { in: allFolderIds } };
    }

    // 4. Fetch user's notes with their links (filtered by folder if specified)
    const notes = await prisma.note.findMany({
      where: {
        createdById: session.user.id,
        deletedAt: null,
        ...folderFilter,
      },
      select: {
        id: true,
        title: true,
        sourceLinks: {
          select: { targetNoteId: true },
        },
        targetLinks: {
          select: { sourceNoteId: true },
        },
      },
    });

    // 5. Build nodes array
    const nodes: GraphNode[] = notes.map((note) => ({
      id: note.id,
      title: note.title || "Sans titre",
      linkCount: note.sourceLinks.length + note.targetLinks.length,
    }));

    // 6. Build edges arrays (in-scope and out-of-scope)
    const noteIds = new Set(notes.map((n) => n.id));
    const edges: GraphEdge[] = [];
    const outOfScopeEdges: GraphEdge[] = [];

    for (const note of notes) {
      for (const link of note.sourceLinks) {
        if (noteIds.has(link.targetNoteId)) {
          // Target is in the filtered set - in-scope edge
          edges.push({
            source: note.id,
            target: link.targetNoteId,
          });
        } else if (folderId) {
          // Target is outside the filtered set - out-of-scope edge (only when filtering)
          outOfScopeEdges.push({
            source: note.id,
            target: link.targetNoteId,
          });
        }
      }
    }

    // 7. Return graph data with outOfScopeEdges
    const data: GraphData = { nodes, edges, outOfScopeEdges };
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ error }, "Error fetching graph data");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching graph data",
      500,
      "Internal Server Error"
    );
  }
}
