"use client";

/**
 * Template List Component
 *
 * Displays a list of templates with actions for admin management.
 * Shows system badge for non-deletable templates.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTemplates } from "../hooks/useTemplates";
import { useTemplatesMutation } from "../hooks/useTemplatesMutation";
import { getIconComponent } from "./IconSelector";
import type { Template } from "../types";

export interface TemplateListProps {
  /** Callback when edit is clicked */
  onEdit: (template: Template) => void;
}

/**
 * Template list loading skeleton
 */
function TemplateListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single template item row
 */
function TemplateItem({
  template,
  onEdit,
  onDelete,
  isDeleting,
}: {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  isDeleting: boolean;
}) {
  const IconComponent = getIconComponent(template.icon);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{template.name}</h3>
            {template.isSystem && (
              <Badge variant="secondary" className="text-xs">
                Systeme
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(template)}
                disabled={isDeleting}
                aria-label={`Modifier ${template.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Modifier</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(template)}
                  disabled={template.isSystem || isDeleting}
                  aria-label={
                    template.isSystem
                      ? "Les templates systeme ne peuvent pas etre supprimes"
                      : `Supprimer ${template.name}`
                  }
                  className={
                    template.isSystem
                      ? "cursor-not-allowed opacity-50"
                      : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {template.isSystem
                ? "Les templates systeme ne peuvent pas etre supprimes"
                : "Supprimer"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * Template list with CRUD actions
 *
 * Displays all templates with edit and delete buttons.
 * System templates have disabled delete button.
 *
 * @example
 * ```tsx
 * <TemplateList onEdit={(t) => openEditDialog(t)} />
 * ```
 */
export function TemplateList({ onEdit }: TemplateListProps) {
  const { data, isLoading, error } = useTemplates();
  const { deleteTemplateAsync, isDeleting } = useTemplatesMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
    null
  );

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplateAsync(templateToDelete.id);
      toast.success(`Template "${templateToDelete.name}" supprime`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la suppression";
      toast.error(message);
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return <TemplateListSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
      >
        Erreur lors du chargement des templates: {error.message}
      </div>
    );
  }

  const templates = data?.data || [];

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground">Aucun template cree</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cliquez sur &quot;Nouveau template&quot; pour commencer
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3" role="list" aria-label="Liste des templates">
        {templates.map((template) => (
          <TemplateItem
            key={template.id}
            template={template}
            onEdit={onEdit}
            onDelete={handleDeleteClick}
            isDeleting={isDeleting}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer le template{" "}
              <strong>&quot;{templateToDelete?.name}&quot;</strong> ? Cette
              action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
