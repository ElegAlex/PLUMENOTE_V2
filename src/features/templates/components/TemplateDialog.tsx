"use client";

/**
 * Template Dialog Component
 *
 * Modal dialog for creating and editing templates.
 * Includes form and optional preview panel.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateForm } from "./TemplateForm";
import { TemplatePreview } from "./TemplatePreview";
import { useTemplatesMutation } from "../hooks/useTemplatesMutation";
import type { Template, CreateTemplateInput, UpdateTemplateInput } from "../types";

export interface TemplateDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Template to edit (undefined for create mode) */
  template?: Template;
}

/**
 * Template create/edit dialog
 *
 * Opens a modal with form fields and optional preview.
 * Handles create and update operations with toast notifications.
 *
 * @example
 * ```tsx
 * // Create mode
 * <TemplateDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 * />
 *
 * // Edit mode
 * <TemplateDialog
 *   open={dialogOpen}
 *   onOpenChange={setDialogOpen}
 *   template={selectedTemplate}
 * />
 * ```
 */
export function TemplateDialog({
  open,
  onOpenChange,
  template,
}: TemplateDialogProps) {
  const isEditMode = Boolean(template);
  const [previewContent, setPreviewContent] = useState(template?.content || "");
  const [activeTab, setActiveTab] = useState<string>("edit");
  const {
    createTemplateAsync,
    isCreating,
    updateTemplateAsync,
    isUpdating,
  } = useTemplatesMutation();

  const isSubmitting = isCreating || isUpdating;

  const handleContentChange = useCallback((content: string) => {
    setPreviewContent(content);
  }, []);

  const handleSubmit = async (
    data: CreateTemplateInput | UpdateTemplateInput
  ) => {
    try {
      if (isEditMode && template) {
        await updateTemplateAsync({ id: template.id, data });
        toast.success(`Template "${data.name || template.name}" mis a jour`);
      } else {
        await createTemplateAsync(data as CreateTemplateInput);
        toast.success(`Template "${data.name}" cree`);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Erreur lors de la mise a jour"
          : "Erreur lors de la creation";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setPreviewContent(template?.content || "");
      setActiveTab("edit");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier le template" : "Creer un nouveau template"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifiez les informations et le contenu du template."
              : "Definissez les informations et le contenu de votre nouveau template."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edition</TabsTrigger>
            <TabsTrigger value="preview">Apercu</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <TemplateForm
              template={template}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              onContentChange={handleContentChange}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Apercu du contenu du template tel qu&apos;il apparaitra dans
                une note.
              </p>
              <TemplatePreview content={previewContent} />
              <div className="flex justify-end">
                <p className="text-xs text-muted-foreground">
                  Retournez a l&apos;onglet Edition pour modifier le contenu.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
