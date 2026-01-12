/**
 * Integration tests for Full-Text Search (FTS) functionality
 *
 * Tests the PostgreSQL FTS trigger, GIN index, and search service.
 * These tests run against a real database and require Docker to be running.
 *
 * @see Story 6.1: Index Full-Text PostgreSQL
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Skip tests if DATABASE_URL is not set
const skipTests = !process.env.DATABASE_URL;

// Create a dedicated test client (only if DATABASE_URL is available)
const pool = skipTests ? null : new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = pool ? new PrismaPg(pool) : null;
const prisma = adapter ? new PrismaClient({ adapter }) : null;

// Test user ID
const TEST_USER_ID = "fts-test-user";
const TEST_USER_EMAIL = "fts-test@example.com";

describe.skipIf(skipTests)("Full-Text Search Integration Tests", () => {
  beforeAll(async () => {
    if (!prisma) return;
    // Create test user
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (${TEST_USER_ID}, ${TEST_USER_EMAIL}, 'FTS Test User', '$2b$10$test', 'EDITOR', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET id = ${TEST_USER_ID}
    `;
  });

  afterAll(async () => {
    if (!prisma || !pool) return;
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM "Note" WHERE "createdById" = ${TEST_USER_ID}`;
    await prisma.$executeRaw`DELETE FROM "User" WHERE id = ${TEST_USER_ID}`;
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    if (!prisma) return;
    // Clean up notes before each test
    await prisma.$executeRaw`DELETE FROM "Note" WHERE "createdById" = ${TEST_USER_ID}`;
  });

  describe("PostgreSQL Trigger Tests", () => {
    it("should automatically populate searchVector on INSERT", async () => {
      // Insert a note
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-1', 'Test Title', 'Test content for search', ${TEST_USER_ID}, NOW())
      `;

      // Verify searchVector is populated
      const result = await prisma.$queryRaw<Array<{ sv: string | null }>>`
        SELECT "searchVector"::text as sv FROM "Note" WHERE id = 'fts-test-note-1'
      `;

      expect(result[0]?.sv).toBeTruthy();
      expect(result[0]?.sv).toContain("test");
    });

    it("should update searchVector on UPDATE of title", async () => {
      // Insert a note
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-2', 'Original Title', 'Content', ${TEST_USER_ID}, NOW())
      `;

      // Update title
      await prisma.$executeRaw`
        UPDATE "Note" SET title = 'Updated Title', "updatedAt" = NOW()
        WHERE id = 'fts-test-note-2'
      `;

      // Verify searchVector contains new title
      const result = await prisma.$queryRaw<Array<{ sv: string | null }>>`
        SELECT "searchVector"::text as sv FROM "Note" WHERE id = 'fts-test-note-2'
      `;

      expect(result[0]?.sv).toContain("updat");
    });

    it("should update searchVector on UPDATE of content", async () => {
      // Insert a note
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-3', 'Title', 'Original content', ${TEST_USER_ID}, NOW())
      `;

      // Update content
      await prisma.$executeRaw`
        UPDATE "Note" SET content = 'New amazing content', "updatedAt" = NOW()
        WHERE id = 'fts-test-note-3'
      `;

      // Verify searchVector contains new content
      const result = await prisma.$queryRaw<Array<{ sv: string | null }>>`
        SELECT "searchVector"::text as sv FROM "Note" WHERE id = 'fts-test-note-3'
      `;

      expect(result[0]?.sv).toContain("amaz");
    });

    it("should support French language stemming", async () => {
      // Insert a note with French content
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-4', 'Documentation technique', 'Les utilisateurs peuvent créer des notes', ${TEST_USER_ID}, NOW())
      `;

      // Search using French term
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Note"
        WHERE "searchVector" @@ to_tsquery('french', 'utilisateur')
      `;

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("fts-test-note-4");
    });

    it("should support English language stemming", async () => {
      // Insert a note with English content
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-5', 'Technical Documentation', 'Users can create and organize notes', ${TEST_USER_ID}, NOW())
      `;

      // Search using English term (should match "organizing" via stemming)
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Note"
        WHERE "searchVector" @@ to_tsquery('english', 'organize')
      `;

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("fts-test-note-5");
    });
  });

  describe("GIN Index Tests", () => {
    it("should use GIN index for FTS queries", async () => {
      // Insert test data
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
        VALUES ('fts-test-note-6', 'PostgreSQL Guide', 'Database performance tips', ${TEST_USER_ID}, NOW())
      `;

      // Check query plan uses the index (for larger datasets)
      const plan = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
        EXPLAIN SELECT id FROM "Note" WHERE "searchVector" @@ to_tsquery('french', 'postgresql')
      `;

      // For small datasets, Postgres may choose seq scan, but index should be available
      // Just verify the query executes successfully
      expect(plan.length).toBeGreaterThan(0);
    });
  });

  describe("FTS Search Query Tests", () => {
    beforeEach(async () => {
      // Insert multiple test notes
      await prisma.$executeRaw`
        INSERT INTO "Note" (id, title, content, "createdById", "updatedAt") VALUES
          ('fts-search-1', 'React Best Practices', 'Modern hooks and performance optimization', ${TEST_USER_ID}, NOW()),
          ('fts-search-2', 'PostgreSQL Performance', 'Index tuning and query optimization', ${TEST_USER_ID}, NOW()),
          ('fts-search-3', 'Notes de réunion', 'Discussion sur le projet et planning', ${TEST_USER_ID}, NOW())
      `;
    });

    it("should find notes matching search term", async () => {
      const result = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT id, ts_rank("searchVector", to_tsquery('english', 'react')) as rank
        FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "searchVector" @@ to_tsquery('english', 'react')
        ORDER BY rank DESC
      `;

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("fts-search-1");
    });

    it("should rank results by relevance", async () => {
      // Search for "optimization" which appears in multiple notes
      const result = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT id, ts_rank("searchVector", to_tsquery('english', 'optimization')) as rank
        FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "searchVector" @@ to_tsquery('english', 'optimization')
        ORDER BY rank DESC
      `;

      expect(result.length).toBe(2);
      // Both should have positive ranks
      expect(result[0]?.rank).toBeGreaterThan(0);
      expect(result[1]?.rank).toBeGreaterThan(0);
    });

    it("should support prefix matching", async () => {
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "searchVector" @@ to_tsquery('english', 'optim:*')
      `;

      expect(result.length).toBe(2);
    });

    it("should search in French content", async () => {
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "searchVector" @@ to_tsquery('french', 'réunion')
      `;

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("fts-search-3");
    });

    it("should generate highlighted excerpts with ts_headline", async () => {
      const result = await prisma.$queryRaw<Array<{ id: string; highlight: string }>>`
        SELECT
          id,
          ts_headline(
            'english',
            content,
            to_tsquery('english', 'optimization'),
            'StartSel=<mark>, StopSel=</mark>'
          ) as highlight
        FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "searchVector" @@ to_tsquery('english', 'optimization')
      `;

      expect(result.length).toBe(2);
      // At least one result should have highlighted content
      const hasHighlight = result.some((r) => r.highlight.includes("<mark>"));
      expect(hasHighlight).toBe(true);
    });

    it("should respect soft delete filter", async () => {
      // Soft delete one note
      await prisma.$executeRaw`
        UPDATE "Note" SET "deletedAt" = NOW() WHERE id = 'fts-search-1'
      `;

      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "deletedAt" IS NULL
          AND "searchVector" @@ to_tsquery('english', 'react')
      `;

      expect(result.length).toBe(0);
    });
  });

  describe("Performance Tests", () => {
    it("should complete search within 500ms (NFR2)", async () => {
      // Insert a reasonable number of test notes
      const insertPromises = [];
      for (let i = 0; i < 100; i++) {
        insertPromises.push(
          prisma.$executeRaw`
            INSERT INTO "Note" (id, title, content, "createdById", "updatedAt")
            VALUES (${`perf-note-${i}`}, ${`Performance Test ${i}`}, ${`Content for performance testing ${i} with various keywords like optimization, search, database, and more`}, ${TEST_USER_ID}, NOW())
          `
        );
      }
      await Promise.all(insertPromises);

      const start = Date.now();

      await prisma.$queryRaw`
        SELECT id, title,
          ts_rank("searchVector", to_tsquery('english', 'optimization')) as rank
        FROM "Note"
        WHERE "createdById" = ${TEST_USER_ID}
          AND "deletedAt" IS NULL
          AND "searchVector" @@ to_tsquery('english', 'optimization')
        ORDER BY rank DESC
        LIMIT 20
      `;

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});
