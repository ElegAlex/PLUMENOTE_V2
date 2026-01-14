"use client";

/**
 * Template Form Component
 *
 * Form for creating and editing templates.
 * Integrates with Tiptap editor for content editing.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Editor, type EditorRef } from "@/features/editor/components/Editor";
import { IconSelector } from "./IconSelector";
import type { Template, CreateTemplateInput, UpdateTemplateInput } from "../types";

/**
 * Validation constants matching backend Zod schema
 * @see src/features/templates/schemas/template.schema.ts
 */
const VALIDATION = {
  NAME_MAX: 255,
  DESCRIPTION_MAX: 1000,
  CONTENT_MAX: 100_000,
} as const;

/**
 * Form values type
 */
interface TemplateFormValues {
  name: string;
  description: string;
  icon: string;
}

export interface TemplateFormProps {
  /** Existing template for edit mode (undefined for create mode) */
  template?: Template;
  /** Callback when form is submitted */
  onSubmit: (data: CreateTemplateInput | UpdateTemplateInput) => Promise<void>;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Callback when content changes (for preview) */
  onContentChange?: (content: string) => void;
}

/**
 * Template creation/edit form
 *
 * Provides form fields for name, description, icon, and content.
 * Uses Tiptap editor for rich text content editing.
 *
 * @example
 * ```tsx
 * // Create mode
 * <TemplateForm
 *   onSubmit={async (data) => await createTemplate(data)}
 *   onCancel={() => setDialogOpen(false)}
 * />
 *
 * // Edit mode
 * <TemplateForm
 *   template={existingTemplate}
 *   onSubmit={async (data) => await updateTemplate(template.id, data)}
 *   onCancel={() => setDialogOpen(false)}
 * />
 * ```
 */
export function TemplateForm({
  template,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onContentChange,
}: TemplateFormProps) {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState(template?.content || "");
  const [contentError, setContentError] = useState<string | null>(null);
  const isEditMode = Boolean(template);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      icon: template?.icon || "file-text",
    },
  });

  const selectedIcon = watch("icon");

  // Notify parent of content changes
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setContentError(null);
      onContentChange?.(newContent);
    },
    [onContentChange]
  );

  // Initialize editor content when template changes
  useEffect(() => {
    if (template?.content && editorRef.current) {
      editorRef.current.setContent(template.content);
    }
  }, [template?.content]);

  const handleFormSubmit = async (formData: TemplateFormValues) => {
    // Validate content
    const currentContent = editorRef.current?.getHTML() || content;
    if (!currentContent || currentContent === "<p></p>") {
      setContentError("Le contenu est requis");
      return;
    }

    // Validate content length (NFR27: max 100k chars)
    if (currentContent.length > VALIDATION.CONTENT_MAX) {
      setContentError(
        `Le contenu depasse la limite de ${VALIDATION.CONTENT_MAX.toLocaleString()} caracteres (${currentContent.length.toLocaleString()} actuellement)`
      );
      return;
    }

    // Validate name
    if (!formData.name.trim()) {
      return;
    }

    const submitData: CreateTemplateInput | UpdateTemplateInput = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      icon: formData.icon,
      content: currentContent,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Ex: Fiche Serveur"
          {...register("name", {
            required: "Le nom est requis",
            maxLength: {
              value: VALIDATION.NAME_MAX,
              message: `Le nom doit faire moins de ${VALIDATION.NAME_MAX} caracteres`,
            },
          })}
          disabled={isSubmitting}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description optionnelle du template..."
          rows={2}
          {...register("description", {
            maxLength: {
              value: VALIDATION.DESCRIPTION_MAX,
              message: `La description doit faire moins de ${VALIDATION.DESCRIPTION_MAX} caracteres`,
            },
          })}
          disabled={isSubmitting}
          aria-invalid={errors.description ? "true" : "false"}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Icon Selector */}
      <div className="space-y-2">
        <Label>Icone</Label>
        <IconSelector
          value={selectedIcon}
          onChange={(icon) => setValue("icon", icon)}
          disabled={isSubmitting}
        />
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <Label>
          Contenu <span className="text-destructive">*</span>
        </Label>
        <div
          className={`rounded-lg border ${
            contentError ? "border-destructive" : "border-input"
          }`}
        >
          <Editor
            ref={editorRef}
            content={content}
            onUpdate={handleContentChange}
            placeholder="Redigez le contenu du template..."
            editable={!isSubmitting}
            className="min-h-[200px]"
          />
        </div>
        {contentError && (
          <p className="text-sm text-destructive">{contentError}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Enregistrement..."
            : isEditMode
            ? "Mettre a jour"
            : "Creer"}
        </Button>
      </div>
    </form>
  );
}
