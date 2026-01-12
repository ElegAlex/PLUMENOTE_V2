"use client";

/**
 * NoteBreadcrumb Component
 *
 * Displays a breadcrumb navigation showing the folder hierarchy path
 * from root to the current note. Supports truncation for deep hierarchies
 * and provides clickable navigation to parent folders.
 *
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import React, { useMemo } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolderPath } from "../hooks/useFolderPath";
import type { Folder } from "../types";

export interface NoteBreadcrumbProps {
  /** The title of the current note */
  noteTitle: string;
  /** The folder ID the note belongs to, or null if at root */
  folderId: string | null;
  /** Additional CSS classes */
  className?: string;
}

/** Maximum visible folder items before truncation - desktop (excluding root and note) */
const MAX_VISIBLE_FOLDERS_DESKTOP = 2;

/** Maximum visible folder items before truncation - mobile */
const MAX_VISIBLE_FOLDERS_MOBILE = 1;

/** Maximum character length before truncating folder names */
const MAX_FOLDER_NAME_LENGTH = 20;

/**
 * Truncate a string if it exceeds the max length
 */
function truncateName(name: string, maxLength: number = MAX_FOLDER_NAME_LENGTH): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

/**
 * NoteBreadcrumb displays the folder hierarchy path from root to the current note.
 *
 * Features:
 * - Shows clickable navigation from root to current folder
 * - Truncates long paths with a dropdown for hidden items
 * - Shows tooltips for long folder names
 * - Displays loading skeleton while fetching
 * - Returns null for notes at root (no folder)
 *
 * @example
 * ```tsx
 * <NoteBreadcrumb
 *   noteTitle={note.title}
 *   folderId={note.folderId}
 * />
 * ```
 */
export function NoteBreadcrumb({
  noteTitle,
  folderId,
  className,
}: NoteBreadcrumbProps) {
  const { data: folderPath, isLoading, error } = useFolderPath(folderId);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Calculate visible and hidden items for truncation
  const { visibleFolders, hiddenFolders } = useMemo(() => {
    if (!folderPath || folderPath.length === 0) {
      return { visibleFolders: [], hiddenFolders: [] };
    }

    // Use fewer visible folders on mobile for better UX
    const maxVisible = isMobile ? MAX_VISIBLE_FOLDERS_MOBILE : MAX_VISIBLE_FOLDERS_DESKTOP;

    // If path is short enough, show all
    if (folderPath.length <= maxVisible) {
      return { visibleFolders: folderPath, hiddenFolders: [] };
    }

    // For longer paths: show first folder, hide middle, show last folder
    // Example: Root > A > B > C > D > Note becomes Root > A > ... > D > Note
    const first = folderPath[0];
    const last = folderPath[folderPath.length - 1];
    const middle = folderPath.slice(1, -1);

    return {
      visibleFolders: [first, last],
      hiddenFolders: middle,
    };
  }, [folderPath, isMobile]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)} aria-busy="true">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  // Error state or no folder (note at root) - don't show breadcrumb
  if (error || !folderId || !folderPath || folderPath.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <nav aria-label="Fil d'Ariane" className={className}>
        <Breadcrumb>
          <BreadcrumbList>
            {/* Root/Home link */}
            <BreadcrumbItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <BreadcrumbLink asChild>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Home className="h-4 w-4" />
                      <span className="sr-only">Accueil</span>
                    </Link>
                  </BreadcrumbLink>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Accueil</p>
                </TooltipContent>
              </Tooltip>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Hidden folders dropdown (if any) */}
            {hiddenFolders.length > 0 && (
              <>
                {/* First visible folder */}
                <BreadcrumbItem>
                  <FolderBreadcrumbLink folder={visibleFolders[0]} />
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {/* Ellipsis with dropdown for hidden folders */}
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex items-center gap-1 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      aria-label={`${hiddenFolders.length} dossiers masqués`}
                    >
                      <BreadcrumbEllipsis className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {hiddenFolders.map((folder) => (
                        <DropdownMenuItem key={folder.id} asChild>
                          <Link href={`/dashboard?folderId=${folder.id}`}>
                            {folder.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {/* Last visible folder (parent of note) */}
                <BreadcrumbItem>
                  <FolderBreadcrumbLink folder={visibleFolders[1]} />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}

            {/* All visible folders when no truncation needed */}
            {hiddenFolders.length === 0 &&
              visibleFolders.map((folder) => (
                <React.Fragment key={folder.id}>
                  <BreadcrumbItem>
                    <FolderBreadcrumbLink folder={folder} />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </React.Fragment>
              ))}

            {/* Current note (not clickable) */}
            <BreadcrumbItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <BreadcrumbPage className="max-w-[200px] truncate font-medium">
                    {truncateName(noteTitle, 30)}
                  </BreadcrumbPage>
                </TooltipTrigger>
                {noteTitle.length > 30 && (
                  <TooltipContent>
                    <p>{noteTitle}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>
    </TooltipProvider>
  );
}

/**
 * Internal component for folder links with tooltip
 */
function FolderBreadcrumbLink({ folder }: { folder: Folder }) {
  const displayName = truncateName(folder.name);
  const needsTooltip = folder.name.length > MAX_FOLDER_NAME_LENGTH;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BreadcrumbLink asChild>
          <Link
            href={`/dashboard?folderId=${folder.id}`}
            className="max-w-[150px] truncate hover:text-foreground"
          >
            {displayName}
          </Link>
        </BreadcrumbLink>
      </TooltipTrigger>
      {needsTooltip && (
        <TooltipContent>
          <p>{folder.name}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
