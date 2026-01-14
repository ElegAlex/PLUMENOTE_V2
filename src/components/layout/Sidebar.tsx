"use client";

/**
 * Sidebar Component
 *
 * Main navigation sidebar with folder tree and quick actions.
 * Collapsible on mobile with keyboard shortcut Ctrl+B.
 * Resizable width with persistence.
 *
 * @see Story 5.2: Création et Gestion des Dossiers
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeft,
  Home,
  FileText,
  Star,
  Search,
  Menu,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { NewNoteButton } from "@/features/templates/components/NewNoteButton";
import { FolderTree } from "@/features/notes/components/FolderTree";
import { ResizeHandle } from "./ResizeHandle";
import { CreateFolderDialog } from "@/features/notes/components/CreateFolderDialog";
import { DeleteFolderDialog } from "@/features/notes/components/DeleteFolderDialog";
import { useFolders } from "@/features/notes/hooks/useFolders";
import { useMoveNote } from "@/features/notes/hooks/useMoveNote";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { findFolderNameById } from "@/features/notes/utils/folderUtils";
import { WorkspaceNav } from "@/features/workspaces/components/WorkspaceNav";
import type { FolderWithCount, FolderWithChildren } from "@/features/notes/types";
import { cn } from "@/lib/utils";

// LocalStorage keys for sidebar state
const SIDEBAR_COLLAPSED_KEY = "plumenote:sidebar-collapsed";
const SIDEBAR_WIDTH_KEY = "plumenote:sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 256; // w-64 = 16rem = 256px
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;

export interface SidebarProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main navigation sidebar with folder tree
 */
export function Sidebar({ className }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load from localStorage on initial render
    if (typeof window !== "undefined") {
      try {
        const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
        if (savedWidth) {
          const width = parseInt(savedWidth, 10);
          if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
            return width;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogParentId, setCreateDialogParentId] = useState<
    string | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFolder, setDeleteFolder] = useState<FolderWithCount | null>(
    null
  );

  // Get folders for delete dialog (need counts)
  const { folders: foldersList } = useFolders({ tree: false });
  // Get folders as tree for finding folder names
  const { folders: foldersTree } = useFolders({ tree: true });
  // Hook for moving notes via drag-and-drop
  const { moveNoteAsync } = useMoveNote();

  // Load collapsed state from localStorage (using layoutEffect pattern for sync)
  useEffect(() => {
    const loadCollapsedState = () => {
      try {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved) {
          setIsCollapsed(JSON.parse(saved));
        }
      } catch {
        // Ignore storage errors
      }
    };
    loadCollapsedState();
  }, []);

  // Save collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [isCollapsed]);

  // Save sidebar width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // Ignore storage errors
    }
  }, [sidebarWidth]);

  // Handle sidebar resize
  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  // Keyboard shortcut Ctrl+B to toggle sidebar (or mobile sheet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        if (isMobile) {
          setIsMobileOpen((prev) => !prev);
        } else {
          setIsCollapsed((prev) => !prev);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  // Auto-close mobile sheet on navigation (using ref to avoid lint warning)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (isMobile && pathname !== prevPathnameRef.current) {
      // Use setTimeout to defer state update
      const timer = setTimeout(() => setIsMobileOpen(false), 0);
      prevPathnameRef.current = pathname;
      return () => clearTimeout(timer);
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isMobile]);

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleSelectFolder = useCallback(
    (folderId: string | null) => {
      setSelectedFolderId(folderId);
      if (folderId) {
        router.push(`/folders/${folderId}`);
      }
    },
    [router]
  );

  const handleCreateFolder = useCallback((parentId?: string | null) => {
    setCreateDialogParentId(parentId ?? null);
    setCreateDialogOpen(true);
  }, []);

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      // Find folder with counts from the flat list
      const folder = (foldersList as FolderWithCount[]).find(
        (f) => f.id === folderId
      );
      if (folder) {
        setDeleteFolder(folder);
        setDeleteDialogOpen(true);
      }
    },
    [foldersList]
  );

  const handleCreateSuccess = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    if (selectedFolderId === deleteFolder?.id) {
      setSelectedFolderId(null);
    }
    setDeleteFolder(null);
  }, [selectedFolderId, deleteFolder]);

  // Handle note drop on folder (drag-and-drop)
  const handleNoteDrop = useCallback(
    async (noteId: string, folderId: string) => {
      try {
        const result = await moveNoteAsync({ noteId, folderId });
        const folderName = findFolderNameById(foldersTree as unknown as FolderWithChildren[], folderId);

        toast.success(`Note déplacée vers "${folderName}"`, {
          action: {
            label: "Annuler",
            onClick: async () => {
              try {
                await moveNoteAsync({ noteId, folderId: result.previousFolderId });
                toast.success("Déplacement annulé");
              } catch {
                toast.error("Erreur lors de l'annulation");
              }
            },
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors du déplacement";
        toast.error(message);
      }
    },
    [moveNoteAsync, foldersTree]
  );

  const navItems = [
    {
      href: "/dashboard",
      label: "Accueil",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/notes",
      label: "Toutes les notes",
      icon: FileText,
      active: pathname === "/notes" || pathname?.startsWith("/notes/"),
    },
    {
      href: "/favorites",
      label: "Favoris",
      icon: Star,
      active: pathname === "/favorites",
    },
    {
      href: "/search",
      label: "Recherche",
      icon: Search,
      active: pathname === "/search",
    },
    {
      href: "/graph",
      label: "Graphe",
      icon: Network,
      active: pathname === "/graph",
    },
  ];

  // Shared sidebar content (used in both desktop and mobile)
  const sidebarContent = (showLabels: boolean) => (
    <>
      {/* Main navigation */}
      <nav className="flex flex-col gap-1 p-2" aria-label="Navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "transition-colors",
              item.active && "bg-accent text-accent-foreground"
            )}
            title={!showLabels ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {showLabels && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Quick action: New note */}
      <div className="px-2 pb-2">
        <NewNoteButton
          showLabel={showLabels}
          className="w-full justify-start"
        />
      </div>

      <Separator />

      {/* Folder tree */}
      {showLabels && (
        <div className="flex-1 overflow-y-auto py-2">
          <FolderTree
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onNoteDrop={handleNoteDrop}
          />
        </div>
      )}

      <Separator />

      {/* Workspaces navigation - Story 8.2 */}
      <WorkspaceNav showLabels={showLabels} />
    </>
  );

  return (
    <>
      {/* Mobile: Sheet drawer */}
      {isMobile ? (
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-3 left-3 z-40 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 flex flex-col"
            aria-label="Navigation principale"
          >
            {/* Mobile header */}
            <div className="flex h-14 items-center justify-between px-4 border-b">
              <span className="font-semibold">PlumenNote</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Fermer le menu"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            {sidebarContent(true)}
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Fixed sidebar */
        <aside
          className={cn(
            "relative flex flex-col border-r bg-muted/30 transition-all duration-200 hidden md:flex",
            isCollapsed && "w-14",
            className
          )}
          style={!isCollapsed ? { width: `${sidebarWidth}px` } : undefined}
          role="complementary"
          aria-label="Navigation principale"
          aria-hidden={isMobile}
        >
          {/* Resize handle (only when not collapsed) */}
          {!isCollapsed && (
            <ResizeHandle
              onResize={handleResize}
              currentWidth={sidebarWidth}
              minWidth={MIN_SIDEBAR_WIDTH}
              maxWidth={MAX_SIDEBAR_WIDTH}
            />
          )}
          {/* Toggle button */}
          <div className="flex h-14 items-center justify-end px-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              aria-label={isCollapsed ? "Ouvrir le panneau" : "Fermer le panneau"}
              title="Ctrl+B"
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
          {sidebarContent(!isCollapsed)}
        </aside>
      )}

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentId={createDialogParentId}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete folder dialog */}
      <DeleteFolderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        folder={deleteFolder}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
