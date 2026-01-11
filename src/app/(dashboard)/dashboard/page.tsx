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
import { Plus, Search, Star, ArrowUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotesList } from "@/features/notes/components/NotesList";
import { useNotes, type NoteSortField, type SortDirection } from "@/features/notes/hooks/useNotes";
import { cn } from "@/lib/utils";
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

/** Sort options configuration */
const sortOptions: { value: NoteSortField; label: string }[] = [
  { value: "updatedAt", label: "Date de modification" },
  { value: "createdAt", label: "Date de creation" },
  { value: "title", label: "Titre" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<NoteSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
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
    restoreNoteAsync,
    toggleFavorite,
    isTogglingFavorite,
  } = useNotes({ search: debouncedSearch, favoriteOnly, sortBy, sortDir });

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

  // Toggle favorite status
  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  // Toggle favorite filter
  const handleToggleFavoriteFilter = useCallback(() => {
    setFavoriteOnly((prev) => !prev);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: NoteSortField) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same field
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(newSortBy);
      setSortDir("desc"); // Default to descending for new field
    }
  }, [sortBy]);

  // Confirm delete dialog
  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  // Execute delete (soft delete with undo option)
  // @see Story 3.5: Suppression d'une Note
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;

    const noteIdToDelete = deleteId;
    setDeletingId(deleteId);
    setDeleteId(null);

    try {
      await deleteNoteAsync(noteIdToDelete);
      // Toast with undo button (30 seconds)
      toast.success("Note supprimee", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreNoteAsync(noteIdToDelete);
              toast.success("Note restauree");
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
    } finally {
      setDeletingId(null);
    }
  }, [deleteId, deleteNoteAsync, restoreNoteAsync]);

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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
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

        {/* Filters and Sort toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Favorites filter */}
          <Button
            variant={favoriteOnly ? "default" : "outline"}
            size="sm"
            onClick={handleToggleFavoriteFilter}
            className={cn(
              "gap-1.5",
              favoriteOnly && "bg-yellow-500 hover:bg-yellow-600 text-white"
            )}
          >
            <Star className={cn("h-4 w-4", favoriteOnly && "fill-current")} />
            Favoris
          </Button>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpDown className="h-4 w-4" />
                {sortOptions.find((o) => o.value === sortBy)?.label}
                <span className="text-muted-foreground text-xs">
                  ({sortDir === "desc" ? "desc" : "asc"})
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      sortBy === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
        onToggleFavorite={handleToggleFavorite}
        onCreate={handleCreate}
        onRetry={refetch}
        onClearSearch={handleClearSearch}
        deletingId={deletingId}
        isTogglingFavorite={isTogglingFavorite}
        enableMoveToFolder={true}
        enableDragAndDrop={true}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
    </div>
  );
}
