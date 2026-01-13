"use client";

/**
 * InternalLinkView Component
 *
 * React NodeView for rendering internal wiki links [[Note Title]]
 * with hover preview tooltip and click navigation.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotePreview {
  title: string;
  content: string;
}

export function InternalLinkView({ node, extension }: NodeViewProps) {
  const router = useRouter();
  const { noteId, title } = node.attrs;
  const [preview, setPreview] = useState<NotePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get callbacks from extension options
  const onNavigate = extension.options?.onNavigate;
  const onFetchPreview = extension.options?.onFetchPreview;

  // Handle click navigation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!noteId) {
        setError("Note introuvable");
        return;
      }

      if (onNavigate) {
        onNavigate(noteId);
      } else {
        // Default navigation using Next.js router
        router.push(`/notes/${noteId}`);
      }
    },
    [noteId, onNavigate, router]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent);
      }
    },
    [handleClick]
  );

  // Fetch preview on hover
  const handleMouseEnter = useCallback(async () => {
    if (!noteId || preview || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (onFetchPreview) {
        const result = await onFetchPreview(noteId);
        if (result) {
          setPreview(result);
        } else {
          setError("Note introuvable");
        }
      } else {
        // Default fetch using API
        const response = await fetch(`/api/notes/${noteId}`);
        if (response.ok) {
          const { data } = await response.json();
          setPreview({
            title: data.title || title,
            content: data.content?.substring(0, 150) || "",
          });
        } else if (response.status === 404) {
          setError("Note introuvable");
        } else {
          setError("Erreur de chargement");
        }
      }
    } catch {
      setError("Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [noteId, preview, isLoading, onFetchPreview, title]);

  // Reset error when noteId changes
  useEffect(() => {
    setError(null);
    setPreview(null);
  }, [noteId]);

  const isBroken = !!error;

  return (
    <NodeViewWrapper as="span" className="inline">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="link"
              tabIndex={0}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onMouseEnter={handleMouseEnter}
              className={cn(
                "internal-link cursor-pointer rounded px-1 py-0.5 transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                isBroken
                  ? "bg-destructive/10 text-destructive line-through opacity-70"
                  : "bg-primary/10 text-primary hover:bg-primary/20 hover:underline"
              )}
              data-internal-link=""
              data-note-id={noteId}
              data-title={title}
              data-broken={isBroken ? "true" : undefined}
              aria-label={isBroken ? `Lien cassé: ${title}` : `Lien vers: ${title}`}
            >
              [[{title}]]
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            className="max-w-xs"
            sideOffset={5}
          >
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 animate-pulse" />
                <span>Chargement...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {preview && !error && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{preview.title}</span>
                </div>
                {preview.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {preview.content}...
                  </p>
                )}
              </div>
            )}
            {!isLoading && !error && !preview && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>{title}</span>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </NodeViewWrapper>
  );
}

export default InternalLinkView;
