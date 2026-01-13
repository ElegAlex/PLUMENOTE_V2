"use client";

/**
 * BacklinksPanel Component
 *
 * Sheet panel displaying notes that link TO the current note.
 * Shows loading skeleton, empty state, or list of backlinks.
 * Responsive: right side panel on desktop, bottom sheet on mobile.
 *
 * @see Story 6.7: Panneau Backlinks
 * @see AC: #1 - Liste des backlinks avec compteur
 * @see AC: #2 - Affiche titre, contexte
 * @see AC: #3 - Navigation vers note source
 * @see AC: #4 - Empty state avec CTA
 * @see AC: #5 - Skeleton loading
 * @see AC: #6 - Sheet latéral
 * @see AC: #7 - Responsive: bottom sheet mobile, side panel desktop
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useBacklinks } from "../hooks/useBacklinks";
import { BacklinkItem } from "./BacklinkItem";

/**
 * Hook to detect if viewport is mobile (<640px)
 * Uses sm breakpoint from Tailwind (640px)
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    setIsMobile(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export interface BacklinksPanelProps {
  /** Note ID to fetch backlinks for */
  noteId: string;
  /** Whether the panel is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Panel displaying backlinks for a note
 *
 * Uses Sheet component for slide-in behavior.
 * Only fetches backlinks when panel is open (enabled: open).
 *
 * @example
 * ```tsx
 * <BacklinksPanel
 *   noteId={note.id}
 *   open={showBacklinks}
 *   onOpenChange={setShowBacklinks}
 * />
 * ```
 */
export function BacklinksPanel({
  noteId,
  open,
  onOpenChange,
}: BacklinksPanelProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { backlinks, isLoading } = useBacklinks(noteId, { enabled: open });

  /**
   * Navigate to backlink source and close panel
   */
  const handleBacklinkClick = (backlinkId: string) => {
    onOpenChange(false);
    router.push(`/notes/${backlinkId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "h-[80vh] rounded-t-xl" : "w-[400px] sm:w-[540px]"}
        aria-describedby="backlinks-description"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" aria-hidden="true" />
            Backlinks
            {!isLoading && (
              <span
                className="text-sm font-normal text-muted-foreground"
                aria-label={`${backlinks.length} backlinks`}
              >
                ({backlinks.length})
              </span>
            )}
          </SheetTitle>
          <SheetDescription id="backlinks-description">
            Notes qui contiennent un lien vers cette note
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2" role="list" aria-label="Liste des backlinks">
          {isLoading ? (
            // Skeleton loading state
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : backlinks.length === 0 ? (
            // Empty state
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
              aria-live="polite"
            >
              <Link2
                className="h-12 w-12 text-muted-foreground/50 mb-4"
                aria-hidden="true"
              />
              <p className="text-muted-foreground mb-2">
                Aucune note ne pointe vers celle-ci
              </p>
              <p className="text-sm text-muted-foreground/70">
                Créez un lien avec{" "}
                <code className="bg-muted px-1 rounded">[[</code> depuis une
                autre note
              </p>
            </div>
          ) : (
            // Backlinks list
            backlinks.map((backlink) => (
              <BacklinkItem
                key={backlink.id}
                title={backlink.title}
                context={backlink.linkTitle}
                updatedAt={backlink.updatedAt}
                onClick={() => handleBacklinkClick(backlink.id)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
