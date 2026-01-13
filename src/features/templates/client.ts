// Templates feature - Client-side exports only
// Use this barrel export in client components to avoid server-side code
// @see Story 7.2: Creation de Note depuis Template

// Types (safe for client)
export type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatesListResponse,
  TemplateResponse,
} from "./types";

// Hooks (client-side)
export { useTemplates, templateKeys, type UseTemplatesOptions } from "./hooks/useTemplates";

// Components (client-side)
export { TemplateCard, type TemplateCardProps } from "./components/TemplateCard";
export {
  TemplateSelectorDialog,
  type TemplateSelectorDialogProps,
} from "./components/TemplateSelectorDialog";
export { NewNoteButton, type NewNoteButtonProps } from "./components/NewNoteButton";
