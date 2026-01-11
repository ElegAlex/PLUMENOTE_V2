"use client";

/**
 * MoveToFolderDialog Component
 *
 * A dialog for selecting a folder to move a note to.
 * Uses Command component for searchable folder list.
 *
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import { useCallback, useMemo } from "react";
import { Folder, Home, Check, Loader2, AlertCircle } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useFolders } from "../hooks/useFolders";
import { flattenFolders } from "../utils/folderUtils";
import type { FolderWithChildren } from "../types";

export interface MoveToFolderDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The ID of the note to move */
  noteId: string;
  /** Current folder ID of the note (to disable in list) */
  currentFolderId?: string | null;
  /** Callback when a folder is selected */
  onSelect: (noteId: string, folderId: string | null) => void;
}

/**
 * Dialog for selecting a folder to move a note to
 */
export function MoveToFolderDialog({
  open,
  onOpenChange,
  noteId,
  currentFolderId,
  onSelect,
}: MoveToFolderDialogProps) {
  // Fetch folders as tree structure
  const { folders, isLoading, error } = useFolders({ tree: true });

  // Flatten for display
  const flatFolders = useMemo(
    () => flattenFolders(folders as FolderWithChildren[]),
    [folders]
  );

  const handleSelectRoot = useCallback(() => {
    onSelect(noteId, null);
    onOpenChange(false);
  }, [noteId, onSelect, onOpenChange]);

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      onSelect(noteId, folderId);
      onOpenChange(false);
    },
    [noteId, onSelect, onOpenChange]
  );

  // Check if note is at root
  const isAtRoot = currentFolderId === null || currentFolderId === undefined;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Déplacer vers..."
      description="Sélectionnez un dossier de destination pour la note"
    >
      <CommandInput placeholder="Rechercher un dossier..." />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">
              Erreur lors du chargement des dossiers
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <CommandEmpty>Aucun dossier trouvé.</CommandEmpty>
            <CommandGroup heading="Destination">
              {/* Root option */}
              <CommandItem
                value="__root__"
                onSelect={handleSelectRoot}
                disabled={isAtRoot}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="flex-1">Racine</span>
                {isAtRoot && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>

              {/* Folder options */}
              {flatFolders.map((folder) => {
                const isCurrentFolder = folder.id === currentFolderId;
                return (
                  <CommandItem
                    key={folder.id}
                    value={`${folder.id}:${folder.name}`}
                    onSelect={() => handleSelectFolder(folder.id)}
                    disabled={isCurrentFolder}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${folder.depth * 16}px` }}
                    >
                      <Folder className="h-4 w-4" />
                      <span>{folder.name}</span>
                    </div>
                    {isCurrentFolder && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </CommandItem>
                );
              })}

              {flatFolders.length === 0 && !isLoading && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Aucun dossier disponible. Créez d&apos;abord un dossier.
                </div>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
