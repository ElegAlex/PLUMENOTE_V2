/**
 * API Routes: /api/folders
 *
 * - GET: List folders for authenticated user (flat or tree structure)
 * - POST: Create a new folder
 *
 * @see Story 5.1: Modele Folder et Structure Hierarchique
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import {
  createFolder,
  getUserFolders,
  getUserFoldersTree,
  getUserFoldersTreeWithNotes,
} from "@/features/notes/services/folders.service";
import {
  createFolderSchema,
  foldersQuerySchema,
} from "@/features/notes/schemas/folder.schema";

/**
 * GET /api/folders
 *
 * List folders for the authenticated user.
 * Query params:
 * - tree=true: Returns hierarchical tree structure
 * - parentId: Filter by parent folder (null for root only)
 * - includeNotes=true: Include notes in tree structure (requires tree=true)
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const queryResult = foldersQuerySchema.safeParse({
      tree: searchParams.get("tree") ?? undefined,
      parentId: searchParams.get("parentId") ?? undefined,
      includeNotes: searchParams.get("includeNotes") ?? undefined,
    });

    if (!queryResult.success) {
      return createErrorResponse(
        "validation",
        queryResult.error.issues[0]?.message ?? "Invalid query parameters",
        400,
        "Validation Error"
      );
    }

    const { tree, includeNotes } = queryResult.data;

    // Return tree structure with notes if requested
    if (tree && includeNotes) {
      const folders = await getUserFoldersTreeWithNotes(session.user.id);
      return NextResponse.json({ data: folders });
    }

    // Return tree structure if requested
    if (tree) {
      const folders = await getUserFoldersTree(session.user.id);
      return NextResponse.json({ data: folders });
    }

    // Otherwise return flat list with counts
    const folders = await getUserFolders(session.user.id);
    return NextResponse.json({ data: folders });
  } catch (error) {
    logger.error({ error }, "Error fetching folders");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching folders",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/folders
 *
 * Create a new folder for the authenticated user.
 * Body: { name: string, parentId?: string | null }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        "validation",
        "Invalid JSON body",
        400,
        "Validation Error"
      );
    }

    const parseResult = createFolderSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const folder = await createFolder(session.user.id, parseResult.data);

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return createErrorResponse(
        "conflict",
        error.message,
        409,
        "Conflict"
      );
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(
        "not-found",
        error.message,
        404,
        "Not Found"
      );
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse(
        "forbidden",
        error.message,
        403,
        "Forbidden"
      );
    }

    logger.error({ error }, "Error creating folder");
    return createErrorResponse(
      "internal",
      "An error occurred while creating the folder",
      500,
      "Internal Server Error"
    );
  }
}
