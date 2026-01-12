-- ============================================
-- Story 6.1: Index Full-Text PostgreSQL
-- ============================================
-- This migration adds full-text search capabilities to the Note table:
-- 1. Creates a trigger function to auto-update searchVector on INSERT/UPDATE
-- 2. Creates the trigger on the Note table
-- 3. Creates a GIN index for fast full-text search
-- 4. Backfills searchVector for existing notes

-- ============================================
-- Step 1: Create the trigger function
-- ============================================
-- Combines French and English dictionaries with weighted relevance:
-- - Title has weight 'A' (highest relevance)
-- - Content has weight 'B' (lower relevance)
-- Both languages are indexed to support bilingual search

CREATE OR REPLACE FUNCTION update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('french', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 2: Create the trigger
-- ============================================
-- BEFORE INSERT OR UPDATE ensures searchVector is available immediately
-- Only triggers when title or content changes (optimization)

CREATE TRIGGER note_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, content ON "Note"
FOR EACH ROW EXECUTE FUNCTION update_note_search_vector();

-- ============================================
-- Step 3: Create GIN index for performance
-- ============================================
-- GIN (Generalized Inverted Index) is optimal for full-text search
-- Provides O(1) lookup vs O(n) sequential scan with LIKE

CREATE INDEX "Note_searchVector_idx" ON "Note" USING GIN ("searchVector");

-- ============================================
-- Step 4: Backfill searchVector for existing notes
-- ============================================
-- Trigger fires on UPDATE, so we update title to itself to populate searchVector
-- This ensures all existing notes have searchable content

UPDATE "Note" SET title = title WHERE "searchVector" IS NULL;
