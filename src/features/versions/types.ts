import type { NoteVersion as PrismaNoteVersion } from "@prisma/client";

/**
 * Note version type for API responses
 * Includes full content and ydoc for detail views
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */
export type NoteVersion = Pick<
  PrismaNoteVersion,
  | "id"
  | "version"
  | "title"
  | "content"
  | "ydoc"
  | "createdAt"
  | "noteId"
  | "createdById"
>;

/**
 * Note version summary for list views
 * Excludes heavy fields (content, ydoc) for performance
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */
export type NoteVersionSummary = Pick<
  PrismaNoteVersion,
  "id" | "version" | "title" | "createdAt" | "noteId" | "createdById"
> & {
  createdBy?: {
    name: string | null;
    image: string | null;
  };
};

/**
 * Input for creating a new version (snapshot)
 * @see Story 9.1
 */
export interface CreateVersionInput {
  title: string;
  content?: string | null;
  ydoc?: Buffer | null;
}

/**
 * Paginated versions list response
 * @see Story 9.1
 */
export interface VersionsListResponse {
  data: NoteVersionSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Single version response (with full content)
 * @see Story 9.1
 */
export interface VersionResponse {
  data: NoteVersion;
}

/**
 * Result of a snapshot operation
 * @see Story 9.1
 */
export interface SnapshotResult {
  created: boolean;
  versionId?: string;
  version?: number;
  reason:
    | "created"
    | "no_changes"
    | "note_not_found"
    | "forbidden"
    | "error";
}

/**
 * Result of a version restore operation
 * @see Story 9.3: Restauration de Version
 */
export interface RestoreResult {
  /** The note after restoration */
  note: {
    id: string;
    title: string;
    content: string | null;
    updatedAt: Date;
  };
  /** The version number that was restored from */
  restoredFromVersion: number;
  /** ID of the undo snapshot (can be used to revert the restoration) */
  undoVersionId: string;
}

/**
 * Response format for restore operation
 * @see Story 9.3
 */
export interface RestoreVersionResponse {
  data: RestoreResult["note"];
  meta: {
    restoredFrom: number;
    undoVersionId: string;
  };
}
