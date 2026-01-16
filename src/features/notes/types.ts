import type {
  Note as PrismaNote,
  Tag as PrismaTag,
  Folder as PrismaFolder,
  User as PrismaUser,
} from "@prisma/client";

/**
 * Tag type for API responses
 */
export type Tag = Pick<PrismaTag, "id" | "name" | "color">;

/**
 * Folder type for API responses
 * @see Story 5.1: Modèle Folder et Structure Hiérarchique
 * @see Story 8.4: Permissions par Dossier (added workspaceId)
 */
export type Folder = Pick<
  PrismaFolder,
  "id" | "name" | "parentId" | "createdAt" | "updatedAt" | "createdById" | "workspaceId"
>;

/**
 * Folder with nested children for tree structure
 */
export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
}

/**
 * Simplified note type for tree display
 * Note: updatedAt is string because JSON serialization converts Date to ISO string
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
export interface NoteInTree {
  id: string;
  title: string;
  isFavorite: boolean;
  updatedAt: string;
}

/**
 * Folder with children and notes for tree structure with notes
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */
export interface FolderWithNotesTree extends Folder {
  children: FolderWithNotesTree[];
  notes: NoteInTree[];
}

/**
 * Folder with note count for list display
 */
export interface FolderWithCount extends Folder {
  _count: {
    notes: number;
    children: number;
  };
}

/**
 * Minimal user type for lastModifiedBy relation
 * @see Story 10.1: Tracking des Vues et Métadonnées
 */
export type LastModifiedByUser = Pick<PrismaUser, "id" | "name" | "image">;

/**
 * Note type for API responses (excludes internal fields like ydoc, searchVector)
 * @see Story 8.3: Added workspaceId for permission checks
 * @see Story 10.1: Added viewCount, lastViewedAt, lastModifiedById for metrics
 */
export type Note = Pick<
  PrismaNote,
  | "id"
  | "title"
  | "content"
  | "folderId"
  | "workspaceId"
  | "isFavorite"
  | "sortOrder"
  | "createdAt"
  | "updatedAt"
  | "createdById"
  | "viewCount"
  | "lastViewedAt"
  | "lastModifiedById"
> & {
  tags?: Tag[];
  folder?: Folder | null;
  lastModifiedBy?: LastModifiedByUser | null;
};

/**
 * Note metrics for analytics display
 * @see Story 10.1: Tracking des Vues et Métadonnées
 */
export interface NoteMetrics {
  viewCount: number;
  lastViewedAt: Date | null;
  lastModifiedBy: LastModifiedByUser | null;
}

/**
 * Input for creating a new folder
 * @see Story 5.1
 */
export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

/**
 * Input for updating an existing folder
 * @see Story 5.1
 */
export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
}

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title?: string; // Default: "Sans titre"
  content?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  tagIds?: string[];
}

/**
 * Input for updating an existing note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  tagIds?: string[];
}

/**
 * Input for creating a tag
 */
export interface CreateTagInput {
  name: string;
  color?: string;
}

/**
 * Input for updating a tag
 */
export interface UpdateTagInput {
  name?: string;
  color?: string;
}

/**
 * Paginated notes list response
 */
export interface NotesListResponse {
  data: Note[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    search?: string;
  };
}

/**
 * Single note response (includes metrics and relations)
 * @see Story 10.1: Note detail includes lastModifiedBy hydrated
 */
export interface NoteResponse {
  data: Note;
}

// ViewTrackingResult is exported from @/features/analytics
// Use: import { ViewTrackingResult } from "@/features/analytics";
