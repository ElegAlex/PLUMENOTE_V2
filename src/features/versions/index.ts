/**
 * Versions Feature Module
 *
 * Exports public APIs for version history functionality.
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

// Types
export type {
  NoteVersion,
  NoteVersionSummary,
  CreateVersionInput,
  VersionsListResponse,
  VersionResponse,
  SnapshotResult,
} from "./types";

// Services
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

// Schemas
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

// Hooks (client-side)
export { useVersionSnapshots } from "./hooks/useVersionSnapshots";
