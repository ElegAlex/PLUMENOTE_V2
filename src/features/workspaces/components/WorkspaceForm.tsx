"use client";

/**
 * Workspace Form Component
 *
 * Form for creating and editing workspaces.
 * Includes icon selection and validation.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconSelector } from "./IconSelector";
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from "../types";

/**
 * Validation constants matching backend Zod schema
 * @see src/features/workspaces/schemas/workspace.schema.ts
 */
const VALIDATION = {
  NAME_MAX: 255,
  DESCRIPTION_MAX: 1000,
} as const;

/**
 * Form schema for workspace
 */
const workspaceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis")
    .max(VALIDATION.NAME_MAX, `Le nom doit faire moins de ${VALIDATION.NAME_MAX} caracteres`),
  description: z
    .string()
    .max(VALIDATION.DESCRIPTION_MAX, `La description doit faire moins de ${VALIDATION.DESCRIPTION_MAX} caracteres`)
    .optional()
    .transform((val) => val?.trim() || ""),
  icon: z.string().default("folder"),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export interface WorkspaceFormProps {
  /** Existing workspace for edit mode (undefined for create mode) */
  workspace?: Workspace;
  /** Callback when form is submitted */
  onSubmit: (data: CreateWorkspaceInput | UpdateWorkspaceInput) => Promise<void>;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

/**
 * Workspace creation/edit form
 *
 * Provides form fields for name, description, and icon.
 *
 * @example
 * ```tsx
 * // Create mode
 * <WorkspaceForm
 *   onSubmit={async (data) => await createWorkspace(data)}
 *   onCancel={() => setDialogOpen(false)}
 * />
 *
 * // Edit mode
 * <WorkspaceForm
 *   workspace={existingWorkspace}
 *   onSubmit={async (data) => await updateWorkspace(workspace.id, data)}
 *   onCancel={() => setDialogOpen(false)}
 * />
 * ```
 */
export function WorkspaceForm({
  workspace,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WorkspaceFormProps) {
  const isEditMode = Boolean(workspace);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: workspace?.name || "",
      description: workspace?.description || "",
      icon: workspace?.icon || "folder",
    },
  });

  const selectedIcon = watch("icon");

  const handleFormSubmit = async (formData: WorkspaceFormValues) => {
    const submitData: CreateWorkspaceInput | UpdateWorkspaceInput = {
      name: formData.name,
      description: formData.description || null,
      icon: formData.icon,
    };

    await onSubmit(submitData);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      data-testid="workspace-form"
    >
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="workspace-name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="workspace-name"
          placeholder="Ex: Equipe DevOps"
          {...register("name")}
          disabled={isSubmitting}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
          data-testid="workspace-name-input"
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="workspace-description">Description</Label>
        <Textarea
          id="workspace-description"
          placeholder="Description optionnelle du workspace..."
          rows={3}
          {...register("description")}
          disabled={isSubmitting}
          aria-invalid={errors.description ? "true" : "false"}
          aria-describedby={errors.description ? "description-error" : undefined}
          data-testid="workspace-description-input"
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

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="workspace-form-cancel"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="workspace-form-submit"
        >
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
