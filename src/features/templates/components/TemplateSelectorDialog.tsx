"use client";

/**
 * TemplateSelectorDialog component
 *
 * Modal dialog for selecting a template when creating a new note.
 * Displays a grid of available templates with preview.
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { useCallback } from "react";
import { FileText, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "../hooks/useTemplates";
import { TemplateCard } from "./TemplateCard";
import type { Template } from "../types";

/**
 * Skeleton loader for template cards
 */
function TemplateCardSkeleton() {
  return (
    <div
      data-testid="template-skeleton"
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded" />
    </div>
  );
}

/**
 * Empty note "template" option
 */
const emptyNoteTemplate: Template = {
  id: "empty",
  name: "Note vide",
  description: "Commencez avec une page blanche",
  content: "",
  icon: "file-text",
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: null,
};

export interface TemplateSelectorDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when a template is selected, receives the template content */
  onSelect: (content: string) => void;
}

/**
 * TemplateSelectorDialog component
 *
 * Displays available templates in a grid layout.
 * Includes loading, error, and empty states.
 */
export function TemplateSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: TemplateSelectorDialogProps) {
  const { data, isLoading, error } = useTemplates({ enabled: open });

  const templates = data?.data ?? [];

  const handleSelect = useCallback(
    (template: Template) => {
      onSelect(template.content);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisir un template</DialogTitle>
          <DialogDescription>
            Sélectionnez un template pour créer votre note ou commencez avec une
            page blanche.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {/* Loading state */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                Erreur lors du chargement des templates. Veuillez réessayer.
              </p>
            </div>
          )}

          {/* Templates grid */}
          {!isLoading && !error && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Empty note option always first */}
              <TemplateCard
                template={emptyNoteTemplate}
                onSelect={handleSelect}
              />

              {/* Templates list */}
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                />
              ))}

              {/* Empty state (only templates, not counting empty note option) */}
              {templates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun template disponible</p>
                  <p className="text-sm mt-1">
                    Les administrateurs peuvent créer des templates.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
