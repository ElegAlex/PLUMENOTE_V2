/**
 * Unit tests for note validation schemas
 *
 * Tests all validation rules for note creation, update, and query parameters.
 */

import { describe, it, expect } from "vitest";
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  notesQuerySchema,
} from "./note.schema";

describe("createNoteSchema", () => {
  describe("valid inputs", () => {
    it("should accept empty object (all fields optional)", () => {
      const result = createNoteSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept title only", () => {
      const result = createNoteSchema.safeParse({ title: "My Note" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Note");
      }
    });

    it("should accept content only", () => {
      const result = createNoteSchema.safeParse({ content: "# Hello" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("# Hello");
      }
    });

    it("should accept both title and content", () => {
      const result = createNoteSchema.safeParse({
        title: "My Note",
        content: "# Hello World",
      });
      expect(result.success).toBe(true);
    });

    it("should accept title at max length (255 chars)", () => {
      const maxTitle = "a".repeat(255);
      const result = createNoteSchema.safeParse({ title: maxTitle });
      expect(result.success).toBe(true);
    });
  });

  describe("title validation", () => {
    it("should reject title exceeding 255 characters", () => {
      const longTitle = "a".repeat(256);
      const result = createNoteSchema.safeParse({ title: longTitle });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toContain(
          "Title must be 255 characters or less"
        );
      }
    });

    it("should transform empty string title to undefined", () => {
      const result = createNoteSchema.safeParse({ title: "", content: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBeUndefined();
      }
    });

    it("should trim whitespace from title", () => {
      const result = createNoteSchema.safeParse({ title: "  My Note  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Note");
      }
    });
  });

  describe("content validation", () => {
    it("should reject content exceeding 1MB (1,000,000 chars)", () => {
      const largeContent = "a".repeat(1_000_001);
      const result = createNoteSchema.safeParse({ content: largeContent });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.content).toContain(
          "Content must be 1MB or less"
        );
      }
    });

    it("should accept content at max length (1,000,000 chars)", () => {
      const maxContent = "a".repeat(1_000_000);
      const result = createNoteSchema.safeParse({ content: maxContent });
      expect(result.success).toBe(true);
    });
  });
});

describe("updateNoteSchema", () => {
  describe("valid inputs", () => {
    it("should accept title only", () => {
      const result = updateNoteSchema.safeParse({ title: "Updated Title" });
      expect(result.success).toBe(true);
    });

    it("should accept content only", () => {
      const result = updateNoteSchema.safeParse({ content: "Updated content" });
      expect(result.success).toBe(true);
    });

    it("should accept both title and content", () => {
      const result = updateNoteSchema.safeParse({
        title: "New Title",
        content: "New content",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("requires at least one field", () => {
    it("should reject empty object", () => {
      const result = updateNoteSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().formErrors).toContain(
          "At least one field must be provided"
        );
      }
    });
  });

  describe("field validation", () => {
    it("should reject title exceeding 255 characters", () => {
      const longTitle = "a".repeat(256);
      const result = updateNoteSchema.safeParse({ title: longTitle });
      expect(result.success).toBe(false);
    });

    it("should reject content exceeding 1MB", () => {
      const largeContent = "a".repeat(1_000_001);
      const result = updateNoteSchema.safeParse({ content: largeContent });
      expect(result.success).toBe(false);
    });

    it("should trim whitespace from title", () => {
      const result = updateNoteSchema.safeParse({ title: "  Updated  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Updated");
      }
    });
  });

  describe("empty string handling", () => {
    it("should reject when both fields are empty strings (treated as undefined)", () => {
      const result = updateNoteSchema.safeParse({ title: "", content: "" });
      expect(result.success).toBe(false);
    });

    it("should accept when one field has value and other is empty string", () => {
      const result = updateNoteSchema.safeParse({ title: "Valid", content: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Valid");
        expect(result.data.content).toBeUndefined();
      }
    });
  });
});

describe("noteIdSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid CUID", () => {
      const result = noteIdSchema.safeParse({ id: "clh2abc123def456ghi789" });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty string", () => {
      const result = noteIdSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    it("should reject non-CUID format", () => {
      const result = noteIdSchema.safeParse({ id: "not-a-cuid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.id).toContain(
          "Invalid note ID format"
        );
      }
    });

    it("should reject UUID format", () => {
      const result = noteIdSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing id", () => {
      const result = noteIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("notesQuerySchema", () => {
  describe("defaults", () => {
    it("should use default page=1 when not provided", () => {
      const result = notesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should use default pageSize=20 when not provided", () => {
      const result = notesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(20);
      }
    });
  });

  describe("valid inputs", () => {
    it("should accept valid page and pageSize", () => {
      const result = notesQuerySchema.safeParse({ page: 2, pageSize: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it("should coerce string numbers", () => {
      const result = notesQuerySchema.safeParse({ page: "3", pageSize: "25" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it("should accept pageSize at max (100)", () => {
      const result = notesQuerySchema.safeParse({ pageSize: 100 });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject page=0", () => {
      const result = notesQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = notesQuerySchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject pageSize exceeding 100", () => {
      const result = notesQuerySchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it("should reject pageSize=0", () => {
      const result = notesQuerySchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = notesQuerySchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe("search parameter", () => {
    it("should accept search query", () => {
      const result = notesQuerySchema.safeParse({ search: "hello world" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("hello world");
      }
    });

    it("should trim search query", () => {
      const result = notesQuerySchema.safeParse({ search: "  hello  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("hello");
      }
    });

    it("should transform empty search to undefined", () => {
      const result = notesQuerySchema.safeParse({ search: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("should transform whitespace-only search to undefined", () => {
      const result = notesQuerySchema.safeParse({ search: "   " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("should reject search exceeding 255 characters", () => {
      const longSearch = "a".repeat(256);
      const result = notesQuerySchema.safeParse({ search: longSearch });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.search).toContain(
          "Search query must be 255 characters or less"
        );
      }
    });

    it("should accept search at max length (255 chars)", () => {
      const maxSearch = "a".repeat(255);
      const result = notesQuerySchema.safeParse({ search: maxSearch });
      expect(result.success).toBe(true);
    });

    it("should have undefined search by default", () => {
      const result = notesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });
  });
});
