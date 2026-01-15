"use client";

/**
 * NotesList Component
 *
 * Displays a grid of notes with loading and empty states.
 * Supports moving notes to folders via dialog and toast notifications.
 * Supports sharing personal notes to team workspaces.
 *
 * @see Story 3.3: Liste des Notes
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { useState, useCallback } from "react";
import { FileText, Plus, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import { ShareToWorkspaceDialog } from "./ShareToWorkspaceDialog";
import { useMoveNote } from "../hooks/useMoveNote";
import { useFolders } from "../hooks/useFolders";
import { findFolderNameById } from "../utils/folderUtils";
import { cn } from "@/lib/utils";
import type { Note, FolderWithChildren } from "../types";

export interface NotesListProps {
  /** List of notes to display */
  notes: Note[];
  /** Whether notes are loading */
  isLoading?: boolean;
  /** Error if fetch failed */
  error?: Error | null;
  /** Current search query (for empty state message) */
  searchQuery?: string;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (id: string) => void;
  /** Callback when create is clicked */
  onCreate?: () => void;
  /** Callback to retry fetch */
  onRetry?: () => void;
  /** Callback to clear search */
  onClearSearch?: () => void;
  /** ID of note being deleted */
  deletingId?: string | null;
  /** Whether favorite toggle is in progress */
  isTogglingFavorite?: boolean;
  /** Whether to enable moving notes to folders */
  enableMoveToFolder?: boolean;
  /** Whether to enable drag-and-drop for notes */
  enableDragAndDrop?: boolean;
  /** Whether to enable sharing personal notes to team workspaces */
  enableShareToWorkspace?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for notes grid
 */
function NotesListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no notes exist
 */
function NotesListEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucune note</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Vous n&apos;avez pas encore cree de note. Commencez par en creer une!
      </p>
      {onCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Creer une note
        </Button>
      )}
    </div>
  );
}

/**
 * Error state when fetch fails
 */
function NotesListError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        {error.message || "Impossible de charger les notes."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Reessayer
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state when search has no results
 */
function NotesListNoResults({
  searchQuery,
  onClearSearch,
}: {
  searchQuery: string;
  onClearSearch?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucun resultat</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Aucune note ne correspond a &quot;{searchQuery}&quot;.
        <br />
        Essayez avec d&apos;autres termes.
      </p>
      {onClearSearch && (
        <Button onClick={onClearSearch} variant="outline">
          Effacer la recherche
        </Button>
      )}
    </div>
  );
}

/**
 * Grid list of note cards with loading, error, and empty states
 */
export function NotesList({
  notes,
  isLoading = false,
  error,
  searchQuery,
  onDelete,
  onToggleFavorite,
  onCreate,
  onRetry,
  onClearSearch,
  deletingId,
  isTogglingFavorite,
  enableMoveToFolder = false,
  enableDragAndDrop = false,
  enableShareToWorkspace = false,
  className,
}: NotesListProps) {
  // State for move dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveNoteCurrentFolderId, setMoveNoteCurrentFolderId] = useState<string | null>(null);

  // State for share dialog (Story 8.6)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);
  const [shareNoteTitle, setShareNoteTitle] = useState<string>("");

  // Hooks for moving notes
  const { moveNoteAsync } = useMoveNote();
  const { folders } = useFolders({ tree: true });

  // Open move dialog for a note
  const handleMoveToFolder = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    setMoveNoteId(noteId);
    setMoveNoteCurrentFolderId(note?.folderId ?? null);
    setMoveDialogOpen(true);
  }, [notes]);

  // Handle folder selection in move dialog
  const handleMoveSelect = useCallback(async (noteId: string, folderId: string | null) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const result = await moveNoteAsync({ noteId, folderId });

      // Find folder name for toast message
      const folderName = folderId
        ? findFolderNameById(folders as FolderWithChildren[], folderId)
        : "Racine";

      toast.success(`Note déplacée vers "${folderName}"`, {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await moveNoteAsync({ noteId, folderId: result.previousFolderId });
              toast.success("Déplacement annulé");
            } catch {
              toast.error("Erreur lors de l'annulation");
            }
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du déplacement";
      toast.error(message);
    }
  }, [notes, folders, moveNoteAsync]);

  // Open share dialog for a note (Story 8.6)
  const handleShareToWorkspace = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setShareNoteId(noteId);
      setShareNoteTitle(note.title || "Sans titre");
      setShareDialogOpen(true);
    }
  }, [notes]);

  if (isLoading) {
    return <NotesListSkeleton />;
  }

  if (error) {
    return <NotesListError error={error} onRetry={onRetry} />;
  }

  if (notes.length === 0) {
    // Show different empty state based on whether user is searching
    if (searchQuery) {
      return (
        <NotesListNoResults
          searchQuery={searchQuery}
          onClearSearch={onClearSearch}
        />
      );
    }
    return <NotesListEmpty onCreate={onCreate} />;
  }

  return (
    <>
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onMoveToFolder={enableMoveToFolder ? handleMoveToFolder : undefined}
            onShareToWorkspace={enableShareToWorkspace ? handleShareToWorkspace : undefined}
            isDeleting={deletingId === note.id}
            isTogglingFavorite={isTogglingFavorite}
            draggable={enableDragAndDrop}
          />
        ))}
      </div>

      {/* Move to folder dialog */}
      {enableMoveToFolder && moveNoteId && (
        <MoveToFolderDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          noteId={moveNoteId}
          currentFolderId={moveNoteCurrentFolderId}
          onSelect={handleMoveSelect}
        />
      )}

      {/* Share to workspace dialog (Story 8.6) */}
      {enableShareToWorkspace && shareNoteId && (
        <ShareToWorkspaceDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          noteId={shareNoteId}
          noteTitle={shareNoteTitle}
        />
      )}
    </>
  );
}
