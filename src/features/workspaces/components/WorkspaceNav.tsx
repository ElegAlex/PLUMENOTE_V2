"use client";

/**
 * Workspace Navigation Component
 *
 * Lists workspaces in the sidebar navigation.
 * Each workspace is a link that can be expanded to show its notes.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { ChevronRight, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "../hooks/useWorkspaces";

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
  building: LucideIcons.Building,
  layers: LucideIcons.Layers,
  box: LucideIcons.Box,
  archive: LucideIcons.Archive,
  star: LucideIcons.Star,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || LucideIcons.Folder;
}

export interface WorkspaceNavProps {
  /** Whether to show labels (false when sidebar is collapsed) */
  showLabels?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Workspace navigation skeleton
 */
function WorkspaceNavSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Workspace navigation list for sidebar
 *
 * Shows all workspaces the user has access to.
 * Links to /workspaces/[id] page.
 *
 * @example
 * ```tsx
 * <WorkspaceNav showLabels={!isCollapsed} />
 * ```
 */
export function WorkspaceNav({ showLabels = true, className }: WorkspaceNavProps) {
  const { data, isLoading, error } = useWorkspaces();
  const pathname = usePathname();

  if (!showLabels) {
    // When collapsed, just show icon
    return (
      <div className={cn("px-2", className)}>
        <Link
          href="/admin/workspaces"
          className={cn(
            "flex items-center justify-center rounded-md p-2",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-colors"
          )}
          title="Workspaces"
        >
          <FolderKanban className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("px-2 py-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Workspaces
          </span>
        </div>
        <WorkspaceNavSkeleton />
      </div>
    );
  }

  if (error) {
    return null; // Silently fail in nav
  }

  const workspaces = data?.data || [];

  if (workspaces.length === 0) {
    return null; // Don't show section if no workspaces
  }

  return (
    <div className={cn("px-2 py-2", className)} data-testid="workspace-nav">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-1">
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workspaces
        </span>
      </div>

      {/* Workspace list */}
      <nav className="mt-1 space-y-0.5" aria-label="Workspaces">
        {workspaces.map((workspace) => {
          const Icon = getIconComponent(workspace.icon);
          const isActive = pathname === `/workspaces/${workspace.id}`;

          return (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "transition-colors",
                isActive && "bg-accent text-accent-foreground"
              )}
              data-testid={`workspace-nav-item-${workspace.id}`}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{workspace.name}</span>
              {workspace.isPersonal && (
                <LucideIcons.Lock
                  className="h-3 w-3 text-muted-foreground ml-auto"
                  aria-label="Workspace personnel"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
