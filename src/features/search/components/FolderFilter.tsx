"use client";

/**
 * FolderFilter Component
 *
 * A filter control for selecting a folder to scope search results.
 * Uses Popover + Command pattern for searchable folder selection.
 *
 * @see Story 6.3: Filtrage des Résultats
 */

import { useState, useMemo, useCallback } from "react";
import { Folder, X, Filter, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useFolders } from "@/features/notes/hooks/useFolders";
import { flattenFolders } from "@/features/notes/utils/folderUtils";
import type { FolderWithChildren } from "@/features/notes/types";

export interface FolderFilterProps {
  /** Currently selected folder ID, null means "all folders" */
  selectedFolderId: string | null;
  /** Currently selected folder name for display */
  selectedFolderName: string | null;
  /** Callback when folder selection changes */
  onFolderSelect: (folderId: string | null, folderName: string | null) => void;
}

/**
 * Folder filter component with popover selector
 *
 * Features:
 * - Badge showing active filter with remove button
 * - Popover with searchable folder list
 * - Hierarchical folder display with depth indentation
 * - "All folders" option to clear filter
 * - Keyboard accessible
 */
export function FolderFilter({
  selectedFolderId,
  selectedFolderName,
  onFolderSelect,
}: FolderFilterProps) {
  const [open, setOpen] = useState(false);

  // Fetch folders as tree structure for hierarchical display
  const { folders, isLoading } = useFolders({ tree: true, enabled: open });

  // Flatten for display with depth indentation
  // Use nullish coalescing for safety if folders is undefined
  const flatFolders = useMemo(
    () => flattenFolders((folders ?? []) as FolderWithChildren[]),
    [folders]
  );

  // Handle folder selection
  const handleSelect = useCallback(
    (folderId: string | null, folderName: string | null) => {
      onFolderSelect(folderId, folderName);
      setOpen(false);
    },
    [onFolderSelect]
  );

  // Clear the filter
  const handleClearFilter = useCallback(() => {
    onFolderSelect(null, null);
  }, [onFolderSelect]);

  const hasActiveFilter = selectedFolderId !== null && selectedFolderName !== null;

  return (
    <div className="flex items-center gap-2">
      {/* Active filter badge */}
      {hasActiveFilter && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 max-w-[200px]"
        >
          <Folder className="h-3 w-3 shrink-0" />
          <span className="truncate">{selectedFolderName}</span>
          <button
            type="button"
            onClick={handleClearFilter}
            className="ml-1 p-0.5 hover:bg-muted rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Supprimer le filtre de dossier"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Filter button/popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            aria-label={hasActiveFilter ? "Modifier le filtre de dossier" : "Filtrer par dossier"}
          >
            <Filter className="h-3.5 w-3.5" />
            {!hasActiveFilter && <span>Filtrer</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Rechercher un dossier..." />
            <CommandList className="max-h-[300px]">
              {isLoading && (
                <div
                  className="flex items-center justify-center py-6"
                  role="status"
                  aria-label="Chargement des dossiers"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && (
                <>
                  <CommandEmpty>Aucun dossier trouvé</CommandEmpty>
                  <CommandGroup>
                    {/* Option to show all folders (clear filter) */}
                    <CommandItem
                      value="__all_folders__"
                      onSelect={() => handleSelect(null, null)}
                      className="gap-2"
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-muted-foreground">
                        Tous les dossiers
                      </span>
                    </CommandItem>

                    {/* Folders list with hierarchy */}
                    {flatFolders.map((folder) => (
                      <CommandItem
                        key={folder.id}
                        value={`${folder.id}:${folder.name}`}
                        onSelect={() => handleSelect(folder.id, folder.name)}
                        className="gap-2"
                      >
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${folder.depth * 12}px` }}
                        >
                          <Folder className="h-4 w-4 shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </div>
                      </CommandItem>
                    ))}

                    {flatFolders.length === 0 && !isLoading && (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Aucun dossier disponible
                      </div>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
