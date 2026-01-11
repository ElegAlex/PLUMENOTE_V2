// Notes feature module
// Barrel exports for notes management feature

// Types
export type {
  Note,
  Tag,
  CreateNoteInput,
  UpdateNoteInput,
  CreateTagInput,
  UpdateTagInput,
  NotesListResponse,
  NoteResponse,
} from "./types";

// Schemas - Notes
export {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  notesQuerySchema,
} from "./schemas/note.schema";
export type {
  CreateNoteSchemaInput,
  UpdateNoteSchemaInput,
  NoteIdSchemaInput,
  NotesQuerySchemaInput,
} from "./schemas/note.schema";

// Schemas - Tags
export {
  createTagSchema,
  updateTagSchema,
  tagIdSchema,
} from "./schemas/tag.schema";
export type {
  CreateTagSchemaInput,
  UpdateTagSchemaInput,
  TagIdSchemaInput,
} from "./schemas/tag.schema";

// Service - Notes
export {
  createNote,
  getNoteById,
  getUserNotes,
  updateNote,
  deleteNote,
  toggleNoteFavorite,
} from "./services/notes.service";
export type { NoteSortField, SortDirection } from "./services/notes.service";

// Service - Tags
export {
  createTag,
  getUserTags,
  getTagById,
  updateTag,
  deleteTag,
} from "./services/tags.service";

// Hooks
export { useNote, noteKeys, type UseNoteOptions } from "./hooks/useNote";
export { useNotes, type UseNotesOptions } from "./hooks/useNotes";
export { useTags, tagKeys, type UseTagsOptions } from "./hooks/useTags";
export { useAutoSave, type UseAutoSaveOptions } from "./hooks/useAutoSave";

// Components
export { NoteCard, type NoteCardProps } from "./components/NoteCard";
export { NotesList, type NotesListProps } from "./components/NotesList";
export { NoteHeader, type NoteHeaderProps, type SaveStatus } from "./components/NoteHeader";
