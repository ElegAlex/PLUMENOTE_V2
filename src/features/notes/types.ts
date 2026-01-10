import type { Note as PrismaNote, Tag as PrismaTag } from "@prisma/client";

/**
 * Tag type for API responses
 */
export type Tag = Pick<PrismaTag, "id" | "name" | "color">;

/**
 * Note type for API responses (excludes internal fields like ydoc, searchVector)
 */
export type Note = Pick<
  PrismaNote,
  | "id"
  | "title"
  | "content"
  | "isFavorite"
  | "sortOrder"
  | "createdAt"
  | "updatedAt"
  | "createdById"
> & {
  tags?: Tag[];
};

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title?: string; // Default: "Sans titre"
  content?: string;
  isFavorite?: boolean;
  tagIds?: string[];
}

/**
 * Input for updating an existing note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
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
