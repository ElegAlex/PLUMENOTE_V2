/**
 * API Routes: /api/notes/snapshot
 *
 * - POST: Create a snapshot of a note (used for beacon requests on page close)
 *
 * This endpoint is designed to be called via navigator.sendBeacon() when
 * the user closes or navigates away from a note. It creates a version
 * snapshot if the content has changed.
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { createCloseSnapshot } from "@/features/versions/services/snapshot.service";
import { snapshotRequestSchema } from "@/features/versions/schemas/version.schema";

/**
 * POST /api/notes/snapshot
 *
 * Create a snapshot of a note on close/navigation.
 * Expects JSON body: { noteId: string }
 *
 * This is a "fire and forget" endpoint - errors are logged but
 * don't block the user from navigating away.
 *
 * Response format:
 * {
 *   data: { created: boolean, versionId?: string, reason: string }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    // 2. Parse body (handle both JSON and text for sendBeacon compatibility)
    let body: unknown;
    try {
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        body = await request.json();
      } else if (contentType.includes("text/plain")) {
        // sendBeacon sends as text/plain by default
        const text = await request.text();
        body = JSON.parse(text);
      } else {
        // Try to parse as JSON anyway
        body = await request.json();
      }
    } catch {
      return createErrorResponse(
        "validation",
        "Invalid request body",
        400,
        "Validation Error"
      );
    }

    // 3. Validate body
    const parseResult = snapshotRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message ?? "Invalid request body";
      return createErrorResponse(
        "validation",
        errorMessage,
        400,
        "Validation Error"
      );
    }

    const { noteId } = parseResult.data;

    // 4. Create snapshot (permission check is done in the service)
    const result = await createCloseSnapshot(noteId, session.user.id);

    // 5. Return result
    return NextResponse.json({ data: result });
  } catch (error) {
    // Log error but return success for beacon requests
    // (we don't want to block user navigation)
    logger.error({ error }, "Error creating snapshot via beacon");

    return NextResponse.json({
      data: { created: false, reason: "error" },
    });
  }
}
