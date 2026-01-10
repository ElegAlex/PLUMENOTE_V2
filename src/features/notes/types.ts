import type { Note as PrismaNote } from "@prisma/client";

/**
 * Note type for API responses (excludes internal fields like ydoc, searchVector)
 */
export type Note = Pick<
  PrismaNote,
  "id" | "title" | "content" | "createdAt" | "updatedAt" | "createdById"
>;

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title?: string; // Default: "Sans titre"
  content?: string;
}

/**
 * Input for updating an existing note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
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
  };
}

/**
 * Single note response
 */
export interface NoteResponse {
  data: Note;
}
