/**
 * Unit tests for template validation schemas
 *
 * Tests all validation rules for template creation, update, and ID validation.
 * @see Story 7.1: Modele Template et Infrastructure
 */

import { describe, it, expect } from "vitest";
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdSchema,
} from "./template.schema";

describe("createTemplateSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid template with required fields only", () => {
      const result = createTemplateSchema.safeParse({
        name: "My Template",
        content: "# Template Content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Template");
        expect(result.data.content).toBe("# Template Content");
        expect(result.data.isSystem).toBe(false); // default
      }
    });

    it("should accept all fields", () => {
      const result = createTemplateSchema.safeParse({
        name: "Server Template",
        description: "Template for server documentation",
        content: "# Server Info\n\n## Details",
        icon: "server",
        isSystem: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Server Template");
        expect(result.data.description).toBe("Template for server documentation");
        expect(result.data.icon).toBe("server");
        expect(result.data.isSystem).toBe(true);
      }
    });

    it("should apply default isSystem=false", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSystem).toBe(false);
      }
    });

    it("should accept name at max length (255 chars)", () => {
      const maxName = "a".repeat(255);
      const result = createTemplateSchema.safeParse({
        name: maxName,
        content: "Content",
      });
      expect(result.success).toBe(true);
    });

    it("should accept content at max length (100,000 chars)", () => {
      const maxContent = "a".repeat(100_000);
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: maxContent,
      });
      expect(result.success).toBe(true);
    });

    it("should accept description at max length (1000 chars)", () => {
      const maxDesc = "a".repeat(1000);
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        description: maxDesc,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("name validation", () => {
    it("should reject empty name", () => {
      const result = createTemplateSchema.safeParse({
        name: "",
        content: "Content",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(
          "Name is required"
        );
      }
    });

    it("should reject name exceeding 255 characters", () => {
      const longName = "a".repeat(256);
      const result = createTemplateSchema.safeParse({
        name: longName,
        content: "Content",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.name).toContain(
          "Name must be 255 characters or less"
        );
      }
    });

    it("should trim whitespace from name", () => {
      const result = createTemplateSchema.safeParse({
        name: "  My Template  ",
        content: "Content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Template");
      }
    });

    it("should reject missing name", () => {
      const result = createTemplateSchema.safeParse({
        content: "Content",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("content validation", () => {
    it("should reject empty content", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.content).toContain(
          "Content is required"
        );
      }
    });

    it("should reject content exceeding 100,000 characters", () => {
      const largeContent = "a".repeat(100_001);
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: largeContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.content).toContain(
          "Content must be 100,000 characters or less"
        );
      }
    });

    it("should reject missing content", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("description validation", () => {
    it("should accept null description", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it("should transform empty description to null", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        description: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it("should reject description exceeding 1000 characters", () => {
      const longDesc = "a".repeat(1001);
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        description: longDesc,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain(
          "Description must be 1000 characters or less"
        );
      }
    });
  });

  describe("icon validation", () => {
    it("should accept valid icon", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        icon: "server",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("server");
      }
    });

    it("should trim icon whitespace", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        icon: "  file-text  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("file-text");
      }
    });

    it("should transform empty icon to undefined", () => {
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        icon: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBeUndefined();
      }
    });

    it("should reject icon exceeding 50 characters", () => {
      const longIcon = "a".repeat(51);
      const result = createTemplateSchema.safeParse({
        name: "Test",
        content: "Content",
        icon: longIcon,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.icon).toContain(
          "Icon must be 50 characters or less"
        );
      }
    });
  });
});

describe("updateTemplateSchema", () => {
  describe("valid inputs", () => {
    it("should accept name only", () => {
      const result = updateTemplateSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("should accept content only", () => {
      const result = updateTemplateSchema.safeParse({ content: "Updated content" });
      expect(result.success).toBe(true);
    });

    it("should accept description only", () => {
      const result = updateTemplateSchema.safeParse({ description: "New desc" });
      expect(result.success).toBe(true);
    });

    it("should accept icon only", () => {
      const result = updateTemplateSchema.safeParse({ icon: "new-icon" });
      expect(result.success).toBe(true);
    });

    it("should accept multiple fields", () => {
      const result = updateTemplateSchema.safeParse({
        name: "New Name",
        content: "New content",
        icon: "new-icon",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null description to clear it", () => {
      const result = updateTemplateSchema.safeParse({ description: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });
  });

  describe("requires at least one field", () => {
    it("should reject empty object", () => {
      const result = updateTemplateSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().formErrors).toContain(
          "At least one field must be provided"
        );
      }
    });

    it("should reject when all fields are empty strings (treated as undefined)", () => {
      const result = updateTemplateSchema.safeParse({
        name: "",
        content: "",
        icon: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("field validation", () => {
    it("should reject name exceeding 255 characters", () => {
      const longName = "a".repeat(256);
      const result = updateTemplateSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it("should reject content exceeding 100,000 characters", () => {
      const largeContent = "a".repeat(100_001);
      const result = updateTemplateSchema.safeParse({ content: largeContent });
      expect(result.success).toBe(false);
    });

    it("should reject description exceeding 1000 characters", () => {
      const longDesc = "a".repeat(1001);
      const result = updateTemplateSchema.safeParse({ description: longDesc });
      expect(result.success).toBe(false);
    });

    it("should trim whitespace from name", () => {
      const result = updateTemplateSchema.safeParse({ name: "  Updated  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated");
      }
    });

    it("should accept when name is omitted but content is provided", () => {
      const result = updateTemplateSchema.safeParse({
        content: "Valid content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
        expect(result.data.content).toBe("Valid content");
      }
    });
  });
});

describe("templateIdSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid CUID", () => {
      const result = templateIdSchema.safeParse({ id: "clh2abc123def456ghi789" });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty string", () => {
      const result = templateIdSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    it("should reject non-CUID format", () => {
      const result = templateIdSchema.safeParse({ id: "not-a-cuid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.id).toContain(
          "Invalid template ID format"
        );
      }
    });

    it("should reject UUID format", () => {
      const result = templateIdSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing id", () => {
      const result = templateIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
