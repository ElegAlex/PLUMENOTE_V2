"use client";

/**
 * Workspace Dialog Component
 *
 * Modal dialog for creating and editing workspaces.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceForm } from "./WorkspaceForm";
import { useWorkspacesMutation } from "../hooks/useWorkspacesMutation";
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from "../types";

export interface WorkspaceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Workspace to edit (undefined for create mode) */
  workspace?: Workspace;
}

/**
 * Workspace create/edit dialog
 *
 * Opens a modal with form fields for workspace creation/editing.
 * Handles create and update operations with toast notifications.
 *
 * @example
 * ```tsx
 * // Create mode
 * <WorkspaceDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 * />
 *
 * // Edit mode
 * <WorkspaceDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   workspace={selectedWorkspace}
 * />
 * ```
 */
export function WorkspaceDialog({
  open,
  onOpenChange,
  workspace,
}: WorkspaceDialogProps) {
  const isEditMode = Boolean(workspace);
  const {
    createWorkspaceAsync,
    isCreating,
    updateWorkspaceAsync,
    isUpdating,
  } = useWorkspacesMutation();

  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = async (
    data: CreateWorkspaceInput | UpdateWorkspaceInput
  ) => {
    try {
      if (isEditMode && workspace) {
        await updateWorkspaceAsync({ id: workspace.id, data });
        toast.success(`Workspace "${data.name || workspace.name}" mis a jour`);
      } else {
        await createWorkspaceAsync(data as CreateWorkspaceInput);
        toast.success(`Workspace "${data.name}" cree`);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Erreur lors de la mise a jour"
          : "Erreur lors de la creation";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        data-testid="workspace-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier le workspace" : "Nouveau workspace"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations du workspace."
              : "Creez un nouvel espace de travail pour votre equipe."}
          </DialogDescription>
        </DialogHeader>

        <WorkspaceForm
          workspace={workspace}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
