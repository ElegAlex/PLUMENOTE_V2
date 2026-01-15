/**
 * Unit tests for version validation schemas
 *
 * Tests all validation rules for version creation and query parameters.
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { describe, it, expect } from "vitest";
import {
  createVersionSchema,
  versionIdSchema,
  noteIdParamSchema,
  versionsQuerySchema,
  snapshotRequestSchema,
} from "./version.schema";

describe("createVersionSchema", () => {
  describe("valid inputs", () => {
    it("should accept title only", () => {
      const result = createVersionSchema.safeParse({ title: "Version 1" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Version 1");
      }
    });

    it("should accept title and content", () => {
      const result = createVersionSchema.safeParse({
        title: "My Note",
        content: "# Hello World",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Note");
        expect(result.data.content).toBe("# Hello World");
      }
    });

    it("should accept title with null content", () => {
      const result = createVersionSchema.safeParse({
        title: "My Note",
        content: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBeNull();
      }
    });

    it("should accept title at max length (255 chars)", () => {
      const maxTitle = "a".repeat(255);
      const result = createVersionSchema.safeParse({ title: maxTitle });
      expect(result.success).toBe(true);
    });

    it("should accept content at max length (1,000,000 chars)", () => {
      const maxContent = "a".repeat(1_000_000);
      const result = createVersionSchema.safeParse({
        title: "Title",
        content: maxContent,
      });
      expect(result.success).toBe(true);
    });

    it("should accept ydoc as Buffer", () => {
      const ydocBuffer = Buffer.from([0x01, 0x02, 0x03]);
      const result = createVersionSchema.safeParse({
        title: "Title",
        ydoc: ydocBuffer,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ydoc).toEqual(ydocBuffer);
      }
    });
  });

  describe("title validation", () => {
    it("should reject missing title", () => {
      const result = createVersionSchema.safeParse({ content: "content" });
      expect(result.success).toBe(false);
    });

    it("should reject empty string title", () => {
      const result = createVersionSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toContain(
          "Title is required"
        );
      }
    });

    it("should reject title exceeding 255 characters", () => {
      const longTitle = "a".repeat(256);
      const result = createVersionSchema.safeParse({ title: longTitle });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toContain(
          "Title must be 255 characters or less"
        );
      }
    });
  });

  describe("content validation", () => {
    it("should reject content exceeding 1MB (1,000,000 chars)", () => {
      const largeContent = "a".repeat(1_000_001);
      const result = createVersionSchema.safeParse({
        title: "Title",
        content: largeContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.content).toContain(
          "Content must be 1MB or less"
        );
      }
    });
  });
});

describe("versionIdSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid CUID", () => {
      const result = versionIdSchema.safeParse({
        versionId: "clh2abc123def456ghi789",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty string", () => {
      const result = versionIdSchema.safeParse({ versionId: "" });
      expect(result.success).toBe(false);
    });

    it("should reject non-CUID format", () => {
      const result = versionIdSchema.safeParse({ versionId: "not-a-cuid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.versionId).toContain(
          "Invalid version ID format"
        );
      }
    });

    it("should reject UUID format", () => {
      const result = versionIdSchema.safeParse({
        versionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing versionId", () => {
      const result = versionIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("noteIdParamSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid CUID", () => {
      const result = noteIdParamSchema.safeParse({
        id: "clh2abc123def456ghi789",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty string", () => {
      const result = noteIdParamSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    it("should reject non-CUID format", () => {
      const result = noteIdParamSchema.safeParse({ id: "invalid-id" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.id).toContain(
          "Invalid note ID format"
        );
      }
    });
  });
});

describe("versionsQuerySchema", () => {
  describe("defaults", () => {
    it("should use default page=1 when not provided", () => {
      const result = versionsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should use default pageSize=20 when not provided", () => {
      const result = versionsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(20);
      }
    });
  });

  describe("valid inputs", () => {
    it("should accept valid page and pageSize", () => {
      const result = versionsQuerySchema.safeParse({ page: 2, pageSize: 30 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(30);
      }
    });

    it("should coerce string numbers", () => {
      const result = versionsQuerySchema.safeParse({ page: "3", pageSize: "25" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it("should accept pageSize at max (50)", () => {
      const result = versionsQuerySchema.safeParse({ pageSize: 50 });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject page=0", () => {
      const result = versionsQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = versionsQuerySchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject pageSize exceeding 50", () => {
      const result = versionsQuerySchema.safeParse({ pageSize: 51 });
      expect(result.success).toBe(false);
    });

    it("should reject pageSize=0", () => {
      const result = versionsQuerySchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = versionsQuerySchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });
  });
});

describe("snapshotRequestSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid noteId CUID", () => {
      const result = snapshotRequestSchema.safeParse({
        noteId: "clh2abc123def456ghi789",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject missing noteId", () => {
      const result = snapshotRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject invalid noteId format", () => {
      const result = snapshotRequestSchema.safeParse({ noteId: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.noteId).toContain(
          "Invalid note ID format"
        );
      }
    });

    it("should reject empty string noteId", () => {
      const result = snapshotRequestSchema.safeParse({ noteId: "" });
      expect(result.success).toBe(false);
    });
  });
});
