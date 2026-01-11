"use client";

/**
 * FolderTree Component
 *
 * Displays a hierarchical tree of folders with expand/collapse state,
 * inline renaming, and folder management actions.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { useState, useEffect, useCallback } from "react";
import { FolderPlus, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useFolders, folderKeys } from "../hooks/useFolders";
import { FolderTreeItem } from "./FolderTreeItem";
import { cn } from "@/lib/utils";
import type { FolderWithChildren } from "../types";

// LocalStorage key for expanded folders state
const EXPANDED_FOLDERS_KEY = "plumenote:expanded-folders";

/**
 * Save expanded folder IDs to localStorage
 */
function saveExpandedFolders(expandedIds: Set<string>): void {
  try {
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify([...expandedIds]));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load expanded folder IDs from localStorage
 */
function loadExpandedFolders(): Set<string> {
  try {
    const stored = localStorage.getItem(EXPANDED_FOLDERS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore storage errors
  }
  return new Set();
}

export interface FolderTreeProps {
  /** Currently selected folder ID */
  selectedFolderId?: string | null;
  /** Callback when a folder is selected */
  onSelectFolder?: (folderId: string | null) => void;
  /** Callback when creating a folder (opens dialog) */
  onCreateFolder?: (parentId?: string | null) => void;
  /** Callback when requesting to delete a folder (opens confirmation) */
  onDeleteFolder?: (folderId: string) => void;
  /** Callback when a note is dropped on a folder */
  onNoteDrop?: (noteId: string, folderId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Folder tree component with hierarchical display and management
 */
export function FolderTree({
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onNoteDrop,
  className,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch folders as tree structure
  const {
    folders,
    isLoading,
    error,
    refetch,
  } = useFolders({ tree: true });

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const saved = loadExpandedFolders();
    if (saved.size > 0) {
      setExpandedIds(saved);
    }
  }, []);

  // Save expanded state when it changes
  useEffect(() => {
    saveExpandedFolders(expandedIds);
  }, [expandedIds]);

  const handleExpand = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (folderId: string) => {
      onSelectFolder?.(folderId);
    },
    [onSelectFolder]
  );

  const handleCreateSubfolder = useCallback(
    (parentId: string) => {
      // Expand the parent folder when creating a subfolder
      setExpandedIds((prev) => new Set(prev).add(parentId));
      onCreateFolder?.(parentId);
    },
    [onCreateFolder]
  );

  const handleCreateRootFolder = useCallback(() => {
    onCreateFolder?.(null);
  }, [onCreateFolder]);

  const handleRename = useCallback(
    async (folderId: string, newName: string) => {
      setRenamingFolderId(folderId);
      setRenameError(null);
      try {
        const response = await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Erreur lors du renommage");
        }
        // Invalidate folder queries to refresh the tree
        await queryClient.invalidateQueries({ queryKey: folderKeys.all });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors du renommage";
        setRenameError(errorMessage);
      } finally {
        setRenamingFolderId(null);
      }
    },
    [queryClient]
  );

  const handleDelete = useCallback(
    (folderId: string) => {
      onDeleteFolder?.(folderId);
    },
    [onDeleteFolder]
  );

  // Render recursive folder tree
  const renderFolders = useCallback(
    (folders: FolderWithChildren[], depth: number = 0) => {
      return folders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          depth={depth}
          isExpanded={expandedIds.has(folder.id)}
          isSelected={selectedFolderId === folder.id}
          onSelect={handleSelect}
          onExpand={handleExpand}
          onRename={handleRename}
          onDelete={handleDelete}
          onCreateSubfolder={handleCreateSubfolder}
          onNoteDrop={onNoteDrop}
          isRenaming={renamingFolderId === folder.id}
        />
      ));
    },
    [
      expandedIds,
      selectedFolderId,
      handleSelect,
      handleExpand,
      handleRename,
      handleDelete,
      handleCreateSubfolder,
      onNoteDrop,
      renamingFolderId,
    ]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-2 p-2", className)} role="tree" aria-busy="true">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4 ml-4" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-2/3 ml-4" />
        <Skeleton className="h-7 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground mb-3">
          Erreur lors du chargement des dossiers
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  // Empty state
  if (folders.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-muted-foreground mb-3">
          Aucun dossier pour l&apos;instant
        </p>
        {onCreateFolder && (
          <Button variant="outline" size="sm" onClick={handleCreateRootFolder}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Créer un dossier
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Header with create button */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dossiers
        </span>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCreateRootFolder}
            aria-label="Nouveau dossier"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Folder tree */}
      <div role="tree" aria-label="Dossiers">
        {renderFolders(folders as FolderWithChildren[])}
      </div>
    </div>
  );
}
