// Notes feature module
// Barrel exports for notes management feature

// Types
export type {
  Note,
  Tag,
  Folder,
  FolderWithChildren,
  FolderWithNotesTree,
  FolderWithCount,
  NoteInTree,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFolderInput,
  UpdateFolderInput,
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

// Schemas - Folders (Story 5.1)
export {
  createFolderSchema,
  updateFolderSchema,
  folderIdSchema,
  foldersQuerySchema,
} from "./schemas/folder.schema";
export type {
  CreateFolderSchemaInput,
  UpdateFolderSchemaInput,
  FolderIdSchemaInput,
  FoldersQuerySchemaInput,
} from "./schemas/folder.schema";

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

// Service - Folders (Story 5.1, 5.4)
export {
  createFolder,
  getFolderById,
  getUserFolders,
  getUserFoldersTree,
  getUserFoldersTreeWithNotes,
  updateFolder,
  deleteFolder,
  getFolderPath,
} from "./services/folders.service";

// Hooks
export { useNote, noteKeys, type UseNoteOptions } from "./hooks/useNote";
export { useNotes, type UseNotesOptions } from "./hooks/useNotes";
export { useTags, tagKeys, type UseTagsOptions } from "./hooks/useTags";
export { useAutoSave, type UseAutoSaveOptions } from "./hooks/useAutoSave";
export { useFolders, folderKeys, type UseFoldersOptions } from "./hooks/useFolders";
export { useFolder, type UseFolderOptions } from "./hooks/useFolder";
export { useMoveNote, type MoveNoteInput, type MoveNoteResult, type UseMoveNoteOptions } from "./hooks/useMoveNote";

// Components
export { NoteCard, type NoteCardProps } from "./components/NoteCard";
export { NotesList, type NotesListProps } from "./components/NotesList";
export { NoteHeader, type NoteHeaderProps, type SaveStatus } from "./components/NoteHeader";
export { FolderTree, type FolderTreeProps } from "./components/FolderTree";
export { FolderTreeItem, type FolderTreeItemProps } from "./components/FolderTreeItem";
export { CreateFolderDialog, type CreateFolderDialogProps } from "./components/CreateFolderDialog";
export { DeleteFolderDialog, type DeleteFolderDialogProps } from "./components/DeleteFolderDialog";
export { MoveToFolderDialog, type MoveToFolderDialogProps } from "./components/MoveToFolderDialog";
export { NoteTreeItem, type NoteTreeItemProps } from "./components/NoteTreeItem";
