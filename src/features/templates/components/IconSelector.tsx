"use client";

/**
 * Icon Selector Component
 *
 * Displays a grid of available icons for template selection.
 * Uses Lucide React icons.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Available icons for templates
 */
export const iconMap = {
  "file-text": LucideIcons.FileText,
  server: LucideIcons.Server,
  "list-checks": LucideIcons.ListChecks,
  "book-open": LucideIcons.BookOpen,
  users: LucideIcons.Users,
  "folder-kanban": LucideIcons.FolderKanban,
  clipboard: LucideIcons.Clipboard,
  "file-code": LucideIcons.FileCode,
} as const;

/**
 * Icon metadata for display
 */
export const iconLabels: Record<string, string> = {
  "file-text": "Document",
  server: "Serveur",
  "list-checks": "Procedure",
  "book-open": "Documentation",
  users: "Reunion",
  "folder-kanban": "Projet",
  clipboard: "Checklist",
  "file-code": "Code",
};

/**
 * List of available icon names
 */
export const availableIcons = Object.keys(iconMap);

/**
 * Get icon component by name
 */
export function getIconComponent(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || LucideIcons.FileText;
}

export interface IconSelectorProps {
  /** Currently selected icon name */
  value: string;
  /** Callback when icon is selected */
  onChange: (iconName: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Icon selector grid component
 *
 * @example
 * ```tsx
 * <IconSelector
 *   value="server"
 *   onChange={(icon) => setIcon(icon)}
 * />
 * ```
 */
export function IconSelector({
  value,
  onChange,
  disabled = false,
  className,
}: IconSelectorProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "grid grid-cols-4 gap-2 sm:grid-cols-8",
          className
        )}
        role="radiogroup"
        aria-label="Selectionner une icone"
      >
        {availableIcons.map((iconName) => {
          const Icon = iconMap[iconName as keyof typeof iconMap];
          const label = iconLabels[iconName];
          const isSelected = value === iconName;

          return (
            <Tooltip key={iconName}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-10 w-10",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => onChange(iconName)}
                  disabled={disabled}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
