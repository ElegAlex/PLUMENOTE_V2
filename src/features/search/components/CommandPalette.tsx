"use client";

/**
 * Command Palette component for global search
 *
 * Provides a Ctrl+K searchable command palette for notes, folders, and actions.
 * Uses FTS-powered search from Story 6.1.
 * Supports folder filtering from Story 6.3.
 *
 * @see Story 6.2: Command Palette et Recherche
 * @see Story 6.3: Filtrage des Résultats
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import {
  FileText,
  Folder,
  Plus,
  Star,
  Clock,
  Settings,
  Loader2,
  Search,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";
import { useSearchNotes, SearchResultNote } from "../hooks/useSearchNotes";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { FolderFilter } from "./FolderFilter";

/**
 * Sanitize HTML highlight from search results
 * Only allows <mark> tags for safety
 */
function sanitizeHighlight(html: string | null): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ["mark"] });
}

/**
 * Get folder path display string
 */
function getFolderPath(folder: { name: string } | null): string {
  if (!folder) return "Racine";
  return folder.name;
}

/**
 * Search result item component
 */
function SearchResultItem({
  note,
  onSelect,
}: {
  note: SearchResultNote;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`note-${note.id}-${note.title}`}
      onSelect={onSelect}
      className="flex flex-col items-start gap-1 py-3"
    >
      <div className="flex w-full items-center gap-2">
        {note.isFavorite ? (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="font-medium truncate flex-1">{note.title}</span>
        <span className="text-xs text-muted-foreground">
          {getFolderPath(note.folder)}
        </span>
      </div>
      {note.highlight && (
        <p
          className="text-xs text-muted-foreground line-clamp-1 w-full pl-6 [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 dark:[&_mark]:bg-yellow-800 dark:[&_mark]:text-yellow-100"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(note.highlight) }}
        />
      )}
    </CommandItem>
  );
}

/**
 * Recent note item component (simplified for when no search)
 */
function RecentNoteItem({
  note,
  onSelect,
}: {
  note: {
    id: string;
    title: string;
    isFavorite: boolean;
    folder?: { name: string } | null;
  };
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`recent-${note.id}-${note.title}`}
      onSelect={onSelect}
      className="flex items-center gap-2"
    >
      {note.isFavorite ? (
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span className="flex-1 truncate">{note.title}</span>
      <span className="text-xs text-muted-foreground">
        {note.folder?.name ?? "Racine"}
      </span>
    </CommandItem>
  );
}

/**
 * Main Command Palette component
 */
export function CommandPalette() {
  const router = useRouter();
  const { isOpen, close } = useCommandPaletteStore();
  const [search, setSearch] = useState("");

  // Folder filter state (Story 6.3)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);

  // Search results (only when search has content)
  // Pass folderId to filter results by folder (Story 6.3)
  const {
    data: searchData,
    isLoading: isSearching,
    isFetching: isSearchFetching,
  } = useSearchNotes(search, { folderId: selectedFolderId ?? undefined });

  // Recent notes (for empty search state)
  const { notes: recentNotes, isLoading: isLoadingRecent } = useNotes({
    pageSize: 5,
    sortBy: "updatedAt",
    sortDir: "desc",
    enabled: isOpen && !search.trim(),
  });

  // Favorite notes (for empty search state)
  const { notes: favoriteNotes, isLoading: isLoadingFavorites } = useNotes({
    pageSize: 5,
    favoriteOnly: true,
    enabled: isOpen && !search.trim(),
  });

  // Reset search and folder filter when closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedFolderId(null);
      setSelectedFolderName(null);
    }
  }, [isOpen]);

  // Handle folder filter selection (Story 6.3)
  const handleFolderSelect = useCallback(
    (folderId: string | null, folderName: string | null) => {
      setSelectedFolderId(folderId);
      setSelectedFolderName(folderName);
    },
    []
  );

  // Clear folder filter (for "search all folders" action)
  const handleClearFolderFilter = useCallback(() => {
    setSelectedFolderId(null);
    setSelectedFolderName(null);
  }, []);

  // Navigate to a note
  const handleSelectNote = useCallback(
    (noteId: string) => {
      router.push(`/notes/${noteId}`);
      close();
    },
    [router, close]
  );

  // Create a new note
  const handleCreateNote = useCallback(() => {
    router.push("/notes/new");
    close();
  }, [router, close]);

  // Create note with search term as title
  const handleCreateNoteWithTitle = useCallback(() => {
    router.push(`/notes/new?title=${encodeURIComponent(search.trim())}`);
    close();
  }, [router, close, search]);

  // Navigate to settings
  const handleSettings = useCallback(() => {
    router.push("/settings");
    close();
  }, [router, close]);

  const hasSearchQuery = search.trim().length > 0;
  const searchResults = searchData?.data ?? [];
  const hasSearchResults = searchResults.length > 0;
  const isLoading = isSearching || isSearchFetching;
  const hasActiveFolderFilter = selectedFolderId !== null;

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      title="Recherche"
      description="Rechercher des notes, dossiers et actions"
      showCloseButton={false}
    >
      {/* Filter bar (Story 6.3) */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <FolderFilter
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolderName}
          onFolderSelect={handleFolderSelect}
        />
      </div>
      <CommandInput
        placeholder={hasActiveFolderFilter ? `Rechercher dans ${selectedFolderName}...` : "Rechercher une note..."}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {/* Loading state */}
        {isLoading && hasSearchQuery && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state with create option (Story 6.3: folder-aware message) */}
        {hasSearchQuery && !isLoading && !hasSearchResults && (
          <>
            <CommandEmpty>
              {hasActiveFolderFilter
                ? `Aucun résultat pour "${search}" dans ${selectedFolderName}`
                : `Aucun résultat pour "${search}"`}
            </CommandEmpty>
            {/* Suggestion to search all folders when filter is active (Story 6.3 AC #5) */}
            {hasActiveFolderFilter && (
              <CommandGroup heading="Suggestions">
                <CommandItem onSelect={handleClearFolderFilter}>
                  <Search className="h-4 w-4" />
                  <span>Rechercher dans tous les dossiers</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleCreateNoteWithTitle}>
                <Plus className="h-4 w-4" />
                <span>Créer une note &quot;{search}&quot;</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Search results */}
        {hasSearchQuery && hasSearchResults && (
          <CommandGroup heading={`Notes (${searchData?.meta?.total ?? 0})`}>
            {searchResults.map((note) => (
              <SearchResultItem
                key={note.id}
                note={note}
                onSelect={() => handleSelectNote(note.id)}
              />
            ))}
          </CommandGroup>
        )}

        {/* Default state: recent and favorites */}
        {!hasSearchQuery && (
          <>
            {/* Favorites first */}
            {favoriteNotes && favoriteNotes.length > 0 && (
              <CommandGroup heading="Favoris">
                {favoriteNotes.map((note) => (
                  <RecentNoteItem
                    key={note.id}
                    note={note}
                    onSelect={() => handleSelectNote(note.id)}
                  />
                ))}
              </CommandGroup>
            )}

            {/* Recent notes */}
            {recentNotes && recentNotes.length > 0 && (
              <CommandGroup heading="Notes récentes">
                {recentNotes
                  .filter((n) => !n.isFavorite) // Exclude favorites to avoid duplicates
                  .slice(0, 5)
                  .map((note) => (
                    <RecentNoteItem
                      key={note.id}
                      note={note}
                      onSelect={() => handleSelectNote(note.id)}
                    />
                  ))}
              </CommandGroup>
            )}

            {/* Loading for recent */}
            {(isLoadingRecent || isLoadingFavorites) && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <CommandSeparator />

            {/* Quick actions */}
            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleCreateNote}>
                <Plus className="h-4 w-4" />
                <span>Nouvelle note</span>
                <CommandShortcut>Ctrl+N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={handleSettings}>
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
