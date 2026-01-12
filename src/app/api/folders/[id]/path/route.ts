/**
 * API Route: /api/folders/[id]/path
 *
 * - GET: Get the full folder path (breadcrumb) from root to the specified folder
 *
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError, ForbiddenError } from "@/lib/api-error";
import { getFolderPath } from "@/features/notes/services/folders.service";
import { folderIdSchema } from "@/features/notes/schemas/folder.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/folders/[id]/path
 *
 * Returns the complete folder path from root to the specified folder.
 * The path is an array of folders ordered from root (first) to target folder (last).
 *
 * @returns { data: Folder[] } - Array of folders in path order
 * @returns 401 - If not authenticated
 * @returns 403 - If user doesn't own the folder
 * @returns 404 - If folder not found
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentification requise",
        401
      );
    }

    const { id } = await params;
    const idResult = folderIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Format d'ID de dossier invalide",
        400,
        "Validation Error"
      );
    }

    const path = await getFolderPath(id, session.user.id);
    return NextResponse.json({ data: path });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching folder path");
    return createErrorResponse(
      "internal",
      "Une erreur est survenue lors du chargement du chemin",
      500,
      "Internal Server Error"
    );
  }
}
