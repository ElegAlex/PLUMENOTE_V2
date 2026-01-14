"use client";

/**
 * Template Preview Component
 *
 * Displays rendered HTML content in a styled preview container.
 * Uses the same prose classes as the editor for consistency.
 * Content is sanitized with DOMPurify to prevent XSS attacks.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

export interface TemplatePreviewProps {
  /** HTML content to render */
  content: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Template content preview
 *
 * Renders HTML content with editor-consistent styling.
 * Empty content shows a placeholder message.
 *
 * @example
 * ```tsx
 * <TemplatePreview content="<h1>Title</h1><p>Content...</p>" />
 * ```
 */
export function TemplatePreview({ content, className }: TemplatePreviewProps) {
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!content || content === "<p></p>") {
      return "";
    }
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "ul", "ol", "li",
        "strong", "em", "u", "s", "code", "pre",
        "blockquote", "a", "img",
        "table", "thead", "tbody", "tr", "th", "td",
        "div", "span",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    });
  }, [content]);

  if (!sanitizedContent) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/50 p-4",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Aucun contenu a previsualiser
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[200px] rounded-lg border bg-background p-4",
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:font-semibold",
        "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
        "prose-h4:text-lg prose-h5:text-base prose-h6:text-sm",
        "prose-p:my-2 prose-p:leading-relaxed",
        "prose-ul:my-2 prose-ol:my-2",
        "prose-li:my-0.5",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
        "prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      aria-label="Apercu du template"
    />
  );
}
