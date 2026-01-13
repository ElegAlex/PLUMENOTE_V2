// Templates feature module
// Barrel exports for templates management feature
// @see Story 7.1: Modele Template et Infrastructure

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
