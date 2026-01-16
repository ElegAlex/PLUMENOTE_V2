"use client";

/**
 * Note Edit Page
 *
 * Displays the collaborative note editor with toolbar for editing a specific note.
 * Uses Y.js/Hocuspocus for real-time collaboration.
 * Auto-saves title changes with debounce.
 *
 * @see Story 3.2: Editeur Tiptap Markdown de Base
 * @see Story 3.3: Creation d'une Nouvelle Note
 * @see Story 3.4: Sauvegarde Automatique des Notes
 * @see Story 3.5: Suppression d'une Note
 * @see Story 4.3: Edition Simultanee
 * @see Story 4.5: Indicateur de Presence
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 * @see Story 6.5: Notes Favorites
 * @see Story 6.7: Panneau Backlinks
 * @see FR8: Un utilisateur peut editer une note en Markdown avec previsualisation live
 */

import { use, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import { Trash2, Star, Link2, Network, ChevronDown, History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSession } from "next-auth/react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import {
  Editor as FallbackEditor,
  EditorToolbar,
  CollaborativeEditor,
  SyncStatusIndicator,
  PresenceIndicator,
  usePresence,
  type ConnectionStatus,
} from "@/features/editor";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useNote } from "@/features/notes/hooks/useNote";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { useAutoSave } from "@/features/notes/hooks/useAutoSave";
import { useTrackNoteView } from "@/features/notes/hooks/useTrackNoteView";
import { useBacklinks } from "@/features/notes/hooks/useBacklinks";
import { NoteHeader, type SaveStatus } from "@/features/notes/components/NoteHeader";
import { TagsPanel } from "@/features/notes/components/TagsPanel";
import { NoteBreadcrumb } from "@/features/notes/components/NoteBreadcrumb";
import { BacklinksPanel } from "@/features/notes/components/BacklinksPanel";
import { VersionHistoryPanel } from "@/features/versions/components/VersionHistoryPanel";
import { CommentsSidebar, type CommentSelection } from "@/features/comments/components/CommentsSidebar";
import { useComments } from "@/features/comments/hooks/useComments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UpdateNoteInput } from "@/features/notes/types";

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: NotePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { note, isLoading, error, updateNoteAsync } = useNote(id);
  const { deleteNoteAsync, restoreNoteAsync, toggleFavoriteAsync, isTogglingFavorite } = useNotes({ enabled: false });
  const isOnline = useOnlineStatus();

  // Track note view (Story 6.4: Notes Récentes)
  // Only track when note is loaded successfully (not during loading or on error)
  // This prevents unnecessary API calls for non-existent notes
  useTrackNoteView(note?.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Backlinks panel state (Story 6.7: Panneau Backlinks)
  const [showBacklinks, setShowBacklinks] = useState(false);
  const { backlinks } = useBacklinks(note?.id, { enabled: !!note });

  // Version history panel state (Story 9.2: Affichage de l'Historique des Versions)
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Comments panel state (Story 9.5: Ajout de Commentaires en Marge)
  const [showComments, setShowComments] = useState(false);
  const [textSelection, setTextSelection] = useState<CommentSelection | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [commentsMarksApplied, setCommentsMarksApplied] = useState(false);

  // Fetch comments for initial marks sync (Story 9.5)
  const { comments: existingComments } = useComments(note?.id, {
    enabled: !!note?.id,
    refetchInterval: false, // Don't poll, just fetch once for marks
  });

  // Track user edits separately from the loaded note
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  // Collaborative editor state
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [syncStatus, setSyncStatus] = useState<ConnectionStatus>("connecting");
  const [collaborationError, setCollaborationError] = useState<string | null>(null);
  const [useFallbackEditor, setUseFallbackEditor] = useState(false);
  const [fallbackEditor, setFallbackEditor] = useState<TiptapEditor | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Presence tracking (Story 4-5)
  const { users: presenceUsers } = usePresence({ provider });

  // Handler for fallback editor ready
  const handleFallbackEditorReady = useCallback((editorInstance: TiptapEditor | null) => {
    setFallbackEditor(editorInstance);
  }, []);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  // Check if this is a newly created note (title is default "Sans titre" and no content)
  const isNewNote = useMemo(() => {
    if (!note) return false;
    return note.title === "Sans titre" && (!note.content || note.content === "");
  }, [note]);

  // Derive displayed values: use edited value if user has made changes, otherwise use note data
  const title = useMemo(
    () => editedTitle ?? note?.title ?? "",
    [editedTitle, note?.title]
  );

  // Auto-save handler for title only (content is synced via Y.js/Hocuspocus)
  const handleSave = useCallback(
    async (data: UpdateNoteInput) => {
      setSaveStatus("saving");
      // Clear any pending timeout
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      try {
        await updateNoteAsync(data);
        setSaveStatus("saved");
        // Reset to idle after 2 seconds (with cleanup ref)
        saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to save note:", err);
        setSaveStatus("error");
        toast.error("Echec de la sauvegarde du titre", {
          description: "Le titre n'a pas pu etre enregistre.",
          action: {
            label: "Reessayer",
            onClick: () => flushRef.current?.(),
          },
        });
      }
    },
    [updateNoteAsync]
  );

  const { save: autoSave, flush } = useAutoSave(handleSave, { delay: 2000 });

  // Store flush in ref for toast retry button
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Compute display save status (offline takes precedence)
  const displaySaveStatus: SaveStatus = useMemo(() => {
    if (!isOnline) return "offline";
    return saveStatus;
  }, [isOnline, saveStatus]);

  // Keyboard shortcut: Ctrl+S to force save title
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const wasSaved = await flush();
        if (wasSaved) {
          toast.success("Titre sauvegarde");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flush]);

  // Handle editor ready callback from CollaborativeEditor
  const handleEditorReady = useCallback((ed: TiptapEditor | null) => {
    setEditor(ed);
  }, []);

  // Apply existing comment marks when editor is ready (Story 9.5 - M1 fix)
  useEffect(() => {
    const activeEditor = useFallbackEditor ? fallbackEditor : editor;
    if (!activeEditor || commentsMarksApplied || existingComments.length === 0) {
      return;
    }

    // Wait a tick for editor to be fully initialized
    const timeoutId = setTimeout(() => {
      existingComments.forEach((comment) => {
        try {
          activeEditor.commands.addCommentMark({
            from: comment.anchorStart,
            to: comment.anchorEnd,
            commentId: comment.id,
          });
        } catch (e) {
          // Silently ignore if position is invalid (document may have changed)
          console.warn(`Could not apply mark for comment ${comment.id}:`, e);
        }
      });
      setCommentsMarksApplied(true);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [editor, fallbackEditor, useFallbackEditor, existingComments, commentsMarksApplied]);

  // Handle provider ready for presence tracking (Story 4-5)
  const handleProviderReady = useCallback((prov: HocuspocusProvider) => {
    setProvider(prov);
  }, []);

  // Handle collaboration error with fallback option
  const handleCollaborationError = useCallback((err: string) => {
    setCollaborationError(err);
    toast.error("Erreur de collaboration", {
      description: err,
      action: {
        label: "Mode hors-ligne",
        onClick: () => setUseFallbackEditor(true),
      },
      duration: 10000,
    });
  }, []);

  // Handle fallback editor content changes (autosave via API)
  const handleFallbackEditorUpdate = useCallback(
    (content: string) => {
      autoSave({ content });
    },
    [autoSave]
  );

  // Handle title change with auto-save
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditedTitle(newTitle);
      autoSave({ title: newTitle });
    },
    [autoSave]
  );

  // Handle text selection for comments (Story 9.5)
  const handleSelectionChange = useCallback(
    (selection: { text: string; from: number; to: number } | null) => {
      if (selection) {
        setTextSelection({
          text: selection.text,
          anchorStart: selection.from,
          anchorEnd: selection.to,
        });
        // Auto-open panel when text is selected (if not already open)
        if (!showComments) {
          setShowComments(true);
        }
      }
      // Note: We don't clear selection here when null - let the form cancel handle it
      // This prevents the form from disappearing while typing
    },
    [showComments]
  );

  // Handle comment mark click (Story 9.5)
  const handleCommentMarkClick = useCallback((commentId: string) => {
    setSelectedCommentId(commentId);
    setShowComments(true);
  }, []);

  // Handle comment selection in sidebar (Story 9.5)
  const handleCommentSelect = useCallback((commentId: string) => {
    setSelectedCommentId(commentId);
    // Scroll to the comment highlight in editor
    const activeEditor = useFallbackEditor ? fallbackEditor : editor;
    if (activeEditor) {
      const { state } = activeEditor;
      const { doc, schema } = state;
      const commentMarkType = schema.marks.comment;
      if (commentMarkType) {
        let found = false;
        doc.descendants((node, pos) => {
          if (found) return false; // Stop traversal if already found
          for (const mark of node.marks) {
            if (mark.type === commentMarkType && mark.attrs.commentId === commentId) {
              activeEditor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize });
              activeEditor.commands.scrollIntoView();
              found = true;
              return false; // Stop traversal
            }
          }
        });
      }
    }
  }, [useFallbackEditor, fallbackEditor, editor]);

  // Handle comment created (add highlight mark) (Story 9.5)
  const handleCommentCreated = useCallback(
    (commentId: string, anchorStart: number, anchorEnd: number) => {
      const activeEditor = useFallbackEditor ? fallbackEditor : editor;
      if (activeEditor) {
        activeEditor.commands.addCommentMark({ from: anchorStart, to: anchorEnd, commentId });
      }
    },
    [useFallbackEditor, fallbackEditor, editor]
  );

  // Handle comment deleted (remove highlight mark) (Story 9.5)
  const handleCommentDeleted = useCallback(
    (commentId: string) => {
      const activeEditor = useFallbackEditor ? fallbackEditor : editor;
      if (activeEditor) {
        activeEditor.commands.removeCommentMark(commentId);
      }
    },
    [useFallbackEditor, fallbackEditor, editor]
  );

  // Handle tags change (Story 3.6)
  const handleTagsChange = useCallback(
    (tagIds: string[]) => {
      // Tags are saved immediately (not debounced)
      updateNoteAsync({ tagIds }).catch((err) => {
        console.error("Failed to update tags:", err);
        toast.error("Echec de la mise a jour des tags");
      });
    },
    [updateNoteAsync]
  );

  // Handle favorite toggle (Story 6.5: Notes Favorites)
  const handleToggleFavorite = useCallback(async () => {
    if (!note) return;
    try {
      await toggleFavoriteAsync(note.id);
      toast.success(note.isFavorite ? "Retiré des favoris" : "Ajouté aux favoris");
    } catch (error: unknown) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Échec du changement de favori");
    }
  }, [note, toggleFavoriteAsync]);

  // Handle delete confirmation (Story 3.5)
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);

    try {
      await deleteNoteAsync(id);
      // Redirect to dashboard first
      router.push("/dashboard");
      // Then show toast with undo option
      toast.success("Note supprimee", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreNoteAsync(id);
              toast.success("Note restauree");
              // Optionally navigate back to the note
              router.push(`/notes/${id}`);
            } catch {
              toast.error("Echec de la restauration");
            }
          },
        },
        duration: 30000, // 30 seconds for undo
      });
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Echec de la suppression", {
        description: "Impossible de supprimer la note.",
      });
      setIsDeleting(false);
    }
  }, [id, deleteNoteAsync, restoreNoteAsync, router]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    const isNotFound = error.message.includes("not found");
    const isForbidden = error.message.includes("permission");

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">
            {isNotFound
              ? "Note introuvable"
              : isForbidden
                ? "Acces refuse"
                : "Erreur"}
          </h1>
          <p className="mb-4 text-muted-foreground">
            {isNotFound
              ? "Cette note n&apos;existe pas ou a ete supprimee."
              : isForbidden
                ? "Vous n&apos;avez pas la permission d&apos;acceder a cette note."
                : error.message}
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Handle case where note is null after loading
  if (!note) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Note Header with Title, Save Status, Presence, and Delete Button */}
      <div className="mb-4 flex items-start gap-4">
        <div className="flex-1">
          <NoteHeader
            title={title}
            onTitleChange={handleTitleChange}
            saveStatus={displaySaveStatus}
            isNewNote={isNewNote}
            viewCount={note.viewCount}
          />
        </div>
        {/* Presence Indicator (Story 4-5) */}
        {!useFallbackEditor && presenceUsers.length > 0 && (
          <PresenceIndicator
            users={presenceUsers}
            maxVisible={5}
            className="mt-2"
          />
        )}
        {/* Favorite button (Story 6.5: Notes Favorites) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFavorite}
          disabled={isTogglingFavorite}
          className={cn(
            "shrink-0",
            note.isFavorite
              ? "text-yellow-500 hover:text-yellow-600"
              : "text-muted-foreground hover:text-yellow-500"
          )}
          aria-label={note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Star className={cn("h-5 w-5", note.isFavorite && "fill-current")} />
        </Button>
        {/* Backlinks button (Story 6.7: Panneau Backlinks) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowBacklinks(true)}
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Voir les backlinks"
        >
          <Link2 className="h-5 w-5" />
          {backlinks.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {backlinks.length > 9 ? "9+" : backlinks.length}
            </span>
          )}
        </Button>
        {/* Version history button (Story 9.2: Affichage de l'Historique des Versions) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowVersionHistory(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voir l'historique des versions"
        >
          <History className="h-5 w-5" />
        </Button>
        {/* Comments button (Story 9.5: Ajout de Commentaires en Marge) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowComments(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voir les commentaires"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        {/* Graph view dropdown (Story 6.8 & 6.9: Vue Graphe) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Options du graphe"
            >
              <Network className="h-5 w-5" />
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/graph?highlightId=${note.id}`)}
            >
              <Network className="h-4 w-4 mr-2" />
              Graphe global
            </DropdownMenuItem>
            {note.folderId && (
              <DropdownMenuItem
                onClick={() => router.push(`/graph?highlightId=${note.id}&folderId=${note.folderId}`)}
              >
                <Network className="h-4 w-4 mr-2" />
                Graphe du dossier
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Delete button (Story 3.5) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Supprimer la note"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Breadcrumb Navigation (Story 5.5) */}
      {note.folderId && (
        <NoteBreadcrumb
          noteTitle={title}
          folderId={note.folderId}
          className="mb-4"
        />
      )}

      {/* Tags Panel (Story 3.6) */}
      <TagsPanel
        tags={note.tags ?? []}
        onTagsChange={handleTagsChange}
        className="mb-4"
      />

      {/* Sync Status Indicator (Story 4.3) */}
      <div className="mb-4 flex items-center justify-between">
        {useFallbackEditor ? (
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <span>Mode hors-ligne</span>
            <button
              onClick={() => setUseFallbackEditor(false)}
              className="text-xs underline hover:no-underline"
            >
              Réessayer collaboration
            </button>
          </div>
        ) : (
          <SyncStatusIndicator status={syncStatus} error={collaborationError} />
        )}
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar
        editor={useFallbackEditor ? fallbackEditor : editor}
        className="mb-4"
      />

      {/* Editor: Collaborative or Fallback (Story 4.3) */}
      {useFallbackEditor ? (
        <FallbackEditor
          content={note.content ?? ""}
          onUpdate={handleFallbackEditorUpdate}
          onEditorReady={handleFallbackEditorReady}
          onCommentMarkClick={handleCommentMarkClick}
          onSelectionChange={handleSelectionChange}
          className="rounded-md border bg-background"
        />
      ) : (
        <CollaborativeEditor
          noteId={id}
          showSyncStatus={false}
          onEditorReady={handleEditorReady}
          onConnectionStatusChange={setSyncStatus}
          onError={handleCollaborationError}
          onProviderReady={handleProviderReady}
          onCommentMarkClick={handleCommentMarkClick}
          onSelectionChange={handleSelectionChange}
        />
      )}

      {/* Delete confirmation dialog (Story 3.5) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note?</AlertDialogTitle>
            <AlertDialogDescription>
              La note sera supprimee. Vous aurez 30 secondes pour annuler cette action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Backlinks panel (Story 6.7: Panneau Backlinks) */}
      <BacklinksPanel
        noteId={note.id}
        open={showBacklinks}
        onOpenChange={setShowBacklinks}
      />

      {/* Version history panel (Story 9.2: Affichage de l'Historique des Versions) */}
      <VersionHistoryPanel
        noteId={note.id}
        currentContent={note.content}
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
      />

      {/* Comments sidebar (Story 9.5: Ajout de Commentaires en Marge) */}
      <CommentsSidebar
        noteId={note.id}
        currentUserId={session?.user?.id}
        open={showComments}
        onOpenChange={setShowComments}
        selection={textSelection}
        onSelectionClear={() => setTextSelection(null)}
        selectedCommentId={selectedCommentId}
        onCommentSelect={handleCommentSelect}
        onCommentCreated={handleCommentCreated}
        onCommentDeleted={handleCommentDeleted}
      />
    </div>
  );
}
