"use client";

/**
 * NewNoteButton component
 *
 * Button with dropdown menu to create a new note:
 * - Note vide: Creates an empty note
 * - Depuis un template: Opens template selector dialog
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, FileStack, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { TemplateSelectorDialog } from "./TemplateSelectorDialog";
import { cn } from "@/lib/utils";

export interface NewNoteButtonProps {
  /** Show label text (default: true) */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
  /** Callback after note is created */
  onNoteCreated?: (noteId: string) => void;
}

/**
 * NewNoteButton component
 *
 * Provides options to create a note from scratch or from a template.
 */
export function NewNoteButton({
  showLabel = true,
  className,
  onNoteCreated,
}: NewNoteButtonProps) {
  const router = useRouter();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Create an empty note and navigate to it
   */
  const handleCreateEmptyNote = useCallback(() => {
    router.push("/notes/new");
  }, [router]);

  /**
   * Open the template selector dialog
   */
  const handleOpenTemplateDialog = useCallback(() => {
    setTemplateDialogOpen(true);
  }, []);

  /**
   * Create a note from template content
   */
  const handleSelectTemplate = useCallback(
    async (content: string) => {
      setIsCreating(true);
      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Sans titre",
            content: content,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Erreur lors de la création");
        }

        const { data: note } = await response.json();

        if (content) {
          toast.success("Note créée depuis le template");
        } else {
          toast.success("Nouvelle note créée");
        }

        onNoteCreated?.(note.id);
        router.push(`/notes/${note.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur lors de la création";
        toast.error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [router, onNoteCreated]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              "flex items-center gap-2",
              !showLabel && "px-3",
              className
            )}
            disabled={isCreating}
            aria-label="Créer une nouvelle note"
          >
            <Plus className="h-4 w-4" />
            {showLabel && <span>Nouvelle note</span>}
            {showLabel && <ChevronDown className="h-3 w-3 ml-1 opacity-70" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem
            onClick={handleCreateEmptyNote}
            className="cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span>Note vide</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleOpenTemplateDialog}
            className="cursor-pointer"
          >
            <FileStack className="h-4 w-4 mr-2" />
            <span>Depuis un template</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Template selector dialog */}
      <TemplateSelectorDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelect={handleSelectTemplate}
      />
    </>
  );
}
