"use client";

/**
 * NoteTreeItem Component
 *
 * Displays a single note in the folder tree with navigation,
 * drag-and-drop support, and visual feedback for active state.
 *
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */

import { useState, useCallback, KeyboardEvent, DragEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FileText, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteInTree } from "../types";

export interface NoteTreeItemProps {
  /** The note to display */
  note: NoteInTree;
  /** Nesting depth (0 for root level) */
  depth?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A single note item in the folder tree with navigation and drag support.
 */
export function NoteTreeItem({ note, depth = 0, className }: NoteTreeItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDragging, setIsDragging] = useState(false);

  const isActive = pathname === `/notes/${note.id}`;

  const handleClick = useCallback(() => {
    router.push(`/notes/${note.id}`);
  }, [router, note.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        router.push(`/notes/${note.id}`);
      }
    },
    [router, note.id]
  );

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("application/x-note-id", note.id);
      e.dataTransfer.setData("text/plain", note.id);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [note.id]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      role="treeitem"
      aria-selected={isActive}
      aria-label={note.title || "Note sans titre"}
      tabIndex={0}
      draggable
      className={cn(
        "group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "transition-colors text-sm",
        isActive && "bg-accent text-accent-foreground font-medium",
        isDragging && "opacity-50 ring-2 ring-primary",
        className
      )}
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 min-w-0 truncate">{note.title || "Sans titre"}</span>
      {note.isFavorite && (
        <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
      )}
    </div>
  );
}
