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
import { Trash2, Star, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    </div>
  );
}
