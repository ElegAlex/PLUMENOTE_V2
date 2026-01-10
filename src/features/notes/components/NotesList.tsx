"use client";

/**
 * NotesList Component
 *
 * Displays a grid of notes with loading and empty states.
 *
 * @see Story 3.3: Liste des Notes
 */

import { FileText, Plus, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import { cn } from "@/lib/utils";
import type { Note } from "../types";

export interface NotesListProps {
  /** List of notes to display */
  notes: Note[];
  /** Whether notes are loading */
  isLoading?: boolean;
  /** Error if fetch failed */
  error?: Error | null;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when create is clicked */
  onCreate?: () => void;
  /** Callback to retry fetch */
  onRetry?: () => void;
  /** ID of note being deleted */
  deletingId?: string | null;
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
 * Grid list of note cards with loading, error, and empty states
 */
export function NotesList({
  notes,
  isLoading = false,
  error,
  onDelete,
  onCreate,
  onRetry,
  deletingId,
  className,
}: NotesListProps) {
  if (isLoading) {
    return <NotesListSkeleton />;
  }

  if (error) {
    return <NotesListError error={error} onRetry={onRetry} />;
  }

  if (notes.length === 0) {
    return <NotesListEmpty onCreate={onCreate} />;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onDelete={onDelete}
          isDeleting={deletingId === note.id}
        />
      ))}
    </div>
  );
}
