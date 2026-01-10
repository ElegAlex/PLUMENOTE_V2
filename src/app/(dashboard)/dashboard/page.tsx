"use client";

/**
 * Dashboard Page
 *
 * Main page displaying the user's notes list with search and actions.
 *
 * @see Story 3.3: Liste des Notes
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotesList } from "@/features/notes/components/NotesList";
import { useNotes } from "@/features/notes/hooks/useNotes";
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

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const {
    notes,
    meta,
    isLoading,
    error,
    refetch,
    createNoteAsync,
    isCreating,
    deleteNoteAsync,
  } = useNotes({ search: debouncedSearch });

  // Debounce search input with proper cleanup
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Clear search input
  const handleClearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
  }, []);

  // Create a new note and navigate to it
  const handleCreate = useCallback(async () => {
    try {
      const note = await createNoteAsync({});
      toast.success("Note creee");
      router.push(`/notes/${note.id}`);
    } catch (err) {
      console.error("Failed to create note:", err);
      toast.error("Echec de la creation", {
        description: "Impossible de creer la note.",
      });
    }
  }, [createNoteAsync, router]);

  // Confirm delete dialog
  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  // Execute delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;

    setDeletingId(deleteId);
    setDeleteId(null);

    try {
      await deleteNoteAsync(deleteId);
      toast.success("Note supprimee");
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Echec de la suppression", {
        description: "Impossible de supprimer la note.",
      });
    } finally {
      setDeletingId(null);
    }
  }, [deleteId, deleteNoteAsync]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes Notes</h1>
        <p className="text-muted-foreground">
          Gerez et organisez vos notes personnelles
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher une note..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            aria-label="Rechercher une note"
          />
        </div>

        {/* Create button */}
        <Button onClick={handleCreate} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          {isCreating ? "Creation..." : "Nouvelle note"}
        </Button>
      </div>

      {/* Search results info */}
      {debouncedSearch && !isLoading && !error && notes.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {meta?.total === 1
            ? "1 resultat"
            : `${meta?.total ?? notes.length} resultats`}{" "}
          pour &quot;{debouncedSearch}&quot;
        </p>
      )}

      {/* Notes list */}
      <NotesList
        notes={notes}
        isLoading={isLoading}
        error={error}
        searchQuery={debouncedSearch}
        onDelete={handleDeleteClick}
        onCreate={handleCreate}
        onRetry={refetch}
        onClearSearch={handleClearSearch}
        deletingId={deletingId}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La note sera definitivement supprimee.
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
    </div>
  );
}
