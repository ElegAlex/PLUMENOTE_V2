"use client";

/**
 * CreateFolderDialog Component
 *
 * A dialog for creating new folders with name input and validation.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFolders } from "../hooks/useFolders";

export interface CreateFolderDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Parent folder ID (null for root level) */
  parentId?: string | null;
  /** Callback when folder is created successfully */
  onSuccess?: (folderId: string) => void;
}

/**
 * Dialog for creating a new folder
 */
export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId = null,
  onSuccess,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("Nouveau dossier");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { createFolderAsync, isCreating } = useFolders();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("Nouveau dossier");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      // Focus and select input after a brief delay for animation
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setError("Le nom du dossier est requis");
      return;
    }

    if (trimmedName.length > 255) {
      setError("Le nom ne peut pas dépasser 255 caractères");
      return;
    }

    try {
      const folder = await createFolderAsync({
        name: trimmedName,
        parentId,
      });
      onOpenChange(false);
      onSuccess?.(folder.id);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erreur lors de la création du dossier");
      }
    }
  }, [name, parentId, createFolderAsync, onOpenChange, onSuccess]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {parentId ? "Nouveau sous-dossier" : "Nouveau dossier"}
          </DialogTitle>
          <DialogDescription>
            {parentId
              ? "Créez un nouveau sous-dossier dans le dossier sélectionné."
              : "Créez un nouveau dossier pour organiser vos notes."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Nom du dossier</Label>
            <Input
              id="folder-name"
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nom du dossier"
              maxLength={255}
              disabled={isCreating}
              aria-describedby={error ? "folder-name-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p
                id="folder-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
