// Templates feature module - Server-side exports
// Barrel exports for templates management feature
// @see Story 7.1: Modele Template et Infrastructure
//
// NOTE: For client components (use client), import from "./client" instead
// to avoid bundling server-side code (prisma) in client bundles.
// Example: import { NewNoteButton } from "@/features/templates/client";

// Types
export type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatesListResponse,
  TemplateResponse,
} from "./types";

// Schemas
export {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdSchema,
  type CreateTemplateSchemaInput,
  type UpdateTemplateSchemaInput,
  type TemplateIdSchemaInput,
} from "./schemas/template.schema";

// Services
export {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "./services/templates.service";

// Hooks
export { useTemplates, templateKeys, type UseTemplatesOptions } from "./hooks/useTemplates";
export {
  useTemplatesMutation,
  type UseTemplatesMutationReturn,
} from "./hooks/useTemplatesMutation";

// Components
export { TemplateCard, type TemplateCardProps } from "./components/TemplateCard";
export {
  TemplateSelectorDialog,
  type TemplateSelectorDialogProps,
} from "./components/TemplateSelectorDialog";
export { NewNoteButton, type NewNoteButtonProps } from "./components/NewNoteButton";
export {
  IconSelector,
  iconMap,
  iconLabels,
  availableIcons,
  getIconComponent,
  type IconSelectorProps,
} from "./components/IconSelector";
export { TemplatePreview, type TemplatePreviewProps } from "./components/TemplatePreview";
export { TemplateForm, type TemplateFormProps } from "./components/TemplateForm";
export { TemplateList, type TemplateListProps } from "./components/TemplateList";
export { TemplateDialog, type TemplateDialogProps } from "./components/TemplateDialog";
