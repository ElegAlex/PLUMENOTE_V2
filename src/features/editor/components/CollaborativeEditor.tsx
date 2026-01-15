"use client";

/**
 * CollaborativeEditor Component
 *
 * Real-time collaborative editor using Tiptap with Y.js integration.
 * Connects to Hocuspocus server for document synchronization.
 * Displays collaborative cursors showing other users' positions.
 *
 * @see Story 4-3: Edition Simultanee
 * @see Story 4-4: Curseurs Collaboratifs
 * @see Story 4-5: Indicateur de Présence
 */

import { useEditor, EditorContent, type AnyExtension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCollaboration, type ConnectionStatus } from "../hooks/useCollaboration";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useVersionSnapshots } from "@/features/versions/hooks/useVersionSnapshots";
import { InternalLink } from "../extensions/InternalLink";
import { InternalLinkSuggestion, defaultSearchNotes } from "../extensions/InternalLinkSuggestion";
import { createSuggestionRender } from "../extensions/suggestion-render";

/**
 * Generate a unique color based on user ID using HSL
 * Ensures consistent colors for the same user across sessions
 */
function getUserColor(userId: string): string {
  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export interface CollaborativeEditorProps {
  /** Note ID to collaborate on */
  noteId: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the sync status indicator */
  showSyncStatus?: boolean;
  /** Override user name for cursor display (uses session name if not provided) */
  userName?: string;
  /** Override user color for cursor (generates from user ID if not provided) */
  userColor?: string;
  /** Callback when editor is ready with editor instance */
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
  /** Callback when sync status changes (isSynced boolean) */
  onSyncStatusChange?: (isSynced: boolean) => void;
  /** Callback when connection status changes */
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when collaboration error occurs */
  onError?: (error: string) => void;
  /** Callback when provider is available (for presence tracking) */
  onProviderReady?: (provider: import("@hocuspocus/provider").HocuspocusProvider) => void;
}

/**
 * Collaborative Tiptap Editor with real-time sync
 *
 * @example
 * ```tsx
 * <CollaborativeEditor
 *   noteId="abc123"
 *   placeholder="Start writing..."
 * />
 * ```
 */
export function CollaborativeEditor({
  noteId,
  placeholder = "Commencez a ecrire...",
  editable = true,
  className,
  showSyncStatus = true,
  userName,
  userColor,
  onEditorReady,
  onSyncStatusChange,
  onConnectionStatusChange,
  onError,
  onProviderReady,
}: CollaborativeEditorProps) {
  // Get session for user info
  const { data: session } = useSession();
  const router = useRouter();

  // Connect to collaboration server
  const { ydoc, provider, status, isSynced, error } = useCollaboration({
    noteId,
    autoConnect: true,
  });

  // Version snapshots for automatic history tracking (Story 9.1)
  const { trackActivity: trackSnapshotActivity } = useVersionSnapshots({
    noteId,
    isEditing: editable,
    enabled: true,
  });

  // Compute user info for cursor display and presence
  const cursorUser = useMemo(() => {
    const userId = session?.user?.id || "anonymous";
    const name = userName || session?.user?.name || "Anonyme";
    const color = userColor || getUserColor(userId);
    const avatar = session?.user?.image || undefined;
    return { name, color, avatar };
  }, [session?.user?.id, session?.user?.name, session?.user?.image, userName, userColor]);

  // Ref for editor container to scope activity tracking
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Throttle ref for activity updates (max 1 update per second)
  const lastActivityUpdateRef = useRef<number>(0);
  const ACTIVITY_THROTTLE_MS = 1000;

  // Update awareness state with current user info and activity
  const updateActivityAwareness = useCallback(() => {
    // Track activity for version snapshots (Story 9.1)
    trackSnapshotActivity();

    if (!provider?.awareness) return;

    const now = Date.now();
    // Throttle updates to max once per second
    if (now - lastActivityUpdateRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }
    lastActivityUpdateRef.current = now;

    provider.awareness.setLocalStateField("user", {
      ...cursorUser,
      lastActivity: now,
    });
  }, [provider, cursorUser, trackSnapshotActivity]);

  // Set initial awareness state when provider connects
  useEffect(() => {
    if (!provider?.awareness) return;

    // Set initial user state with current timestamp
    provider.awareness.setLocalStateField("user", {
      ...cursorUser,
      lastActivity: Date.now(),
    });
  }, [provider, cursorUser]);

  // Track user activity for presence idle detection (scoped to editor container)
  useEffect(() => {
    if (!provider?.awareness) return;

    const container = editorContainerRef.current;
    if (!container) return;

    // Events to track for activity (mousemove removed - too frequent, mousedown is sufficient)
    const activityEvents = ["keydown", "mousedown", "touchstart"];

    // Add listeners to editor container only
    activityEvents.forEach((event) => {
      container.addEventListener(event, updateActivityAwareness, {
        passive: true,
      });
    });

    return () => {
      // Remove listeners
      activityEvents.forEach((event) => {
        container.removeEventListener(event, updateActivityAwareness);
      });
    };
  }, [provider, updateActivityAwareness]);

  // Notify when error occurs
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Notify when provider is ready (for presence tracking)
  useEffect(() => {
    if (provider && onProviderReady) {
      onProviderReady(provider);
    }
  }, [provider, onProviderReady]);

  // Build extensions array with optional Collaboration extensions
  const extensions = useMemo(() => {
    const baseExtensions: AnyExtension[] = [
      StarterKit.configure({
        // Disable built-in undo/redo when using Collaboration (it has its own)
        ...(ydoc ? { undoRedo: false } : {}),
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: "editor-heading",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "editor-bullet-list",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "editor-ordered-list",
          },
        },
        code: {
          HTMLAttributes: {
            class: "editor-code",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "editor-code-block",
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: "editor-paragraph",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      InternalLink.configure({
        onNavigate: (targetNoteId) => router.push(`/notes/${targetNoteId}`),
        onFetchPreview: async (targetNoteId) => {
          try {
            const response = await fetch(`/api/notes/${targetNoteId}`);
            if (!response.ok) return null;
            const { data } = await response.json();
            return {
              title: data.title,
              content: data.content?.substring(0, 200) || "",
            };
          } catch {
            return null;
          }
        },
      }),
      InternalLinkSuggestion.configure({
        suggestion: {
          items: async ({ query }) => defaultSearchNotes(query),
          render: createSuggestionRender(),
        },
      }),
    ];

    // Add Collaboration extension only when ydoc is available
    if (ydoc) {
      baseExtensions.push(
        Collaboration.configure({
          document: ydoc,
        })
      );
    }

    // Add CollaborationCursor only when provider is available
    if (provider) {
      baseExtensions.push(
        CollaborationCursor.configure({
          provider,
          user: cursorUser,
        })
      );
    }

    return baseExtensions;
  }, [ydoc, provider, placeholder, cursorUser, router]);

  // Initialize Tiptap editor with Collaboration and CollaborationCursor extensions
  const editor = useEditor(
    {
      extensions,
      editable,
      immediatelyRender: false, // Prevent SSR hydration mismatch
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-slate dark:prose-invert max-w-none",
            "min-h-[200px] p-4 focus:outline-none",
            "prose-headings:font-semibold",
            "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
            "prose-h4:text-lg prose-h5:text-base prose-h6:text-sm",
            "prose-p:my-2 prose-p:leading-relaxed",
            "prose-ul:my-2 prose-ol:my-2",
            "prose-li:my-0.5",
            "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
            "prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4"
          ),
        },
      },
    },
    [extensions] // Re-create editor when extensions change (includes ydoc and provider)
  );

  // Notify when editor is ready with editor instance
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Notify when sync status changes
  useEffect(() => {
    if (onSyncStatusChange) {
      onSyncStatusChange(isSynced);
    }
  }, [isSynced, onSyncStatusChange]);

  // Notify when connection status changes
  useEffect(() => {
    if (onConnectionStatusChange) {
      onConnectionStatusChange(status);
    }
  }, [status, onConnectionStatusChange]);

  // Loading state - wait for ydoc and editor to be ready
  if (!ydoc || !editor) {
    return (
      <div className={cn("space-y-2", className)}>
        {showSyncStatus && <SyncStatusIndicator status="connecting" />}
        <div className="min-h-[200px] animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showSyncStatus && <SyncStatusIndicator status={status} error={error} />}
      <div
        ref={editorContainerRef}
        className="editor-wrapper rounded-md border bg-background"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default CollaborativeEditor;
