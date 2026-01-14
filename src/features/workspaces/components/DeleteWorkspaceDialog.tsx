"use client";

/**
 * Delete Workspace Dialog Component
 *
 * Confirmation dialog for deleting a workspace.
 * If workspace contains notes, requires selecting a target workspace
 * to move the notes before deletion.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useWorkspacesMutation } from "../hooks/useWorkspacesMutation";
import type { Workspace, WorkspaceWithCount } from "../types";

export interface DeleteWorkspaceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Workspace to delete */
  workspace: Workspace | WorkspaceWithCount | null;
}

/**
 * Delete workspace confirmation dialog
 *
 * Shows different content based on whether workspace has notes:
 * - Empty workspace: Simple confirmation
 * - Workspace with notes: Requires selecting target workspace
 *
 * @example
 * ```tsx
 * <DeleteWorkspaceDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   workspace={workspaceToDelete}
 * />
 * ```
 */
export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspace,
}: DeleteWorkspaceDialogProps) {
  const { data: workspacesData } = useWorkspaces();
  const { deleteWorkspaceAsync, isDeleting, moveNotesAsync, isMoving } =
    useWorkspacesMutation();
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>("");

  const noteCount =
    workspace && "_count" in workspace ? workspace._count?.notes ?? 0 : 0;
  const hasNotes = noteCount > 0;

  // Filter out the workspace being deleted from target options
  const availableTargets =
    workspacesData?.data.filter((w) => w.id !== workspace?.id) || [];

  const isProcessing = isDeleting || isMoving;

  const handleConfirmDelete = async () => {
    if (!workspace) return;

    try {
      if (hasNotes) {
        // Must move notes first
        if (!targetWorkspaceId) {
          toast.error("Veuillez selectionner un workspace de destination");
          return;
        }

        // Move notes to target workspace
        await moveNotesAsync({
          sourceId: workspace.id,
          targetId: targetWorkspaceId,
        });
        toast.success(`${noteCount} note(s) deplacee(s)`);
      }

      // Delete the workspace
      await deleteWorkspaceAsync(workspace.id);
      toast.success(`Workspace "${workspace.name}" supprime`);
      onOpenChange(false);
      setTargetWorkspaceId("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la suppression";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setTargetWorkspaceId("");
  };

  if (!workspace) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-workspace-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer le workspace
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Etes-vous sur de vouloir supprimer le workspace{" "}
                <strong>&quot;{workspace.name}&quot;</strong> ?
              </p>

              {hasNotes ? (
                <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-950">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Ce workspace contient {noteCount} note(s).
                  </p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    Vous devez choisir un workspace de destination pour deplacer
                    les notes avant de pouvoir supprimer ce workspace.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cette action est irreversible. Le workspace sera definitivement
                  supprime.
                </p>
              )}

              {hasNotes && (
                <div className="space-y-2">
                  <Label htmlFor="target-workspace">
                    Workspace de destination
                  </Label>
                  {availableTargets.length === 0 ? (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      Impossible de supprimer ce workspace : vous n&apos;avez pas
                      d&apos;autre workspace pour deplacer les {noteCount} note(s).
                      Creez d&apos;abord un autre workspace.
                    </div>
                  ) : (
                    <Select
                      value={targetWorkspaceId}
                      onValueChange={setTargetWorkspaceId}
                      disabled={isProcessing}
                    >
                      <SelectTrigger
                        id="target-workspace"
                        data-testid="target-workspace-select"
                      >
                        <SelectValue placeholder="Selectionner un workspace..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargets.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isProcessing}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isProcessing || (hasNotes && !targetWorkspaceId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="confirm-delete-button"
          >
            {isProcessing
              ? hasNotes
                ? "Deplacement..."
                : "Suppression..."
              : hasNotes
              ? "Deplacer et supprimer"
              : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
