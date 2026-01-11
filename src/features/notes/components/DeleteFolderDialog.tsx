"use client";

/**
 * DeleteFolderDialog Component
 *
 * A confirmation dialog for deleting folders with content warning.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Loader2, Folder, FileText } from "lucide-react";
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
import { useFolders } from "../hooks/useFolders";
import type { FolderWithCount } from "../types";

export interface DeleteFolderDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The folder to delete (with counts for warning) */
  folder: FolderWithCount | null;
  /** Callback when folder is deleted successfully */
  onSuccess?: () => void;
}

/**
 * Confirmation dialog for deleting a folder
 */
export function DeleteFolderDialog({
  open,
  onOpenChange,
  folder,
  onSuccess,
}: DeleteFolderDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const { deleteFolderAsync, isDeleting } = useFolders();

  const hasContent =
    folder && (folder._count.notes > 0 || folder._count.children > 0);

  // Reset error when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
    }
  }, [open]);

  const handleDelete = useCallback(async () => {
    if (!folder) return;

    try {
      await deleteFolderAsync(folder.id);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erreur lors de la suppression du dossier");
      }
    }
  }, [folder, deleteFolderAsync, onOpenChange, onSuccess]);

  if (!folder) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasContent && (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Supprimer le dossier
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Êtes-vous sûr de vouloir supprimer le dossier{" "}
                <strong className="text-foreground">{folder.name}</strong> ?
              </p>

              {hasContent && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                  <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                    Ce dossier contient :
                  </p>
                  <ul className="text-amber-700 dark:text-amber-300 text-sm space-y-1">
                    {folder._count.notes > 0 && (
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {folder._count.notes} note
                        {folder._count.notes > 1 ? "s" : ""}
                      </li>
                    )}
                    {folder._count.children > 0 && (
                      <li className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder._count.children} sous-dossier
                        {folder._count.children > 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                    Les notes et sous-dossiers seront déplacés vers le dossier
                    parent.
                  </p>
                </div>
              )}

              {!hasContent && (
                <p className="text-sm text-muted-foreground">
                  Ce dossier est vide et sera supprimé définitivement.
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
