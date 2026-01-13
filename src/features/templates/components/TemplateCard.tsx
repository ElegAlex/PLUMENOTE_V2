"use client";

/**
 * TemplateCard component
 *
 * Displays a template with icon, name, description, and content preview.
 * Used in TemplateSelectorDialog for template selection.
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { useCallback } from "react";
import {
  Server,
  ListChecks,
  FileText,
  BookOpen,
  Users,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Template } from "../types";

/**
 * Map of icon names to Lucide components
 */
const iconMap: Record<string, LucideIcon> = {
  server: Server,
  "list-checks": ListChecks,
  "file-text": FileText,
  "book-open": BookOpen,
  users: Users,
  "folder-kanban": FolderKanban,
};

/**
 * Get the icon component for a template
 */
function getTemplateIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText;
}

export interface TemplateCardProps {
  /** Template to display */
  template: Template;
  /** Callback when template is selected */
  onSelect: (template: Template) => void;
  /** Additional class names */
  className?: string;
}

/**
 * TemplateCard component
 *
 * Renders a clickable card displaying template information.
 * Supports keyboard navigation (Enter/Space to select).
 */
export function TemplateCard({
  template,
  onSelect,
  className,
}: TemplateCardProps) {
  const Icon = getTemplateIcon(template.icon);

  const handleClick = useCallback(() => {
    onSelect(template);
  }, [template, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(template);
      }
    },
    [template, onSelect]
  );

  // Clean content preview: remove markdown headers and limit length
  const contentPreview = template.content
    .replace(/^#+\s+/gm, "") // Remove markdown headers
    .replace(/\*\*/g, "") // Remove bold markers
    .trim();

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border p-4 text-left",
        "bg-card hover:bg-accent hover:text-accent-foreground",
        "transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Sélectionner le template ${template.name}`}
    >
      {/* Header: Icon + Name + Badge */}
      <div className="flex w-full items-start gap-3">
        <div
          data-testid="template-icon"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{template.name}</h3>
            {template.isSystem && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Système
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div
        data-testid="template-preview"
        className="w-full text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/50 rounded p-2"
      >
        {contentPreview}
      </div>
    </button>
  );
}
