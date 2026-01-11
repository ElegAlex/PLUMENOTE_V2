// Editor feature module
// Barrel exports for Tiptap editor feature

// Components
export { Editor, type EditorProps, type EditorRef } from "./components/Editor";
export {
  EditorToolbar,
  type EditorToolbarProps,
} from "./components/EditorToolbar";
export {
  CollaborativeEditor,
  type CollaborativeEditorProps,
} from "./components/CollaborativeEditor";
export {
  SyncStatusIndicator,
  type SyncStatusIndicatorProps,
} from "./components/SyncStatusIndicator";
export {
  PresenceIndicator,
  type PresenceIndicatorProps,
} from "./components/PresenceIndicator";

// Hooks
export {
  useCollaboration,
  type ConnectionStatus,
  type UseCollaborationOptions,
  type UseCollaborationReturn,
} from "./hooks/useCollaboration";
export {
  usePresence,
  type PresenceUser,
  type UsePresenceOptions,
  type UsePresenceReturn,
} from "./hooks/usePresence";
