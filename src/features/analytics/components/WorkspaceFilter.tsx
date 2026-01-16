"use client";

/**
 * WorkspaceFilter Component
 *
 * Dropdown filter to select a workspace for statistics filtering.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 * @see AC #7 - Filter statistics by workspace
 */

import { FolderKanban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";

export interface WorkspaceFilterProps {
  /** Currently selected workspace ID (null for all) */
  value: string | null;
  /** Callback when workspace selection changes */
  onChange: (workspaceId: string | null) => void;
}

/**
 * Workspace filter dropdown component
 */
export function WorkspaceFilter({ value, onChange }: WorkspaceFilterProps) {
  const { data, isLoading } = useWorkspaces();

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  const workspaces = data?.data ?? [];

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(val) => onChange(val === "all" ? null : val)}
    >
      <SelectTrigger className="w-48">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4" aria-hidden="true" />
          <SelectValue placeholder="Tous les workspaces" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les workspaces</SelectItem>
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.id} value={workspace.id}>
            {workspace.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
