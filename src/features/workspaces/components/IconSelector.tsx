"use client";

/**
 * Icon Selector Component for Workspaces
 *
 * Displays a grid of available icons for workspace selection.
 * Uses Lucide React icons optimized for workspace use cases.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
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
 * Available icons for workspaces
 * Includes general-purpose icons suitable for team workspaces
 */
export const iconMap = {
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
} as const;

/**
 * Icon metadata for display
 */
export const iconLabels: Record<string, string> = {
  folder: "Dossier",
  briefcase: "Entreprise",
  users: "Equipe",
  book: "Documentation",
  code: "Developpement",
  server: "Infrastructure",
  database: "Donnees",
  globe: "Web",
  settings: "Configuration",
  home: "Personnel",
  "file-text": "Documents",
  building: "Organisation",
  layers: "Projets",
  box: "Produit",
  archive: "Archives",
  star: "Favoris",
};

/**
 * List of available icon names
 */
export const availableIcons = Object.keys(iconMap);

/**
 * Get icon component by name
 */
export function getIconComponent(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || LucideIcons.Folder;
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
 *   value="users"
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
        data-testid="icon-selector"
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
                  data-testid={`icon-${iconName}`}
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
