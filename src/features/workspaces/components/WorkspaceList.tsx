"use client";

/**
 * Workspace List Component
 *
 * Displays a list of workspaces with actions for admin management.
 * Shows personal badge for personal workspaces and note count.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspaces } from "../hooks/useWorkspaces";
import type { Workspace, WorkspaceWithCount } from "../types";

/**
 * Icon map for workspace icons
 */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: LucideIcons.Folder,
  briefcase: LucideIcons.Briefcase,
  users: LucideIcons.Users,
  book: LucideIcons.Book,
  code: LucideIcons.Code,
  server: LucideIcons.Server,
  database: LucideIcons.Database,
  globe: LucideIcons.Globe,
  settings: LucideIcons.Settings,
  home: LucideIcons.Home,
  "file-text": LucideIcons.FileText,
};

/**
 * Get icon component by name
 */
function getIconComponent(iconName: string) {
  return iconMap[iconName] || LucideIcons.Folder;
}

export interface WorkspaceListProps {
  /** Callback when edit is clicked */
  onEdit: (workspace: Workspace | WorkspaceWithCount) => void;
  /** Callback when delete is clicked */
  onDelete: (workspace: Workspace | WorkspaceWithCount) => void;
}

/**
 * Workspace list loading skeleton
 */
function WorkspaceListSkeleton() {
  return (
    <div className="space-y-3" data-testid="workspace-list-skeleton">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single workspace item row
 */
function WorkspaceItem({
  workspace,
  onEdit,
  onDelete,
}: {
  workspace: Workspace | WorkspaceWithCount;
  onEdit: (workspace: Workspace | WorkspaceWithCount) => void;
  onDelete: (workspace: Workspace | WorkspaceWithCount) => void;
}) {
  const IconComponent = getIconComponent(workspace.icon);
  const noteCount = "_count" in workspace ? workspace._count?.notes ?? 0 : null;

  return (
    <div
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
      data-testid={`workspace-item-${workspace.id}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{workspace.name}</h3>
            {workspace.isPersonal && (
              <Badge variant="secondary" className="text-xs">
                Personnel
              </Badge>
            )}
            {noteCount !== null && noteCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {noteCount} note{noteCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {workspace.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(workspace)}
                aria-label={`Modifier ${workspace.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Modifier</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(workspace)}
                  aria-label={`Supprimer ${workspace.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Supprimer</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * Workspace list with CRUD actions
 *
 * Displays all workspaces with edit and delete buttons.
 *
 * @example
 * ```tsx
 * <WorkspaceList
 *   onEdit={(w) => openEditDialog(w)}
 *   onDelete={(w) => openDeleteDialog(w)}
 * />
 * ```
 */
export function WorkspaceList({ onEdit, onDelete }: WorkspaceListProps) {
  const { data, isLoading, error } = useWorkspaces();

  if (isLoading) {
    return <WorkspaceListSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        data-testid="workspace-list-error"
      >
        Erreur lors du chargement des workspaces: {error.message}
      </div>
    );
  }

  const workspaces = data?.data || [];

  if (workspaces.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
        data-testid="workspace-list-empty"
      >
        <LucideIcons.FolderOpen className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">Aucun workspace cree</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cliquez sur &quot;Nouveau workspace&quot; pour commencer
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      role="list"
      aria-label="Liste des workspaces"
      data-testid="workspace-list"
    >
      {workspaces.map((workspace) => (
        <WorkspaceItem
          key={workspace.id}
          workspace={workspace}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
