/**
 * Versions Feature Module - Client-Side Exports
 *
 * This file contains exports safe for client components (hooks, components, types).
 *
 * For server-side imports (services, Prisma), use index.server.ts instead:
 * ```ts
 * import { createVersion } from "@/features/versions/index.server";
 * ```
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 * @see Story 9.2: Affichage de l'Historique des Versions
 */

// Types (no runtime code - safe for client)
export type {
  NoteVersion,
  NoteVersionSummary,
  CreateVersionInput,
  VersionsListResponse,
  VersionResponse,
  SnapshotResult,
} from "./types";

// Schemas (Zod - safe for client validation)
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
export { useVersionHistory, versionHistoryKeys } from "./hooks/useVersionHistory";
export type { UseVersionHistoryOptions } from "./hooks/useVersionHistory";
export { useVersionDetail } from "./hooks/useVersionDetail";
export type { UseVersionDetailOptions } from "./hooks/useVersionDetail";

// Components (client-side)
export { VersionHistoryPanel } from "./components/VersionHistoryPanel";
export type { VersionHistoryPanelProps } from "./components/VersionHistoryPanel";
export { VersionListItem } from "./components/VersionListItem";
export type { VersionListItemProps } from "./components/VersionListItem";
export { VersionDayGroup, groupVersionsByDay, formatDayLabel } from "./components/VersionDayGroup";
export type { VersionDayGroupProps } from "./components/VersionDayGroup";
export { VersionPreview } from "./components/VersionPreview";
export type { VersionPreviewProps } from "./components/VersionPreview";
export { VersionDiff } from "./components/VersionDiff";
export type { VersionDiffProps } from "./components/VersionDiff";

// Utilities
export { getInitials } from "./utils";
