"use client";

/**
 * VersionPreview Component
 *
 * Displays a version's content in read-only mode.
 * Shows header with version info and rendered Markdown content.
 * Supports toggle between content view and diff view.
 * Provides restore functionality to revert to this version.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see Story 9.3: Restauration de Version
 * @see AC: #4 - Prévisualisation du contenu en lecture seule
 * @see AC: #5 - Contenu Markdown rendu
 * @see AC: #6 - Diff visuel entre version sélectionnée et actuelle
 */

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import { Eye, GitCompare, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { VersionDiff } from "./VersionDiff";
import { RestoreVersionDialog } from "./RestoreVersionDialog";
import { useRestoreVersion } from "../hooks/useRestoreVersion";
import type { NoteVersion } from "../types";

export interface VersionPreviewProps {
  /** Version to preview */
  version: NoteVersion;
  /** Current note content for diff comparison */
  currentContent?: string | null;
  /** Note ID (required for restore functionality) */
  noteId?: string;
  /** Current version number (to disable restore for current version) */
  currentVersionNumber?: number;
  /** Author name for the version */
  versionAuthor?: string | null;
  /** Callback after successful restoration */
  onRestoreSuccess?: () => void;
}

/**
 * View mode for the preview
 */
type ViewMode = "content" | "diff";

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Simple Markdown renderer for preview
 *
 * This is a basic renderer that handles common Markdown patterns.
 * For full Markdown support, consider using the editor's read-only mode.
 */
function renderMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-muted p-3 rounded-md overflow-x-auto my-2"><code>$2</code></pre>'
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$2</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');
}

/**
 * Preview of a version's content with restore capability
 *
 * @example
 * ```tsx
 * <VersionPreview
 *   version={selectedVersion}
 *   currentContent={note.content}
 *   noteId={note.id}
 *   currentVersionNumber={latestVersion}
 *   versionAuthor={version.createdBy?.name}
 *   onRestoreSuccess={() => closePanel()}
 * />
 * ```
 */
export function VersionPreview({
  version,
  currentContent,
  noteId,
  currentVersionNumber,
  versionAuthor,
  onRestoreSuccess,
}: VersionPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("content");
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Restore hook - only initialize if noteId is provided
  const { restore, isRestoring } = useRestoreVersion({
    noteId: noteId ?? "",
    onSuccess: () => {
      setShowRestoreDialog(false);
      onRestoreSuccess?.();
    },
  });

  // Check if restore is possible
  const canRestore = noteId && version.version !== currentVersionNumber;

  // Memoize the rendered and sanitized Markdown
  const sanitizedContent = useMemo(() => {
    if (!version.content) return null;
    const rendered = renderMarkdown(version.content);
    // Sanitize to prevent XSS attacks
    return DOMPurify.sanitize(rendered, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "strong", "em", "code", "pre",
        "ul", "ol", "li", "a", "blockquote",
      ],
      ALLOWED_ATTR: ["href", "class", "target", "rel"],
    });
  }, [version.content]);

  // Check if diff is available
  const hasDiff = !!currentContent && !!version.content;

  return (
    <div className="flex flex-col h-full">
      {/* Version header */}
      <div className="space-y-3 mb-4">
        {/* Version badge and date */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            v{version.version}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(version.createdAt)}
          </span>
        </div>

        {/* Title if different from current */}
        {version.title && (
          <h3 className="font-medium text-lg">{version.title}</h3>
        )}
      </div>

      <Separator className="my-2" />

      {/* View mode toggle */}
      {hasDiff && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === "content" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("content")}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Contenu
          </Button>
          <Button
            variant={viewMode === "diff" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("diff")}
            className="flex-1"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Diff
          </Button>
        </div>
      )}

      {/* Content area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto rounded-md border p-4",
          "prose prose-sm dark:prose-invert max-w-none"
        )}
        role="article"
        aria-label={`Contenu de la version ${version.version}`}
      >
        {viewMode === "content" ? (
          // Render sanitized Markdown content
          sanitizedContent ? (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          ) : (
            <p className="text-muted-foreground italic">
              Contenu non disponible
            </p>
          )
        ) : (
          // Render diff
          <VersionDiff
            oldContent={version.content ?? ""}
            newContent={currentContent ?? ""}
          />
        )}
      </div>

      {/* Restore button and footer */}
      <div className="mt-4 space-y-3">
        {canRestore && (
          <Button
            onClick={() => setShowRestoreDialog(true)}
            className="w-full gap-2"
            variant="default"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurer cette version
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {canRestore
            ? "Cliquez pour restaurer cette version"
            : "Cette version est en lecture seule"}
        </p>
      </div>

      {/* Restore confirmation dialog */}
      {noteId && (
        <RestoreVersionDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
          versionNumber={version.version}
          versionDate={version.createdAt}
          versionAuthor={versionAuthor}
          onConfirm={() => restore(version.id)}
          isRestoring={isRestoring}
        />
      )}
    </div>
  );
}
