"use client";

/**
 * Admin Workspaces Client Component
 *
 * Client-side component for workspaces management.
 * Handles state for dialogs and integrates with workspaces feature.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces (FR37)
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspaceList } from "@/features/workspaces/components/WorkspaceList";
import { WorkspaceDialog } from "@/features/workspaces/components/WorkspaceDialog";
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/DeleteWorkspaceDialog";
import type { Workspace, WorkspaceWithCount } from "@/features/workspaces/types";

/**
 * Client-side admin workspaces management UI
 *
 * Provides:
 * - Workspace list with edit/delete actions
 * - Create new workspace button
 * - Edit workspace dialog
 * - Delete confirmation dialog with note migration
 */
export function AdminWorkspacesClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    Workspace | WorkspaceWithCount | undefined
  >(undefined);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<
    Workspace | WorkspaceWithCount | null
  >(null);

  const handleCreateClick = () => {
    setSelectedWorkspace(undefined);
    setDialogOpen(true);
  };

  const handleEditClick = (workspace: Workspace | WorkspaceWithCount) => {
    setSelectedWorkspace(workspace);
    setDialogOpen(true);
  };

  const handleDeleteClick = (workspace: Workspace | WorkspaceWithCount) => {
    setWorkspaceToDelete(workspace);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Clear selection when dialog closes
      setSelectedWorkspace(undefined);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setWorkspaceToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription className="mt-1.5">
              Creez et gerez des espaces de travail pour organiser la
              documentation de votre equipe.
            </CardDescription>
          </div>
          <Button onClick={handleCreateClick} data-testid="create-workspace-button">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau workspace
          </Button>
        </CardHeader>
        <CardContent>
          <WorkspaceList onEdit={handleEditClick} onDelete={handleDeleteClick} />
        </CardContent>
      </Card>

      <WorkspaceDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        workspace={selectedWorkspace}
      />

      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        workspace={workspaceToDelete}
      />
    </div>
  );
}
