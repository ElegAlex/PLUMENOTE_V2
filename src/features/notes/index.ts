// Notes feature module
// Barrel exports for notes management feature

// Types
export type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NotesListResponse,
  NoteResponse,
} from "./types";

// Schemas
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

// Service
export {
  createNote,
  getNoteById,
  getUserNotes,
  updateNote,
  deleteNote,
} from "./services/notes.service";

// Hooks
export { useNote, noteKeys, type UseNoteOptions } from "./hooks/useNote";
