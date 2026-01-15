"use client";

/**
 * FolderTreeItem Component
 *
 * Displays a single folder in the folder tree with expand/collapse,
 * inline renaming, context menu actions, and drop zone for notes.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, DragEvent } from "react";
import Link from "next/link";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderPlus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NoteTreeItem } from "./NoteTreeItem";
import type { FolderWithChildren, FolderWithNotesTree } from "../types";

/** Folder type that may or may not have notes */
type FolderTreeNode = FolderWithChildren | FolderWithNotesTree;

export interface FolderTreeItemProps {
  /** The folder to display (may include notes) */
  folder: FolderTreeNode;
  /** Nesting depth (0 for root level) */
  depth?: number;
  /** Whether the folder is expanded */
  isExpanded?: boolean;
  /** Whether the folder is selected */
  isSelected?: boolean;
  /** Set of expanded folder IDs (for recursive rendering) */
  expandedIds?: Set<string>;
  /** Currently selected folder ID (for recursive rendering) */
  selectedFolderId?: string | null;
  /** Callback when folder is clicked */
  onSelect?: (folderId: string) => void;
  /** Callback when expand/collapse is toggled */
  onExpand?: (folderId: string) => void;
  /** Callback when folder is renamed */
  onRename?: (folderId: string, newName: string) => void;
  /** Callback when folder is deleted */
  onDelete?: (folderId: string) => void;
  /** Callback when creating a subfolder */
  onCreateSubfolder?: (parentId: string) => void;
  /** Callback when a note is dropped on this folder */
  onNoteDrop?: (noteId: string, folderId: string) => void;
  /** Whether rename is in progress */
  isRenaming?: boolean;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A single folder item in the folder tree with expand/collapse,
 * inline rename, and context menu actions.
 */
export function FolderTreeItem({
  folder,
  depth = 0,
  isExpanded = false,
  isSelected = false,
  expandedIds,
  selectedFolderId,
  onSelect,
  onExpand,
  onRename,
  onDelete,
  onCreateSubfolder,
  onNoteDrop,
  isRenaming = false,
  isDeleting = false,
  className,
}: FolderTreeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(folder.name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const hasChildren = folder.children && folder.children.length > 0;
  const hasNotes = "notes" in folder && folder.notes && folder.notes.length > 0;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onSelect?.(folder.id);
    }
  }, [isEditing, onSelect, folder.id]);

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onExpand?.(folder.id);
    },
    [onExpand, folder.id]
  );

  const handleDoubleClick = useCallback(() => {
    if (onRename) {
      // Reset edit value to current folder name when starting edit
      setEditValue(folder.name);
      setIsEditing(true);
    }
  }, [onRename, folder.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== folder.name) {
      onRename?.(folder.id, trimmedValue);
    }
    setIsEditing(false);
  }, [editValue, folder.id, folder.name, onRename]);

  const handleRenameCancel = useCallback(() => {
    setEditValue(folder.name);
    setIsEditing(false);
  }, [folder.name]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleRenameSubmit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleRenameCancel();
        }
        return;
      }

      // Keyboard navigation when not editing
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect?.(folder.id);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasChildren && !isExpanded) {
            onExpand?.(folder.id);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasChildren && isExpanded) {
            onExpand?.(folder.id);
          }
          break;
        case "F2":
          e.preventDefault();
          if (onRename) {
            setEditValue(folder.name);
            setIsEditing(true);
          }
          break;
        case "Delete":
          e.preventDefault();
          onDelete?.(folder.id);
          break;
      }
    },
    [
      isEditing,
      handleRenameSubmit,
      handleRenameCancel,
      hasChildren,
      isExpanded,
      onSelect,
      onExpand,
      onRename,
      onDelete,
      folder.id,
      folder.name,
    ]
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleRenameCancel();
      }
    },
    [handleRenameSubmit, handleRenameCancel]
  );

  const handleInputBlur = useCallback(() => {
    handleRenameSubmit();
  }, [handleRenameSubmit]);

  const startRename = useCallback(() => {
    // Reset edit value to current folder name when starting edit from menu
    setEditValue(folder.name);
    setIsEditing(true);
  }, [folder.name]);

  const handleCreateSubfolder = useCallback(() => {
    onCreateSubfolder?.(folder.id);
  }, [onCreateSubfolder, folder.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(folder.id);
  }, [onDelete, folder.id]);

  // Drop zone handlers for receiving notes
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only accept note drops
    if (e.dataTransfer.types.includes("application/x-note-id") || e.dataTransfer.types.includes("text/plain")) {
      setIsDropTarget(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only reset if leaving the current element (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDropTarget(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(false);

    const noteId = e.dataTransfer.getData("application/x-note-id") || e.dataTransfer.getData("text/plain");
    if (noteId && onNoteDrop) {
      onNoteDrop(noteId, folder.id);
    }
  }, [onNoteDrop, folder.id]);

  return (
    <div className={className}>
      {/* Folder item row */}
      <div
        ref={itemRef}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={folder.name}
        tabIndex={0}
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer select-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          isSelected && "bg-accent text-accent-foreground",
          isEditing && "bg-muted",
          isDeleting && "opacity-50 pointer-events-none",
          isRenaming && "opacity-75",
          isDropTarget && "bg-primary/20 ring-2 ring-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onDragOver={onNoteDrop ? handleDragOver : undefined}
        onDragEnter={onNoteDrop ? handleDragEnter : undefined}
        onDragLeave={onNoteDrop ? handleDragLeave : undefined}
        onDrop={onNoteDrop ? handleDrop : undefined}
      >
        {/* Expand/collapse chevron */}
        <button
          type="button"
          className={cn(
            "shrink-0 h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-accent-foreground/10",
            !hasChildren && !hasNotes && "invisible"
          )}
          onClick={handleExpandClick}
          tabIndex={-1}
          aria-hidden={!hasChildren}
          aria-label={isExpanded ? "Réduire" : "Développer"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Folder icon */}
        <span className="shrink-0">
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
        </span>

        {/* Folder name or edit input */}
        {isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="h-6 py-0 px-1 text-sm flex-1 min-w-0"
            aria-label="Nouveau nom du dossier"
            maxLength={255}
          />
        ) : (
          <span className="flex-1 min-w-0 text-sm truncate">{folder.name}</span>
        )}

        {/* Actions menu */}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Actions du dossier"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateSubfolder && (
                <DropdownMenuItem onClick={handleCreateSubfolder}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nouveau sous-dossier
                </DropdownMenuItem>
              )}
              {onRename && (
                <DropdownMenuItem onClick={startRename}>
                  <Edit className="mr-2 h-4 w-4" />
                  Renommer
                </DropdownMenuItem>
              )}
              {/* Permissions link for workspace folders (Story 8.4) */}
              {folder.workspaceId && (
                <DropdownMenuItem asChild>
                  <Link href={`/folders/${folder.id}/permissions`}>
                    <Shield className="mr-2 h-4 w-4" />
                    Permissions
                  </Link>
                </DropdownMenuItem>
              )}
              {(onCreateSubfolder || onRename || folder.workspaceId) && onDelete && (
                <DropdownMenuSeparator />
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Render children and notes recursively if expanded */}
      {isExpanded && (hasChildren || hasNotes) && (
        <div role="group" aria-label={`Contenu de ${folder.name}`}>
          {/* Subfolders first */}
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              isExpanded={expandedIds ? expandedIds.has(child.id) : false}
              isSelected={selectedFolderId === child.id}
              expandedIds={expandedIds}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onExpand={onExpand}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              onNoteDrop={onNoteDrop}
              isRenaming={isRenaming}
              isDeleting={isDeleting}
            />
          ))}
          {/* Notes after subfolders */}
          {hasNotes &&
            (folder as FolderWithNotesTree).notes.map((note) => (
              <NoteTreeItem key={note.id} note={note} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}
