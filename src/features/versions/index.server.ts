/**
 * Versions Feature Module - Server-Side Exports
 *
 * This file contains exports that use Prisma/database and should ONLY be
 * imported in server components, API routes, or server actions.
 *
 * For client-side imports, use the main index.ts instead.
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

// Types (safe to re-export - no runtime code)
export type {
  NoteVersion,
  NoteVersionSummary,
  CreateVersionInput,
  VersionsListResponse,
  VersionResponse,
  SnapshotResult,
} from "./types";

// Services (server-only - use Prisma)
export {
  createVersion,
  getVersionsByNoteId,
  getVersionById,
  getVersionByNumber,
  getLatestVersionNumber,
} from "./services/versions.service";

export {
  createSnapshotIfChanged,
  createIntervalSnapshot,
  createCloseSnapshot,
  createForcedSnapshot,
} from "./services/snapshot.service";

// Schemas (safe for server - Zod validation)
export {
  createVersionSchema,
  versionIdSchema,
  noteIdParamSchema,
  versionsQuerySchema,
  snapshotRequestSchema,
} from "./schemas/version.schema";

export type {
  CreateVersionSchemaInput,
  VersionIdSchemaInput,
  NoteIdParamSchemaInput,
  VersionsQuerySchemaInput,
  SnapshotRequestSchemaInput,
} from "./schemas/version.schema";
