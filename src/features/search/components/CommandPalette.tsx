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
  Eye,
  Settings,
  Loader2,
  Search,
  Network,
  Server,
  ListChecks,
  BookOpen,
  Users,
  FolderKanban,
  FileStack,
  type LucideIcon,
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
import { toast } from "sonner";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";
import { useSearchNotes, SearchResultNote } from "../hooks/useSearchNotes";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { useRecentNotes, type RecentNote } from "@/features/notes/hooks/useRecentNotes";
import { useTemplates } from "@/features/templates/hooks/useTemplates";
import type { Template } from "@/features/templates/types";
import { FolderFilter } from "./FolderFilter";

/**
 * Icon map for templates
 * @see Story 7.2: Creation de Note depuis Template
 */
const templateIconMap: Record<string, LucideIcon> = {
  server: Server,
  "list-checks": ListChecks,
  "file-text": FileText,
  "book-open": BookOpen,
  users: Users,
  "folder-kanban": FolderKanban,
};

function getTemplateIcon(iconName: string): LucideIcon {
  return templateIconMap[iconName] || FileText;
}

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
 * Recently viewed note item component (Story 6.4)
 */
function ViewedNoteItem({
  note,
  onSelect,
}: {
  note: RecentNote;
  onSelect: () => void;
}) {
  const displayTitle = note.title || "Sans titre";

  return (
    <CommandItem
      value={`viewed-${note.id}-${displayTitle}`}
      onSelect={onSelect}
      className="flex items-center gap-2"
    >
      <Eye className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{displayTitle}</span>
    </CommandItem>
  );
}

/**
 * Template item component for command palette
 * @see Story 7.2: Creation de Note depuis Template
 */
function TemplateItem({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  const Icon = getTemplateIcon(template.icon);
  return (
    <CommandItem
      value={`template-${template.id}-${template.name}`}
      onSelect={onSelect}
      className="flex items-center gap-2"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1 truncate">{template.name}</span>
      {template.description && (
        <span className="text-xs text-muted-foreground truncate max-w-40">
          {template.description}
        </span>
      )}
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
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);

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

  // Recently viewed notes (Story 6.4)
  const { recentlyViewed, isLoading: isLoadingViewed } = useRecentNotes({
    enabled: isOpen && !search.trim(),
  });

  // Templates for command palette search (Story 7.2)
  // Only fetch when search contains "template"
  const searchLower = search.trim().toLowerCase();
  const showTemplates = searchLower.includes("template");
  const { data: templatesData, isLoading: isLoadingTemplates } = useTemplates({
    enabled: isOpen && showTemplates,
  });
  const templates = templatesData?.data ?? [];

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

  // Navigate to graph view (Story 6.8)
  const handleGraph = useCallback(() => {
    router.push("/graph");
    close();
  }, [router, close]);

  // Create note from template (Story 7.2)
  const handleCreateFromTemplate = useCallback(
    async (templateContent: string) => {
      setIsCreatingFromTemplate(true);
      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Sans titre",
            content: templateContent,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Erreur lors de la création");
        }

        const { data: note } = await response.json();
        toast.success("Note créée depuis le template");
        close();
        router.push(`/notes/${note.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur lors de la création";
        toast.error(message);
      } finally {
        setIsCreatingFromTemplate(false);
      }
    },
    [router, close]
  );

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

        {/* Templates (Story 7.2) - shown when search contains "template" */}
        {hasSearchQuery && showTemplates && (
          <>
            {isLoadingTemplates && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoadingTemplates && templates.length > 0 && (
              <CommandGroup heading={`Templates (${templates.length})`}>
                {templates.map((template) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    onSelect={() => handleCreateFromTemplate(template.content)}
                  />
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {/* Default state: recently viewed, favorites, and recent modified */}
        {!hasSearchQuery && (
          <>
            {/* Recently viewed first (Story 6.4 AC #5) */}
            {/* Note: API /api/notes/recent returns max 5 items, no client-side slice needed */}
            {recentlyViewed && recentlyViewed.length > 0 && (
              <CommandGroup heading="Récemment consultées">
                {recentlyViewed.map((note) => (
                  <ViewedNoteItem
                    key={note.id}
                    note={note}
                    onSelect={() => handleSelectNote(note.id)}
                  />
                ))}
              </CommandGroup>
            )}

            {/* Favorites second */}
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

            {/* Recent notes (modified) */}
            {recentNotes && recentNotes.length > 0 && (
              <CommandGroup heading="Modifiées récemment">
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

            {/* Loading for all sections */}
            {(isLoadingRecent || isLoadingFavorites || isLoadingViewed) && (
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
              <CommandItem onSelect={handleGraph}>
                <Network className="h-4 w-4" />
                <span>Vue Graphe</span>
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
