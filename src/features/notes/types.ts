import type {
  Note as PrismaNote,
  Tag as PrismaTag,
  Folder as PrismaFolder,
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
 * Note type for API responses (excludes internal fields like ydoc, searchVector)
 * @see Story 8.3: Added workspaceId for permission checks
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
> & {
  tags?: Tag[];
  folder?: Folder | null;
};

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
 * Single note response
 */
export interface NoteResponse {
  data: Note;
}
