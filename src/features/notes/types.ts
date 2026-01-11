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
 */
export type Folder = Pick<
  PrismaFolder,
  "id" | "name" | "parentId" | "createdAt" | "updatedAt" | "createdById"
>;

/**
 * Folder with nested children for tree structure
 */
export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
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
 */
export type Note = Pick<
  PrismaNote,
  | "id"
  | "title"
  | "content"
  | "folderId"
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
