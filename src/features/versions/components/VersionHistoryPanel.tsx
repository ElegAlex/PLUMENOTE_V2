"use client";

/**
 * VersionHistoryPanel Component
 *
 * Sheet panel displaying version history for a note.
 * Shows loading skeleton, empty state, or grouped version list.
 * Supports version preview when a version is selected.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #1 - Panneau latéral avec liste des versions
 * @see AC: #7 - Pagination avec "Charger plus"
 * @see AC: #8 - Skeleton loaders pendant le chargement
 * @see AC: #9 - Message vide si aucune version
 * @see AC: #10 - Fermeture sur Escape
 */

import { useState, useEffect } from "react";
import { History, ChevronLeft, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useVersionHistory } from "../hooks/useVersionHistory";
import { useVersionDetail } from "../hooks/useVersionDetail";
import { VersionDayGroup } from "./VersionDayGroup";
import { VersionPreview } from "./VersionPreview";
import type { NoteVersionSummary } from "../types";

export interface VersionHistoryPanelProps {
  /** Note ID to fetch versions for */
  noteId: string;
  /** Current note content for diff comparison */
  currentContent?: string | null;
  /** Whether the panel is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Hook to detect if viewport is mobile (<640px)
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize with actual value if window is available (client-side)
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 639px)").matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

/**
 * Loading skeleton for version history
 */
function VersionHistorySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement de l'historique">
      {/* Day separator skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-px flex-1" />
      </div>
      {/* Version items skeleton */}
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      {/* Another day group */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-px flex-1" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

/**
 * Empty state when no versions exist
 */
function VersionHistoryEmpty() {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <History
        className="h-12 w-12 text-muted-foreground/50 mb-4"
        aria-hidden="true"
      />
      <p className="text-muted-foreground mb-2">
        Aucune version enregistrée
      </p>
      <p className="text-sm text-muted-foreground/70">
        Les versions sont créées automatiquement pendant l&apos;édition
      </p>
    </div>
  );
}

/**
 * Panel displaying version history for a note
 *
 * Uses Sheet component for slide-in behavior.
 * Only fetches versions when panel is open.
 *
 * @example
 * ```tsx
 * <VersionHistoryPanel
 *   noteId={note.id}
 *   currentContent={note.content}
 *   open={showHistory}
 *   onOpenChange={setShowHistory}
 * />
 * ```
 */
export function VersionHistoryPanel({
  noteId,
  currentContent,
  open,
  onOpenChange,
}: VersionHistoryPanelProps) {
  const isMobile = useIsMobile();
  const [selectedVersion, setSelectedVersion] =
    useState<NoteVersionSummary | null>(null);

  // Fetch version history
  const {
    versions,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useVersionHistory(noteId, { enabled: open });

  // Fetch selected version detail
  const { version: versionDetail, isLoading: isLoadingDetail } =
    useVersionDetail(noteId, selectedVersion?.id, {
      enabled: !!selectedVersion,
    });

  /**
   * Handle panel open state change
   * Reset selection when panel closes
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedVersion(null);
    }
    onOpenChange(newOpen);
  };

  /**
   * Handle version selection
   */
  const handleVersionSelect = (version: NoteVersionSummary) => {
    setSelectedVersion(version);
  };

  /**
   * Handle back to list
   */
  const handleBackToList = () => {
    setSelectedVersion(null);
  };

  // Determine what to render inside the panel
  const renderContent = () => {
    // Show version preview if a version is selected
    if (selectedVersion) {
      return (
        <div className="flex flex-col h-full">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="self-start mb-4 -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour à la liste
          </Button>

          {/* Preview */}
          {isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versionDetail ? (
            <VersionPreview
              version={versionDetail}
              currentContent={currentContent}
            />
          ) : (
            <p className="text-muted-foreground">
              Impossible de charger la version
            </p>
          )}
        </div>
      );
    }

    // Show loading skeleton
    if (isLoading) {
      return <VersionHistorySkeleton />;
    }

    // Show empty state
    if (versions.length === 0) {
      return <VersionHistoryEmpty />;
    }

    // Show version list grouped by day
    return (
      <div className="flex flex-col h-full">
        <VersionDayGroup
          versions={versions}
          selectedVersionId={selectedVersion?.id}
          onVersionSelect={handleVersionSelect}
        />

        {/* Load more button */}
        {hasNextPage && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              "Charger plus"
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "h-[85vh] rounded-t-xl overflow-y-auto"
            : "w-[400px] sm:w-[540px] overflow-y-auto"
        }
        aria-describedby="version-history-description"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Historique des versions
            {!isLoading && !selectedVersion && (
              <span
                className="text-sm font-normal text-muted-foreground"
                aria-label={`${total} versions`}
              >
                ({total})
              </span>
            )}
          </SheetTitle>
          <SheetDescription id="version-history-description">
            {selectedVersion
              ? `Prévisualisation de la version ${selectedVersion.version}`
              : "Consultez et comparez les versions de cette note"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
