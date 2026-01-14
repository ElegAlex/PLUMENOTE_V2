/**
 * Notes Service
 *
 * Business logic for note CRUD operations with ownership verification.
 * Includes PostgreSQL Full-Text Search (FTS) support (Story 6.1).
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import {
  canAccessWorkspace,
  canEditNotes,
  canDeleteNotes,
} from "@/features/workspaces/services/permissions.service";
import type { Note, CreateNoteInput, UpdateNoteInput } from "../types";

/**
 * Build a PostgreSQL tsquery string from search terms.
 * Supports prefix matching and handles special characters.
 *
 * @example
 * buildTsQuery("hello world") => "hello:* & world:*"
 * buildTsQuery("test's note") => "test:* & s:* & note:*"
 */
function buildTsQuery(search: string): string {
  return search
    .trim()
    .toLowerCase()
    // Remove special characters that could break tsquery
    .replace(/[^\w\s\u00C0-\u024F]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => `${term}:*`) // Prefix matching
    .join(" & ");
}

/**
 * Folder row type for raw queries
 */
type FolderRow = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
};

/**
 * Selection fields for Tag responses
 */
const tagSelect = {
  id: true,
  name: true,
  color: true,
} as const;

/**
 * Selection fields for Folder in Note responses
 */
const folderSelect = {
  id: true,
  name: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

/**
 * Fetch tags and folders for a list of notes and build lookup maps
 *
 * Extracted to reduce duplication between FTS search functions.
 * @see Story 6.1 Code Review
 */
async function fetchNotesRelations(noteIds: string[], folderIds: string[]): Promise<{
  tagsByNoteId: Map<string, Array<{ id: string; name: string; color: string }>>;
  foldersById: Map<string, FolderRow>;
}> {
  const [tags, folders] = await Promise.all([
    prisma.noteTag.findMany({
      where: { noteId: { in: noteIds } },
      select: {
        noteId: true,
        tag: { select: tagSelect },
      },
    }),
    folderIds.length > 0
      ? prisma.$queryRaw<FolderRow[]>`
          SELECT id, name, "parentId", "createdAt", "updatedAt", "createdById"
          FROM "Folder"
          WHERE id = ANY(${folderIds}::text[])
        `
      : Promise.resolve([]),
  ]);

  // Build lookup maps
  const tagsByNoteId = new Map<string, Array<{ id: string; name: string; color: string }>>();
  for (const t of tags) {
    if (!tagsByNoteId.has(t.noteId)) {
      tagsByNoteId.set(t.noteId, []);
    }
    tagsByNoteId.get(t.noteId)!.push(t.tag);
  }

  const foldersById = new Map<string, FolderRow>(folders.map((f) => [f.id, f]));

  return { tagsByNoteId, foldersById };
}

/**
 * Selection fields for Note responses (excludes internal fields)
 * @see Story 8.3: Added workspaceId for permission checks
 */
const noteSelect = {
  id: true,
  title: true,
  content: true,
  folderId: true,
  workspaceId: true,
  isFavorite: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

/**
 * Selection fields for Note with tags and folder
 */
const noteWithTagsSelect = {
  ...noteSelect,
  folder: {
    select: folderSelect,
  },
  tags: {
    select: {
      tag: {
        select: tagSelect,
      },
    },
  },
} as const;

/**
 * Sort options for notes list
 */
export type NoteSortField = "updatedAt" | "createdAt" | "title" | "sortOrder";
export type SortDirection = "asc" | "desc";

/**
 * Transform Prisma note with tags and folder to API format
 */
function transformNoteWithTags(
  note: {
    tags?: { tag: { id: string; name: string; color: string } }[];
    folder?: { id: string; name: string; parentId: string | null; createdAt: Date; updatedAt: Date; createdById: string } | null;
  } & Record<string, unknown>
): Note {
  const { tags, folder, ...rest } = note;
  return {
    ...rest,
    tags: tags?.map((t) => t.tag),
    folder: folder ?? null,
  } as Note;
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  data: CreateNoteInput
): Promise<Note> {
  const note = await prisma.note.create({
    data: {
      title: data.title ?? "Sans titre",
      content: data.content,
      folderId: data.folderId ?? null,
      isFavorite: data.isFavorite ?? false,
      createdById: userId,
      ...(data.tagIds?.length && {
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      }),
    },
    select: noteWithTagsSelect,
  });

  logger.info({ noteId: note.id, userId, folderId: note.folderId }, "Note created");
  return transformNoteWithTags(note);
}

/**
 * Get a note by ID with ownership/permission verification
 *
 * Excludes soft-deleted notes (Story 3.5).
 * Checks workspace permissions if note belongs to a workspace (Story 8.3).
 *
 * @throws {NotFoundError} If note doesn't exist or is deleted
 * @throws {ForbiddenError} If user doesn't have permission to access the note
 */
export async function getNoteById(noteId: string, userId: string): Promise<Note> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      ...noteWithTagsSelect,
      deletedAt: true,
    },
  });

  if (!note) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Treat deleted notes as not found (Story 3.5)
  if (note.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Check access permission (Story 8.3)
  let hasAccess = false;

  if (note.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    hasAccess = await canAccessWorkspace(userId, note.workspaceId);
  } else {
    // Personal note (no workspace) - check ownership
    hasAccess = note.createdById === userId;
  }

  if (!hasAccess) {
    logger.warn({ noteId, userId, ownerId: note.createdById, workspaceId: note.workspaceId }, "Unauthorized note access attempt");
    throw new ForbiddenError("You do not have permission to access this note");
  }

  logger.info({ noteId, userId }, "Note accessed");
  return transformNoteWithTags(note);
}

/**
 * Options for getUserNotes query
 */
export interface GetUserNotesOptions {
  page: number;
  pageSize: number;
  search?: string;
  // Filtering
  folderId?: string | null; // Filter by folder (null = root level only)
  favoriteOnly?: boolean;
  tagIds?: string[];
  // Sorting
  sortBy?: NoteSortField;
  sortDir?: SortDirection;
}

/**
 * Get paginated list of notes for a user with optional search, filters, and sorting
 *
 * When search is provided, uses PostgreSQL Full-Text Search (FTS) with ts_rank
 * for relevance scoring. Falls back to LIKE search for notes without searchVector.
 *
 * Favorites are shown first by default, then sorted by relevance (when searching)
 * or the specified field.
 *
 * @see Story 6.1: Index Full-Text PostgreSQL
 */
export async function getUserNotes(
  userId: string,
  options: GetUserNotesOptions
): Promise<{ notes: Note[]; total: number }> {
  const {
    page,
    pageSize,
    search,
    folderId,
    favoriteOnly,
    tagIds,
    sortBy = "updatedAt",
    sortDir = "desc",
  } = options;
  const skip = (page - 1) * pageSize;

  // Use FTS when search is provided
  if (search && search.trim().length > 0) {
    return searchNotesWithFTS(userId, {
      search,
      page,
      pageSize,
      folderId,
      favoriteOnly,
      tagIds,
      sortBy,
      sortDir,
    });
  }

  // Build where clause with optional filters (no search)
  // Exclude soft-deleted notes (Story 3.5)
  // Include: personal notes + workspace notes where user has access (Story 8.3)
  const where = {
    deletedAt: null, // Exclude soft-deleted notes
    OR: [
      // Personal notes (created by user, no workspace)
      { createdById: userId, workspaceId: null },
      // Notes in workspaces owned by user
      { workspace: { ownerId: userId } },
      // Notes in workspaces where user is a member
      { workspace: { members: { some: { userId } } } },
    ],
    ...(folderId !== undefined && { folderId }), // Filter by folder (null = root level)
    ...(favoriteOnly && { isFavorite: true }),
    ...(tagIds?.length && {
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    }),
  };

  // Build orderBy - favorites first, then by specified field
  const orderBy = [
    { isFavorite: "desc" as const }, // Favorites always first
    { [sortBy]: sortDir },
  ];

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      select: noteWithTagsSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  return {
    notes: notes.map(transformNoteWithTags),
    total,
  };
}

/**
 * Search notes using PostgreSQL Full-Text Search (FTS)
 *
 * Uses tsvector/tsquery with GIN index for performant full-text search.
 * Falls back to LIKE search if no FTS results found (for backward compatibility).
 *
 * Features:
 * - Prefix matching (search "test" matches "testing")
 * - French and English language support
 * - Relevance ranking with ts_rank
 * - Highlights search terms in results
 *
 * @see Story 6.1: Index Full-Text PostgreSQL
 */
async function searchNotesWithFTS(
  userId: string,
  options: {
    search: string;
    page: number;
    pageSize: number;
    folderId?: string | null;
    favoriteOnly?: boolean;
    tagIds?: string[];
    sortBy?: NoteSortField;
    sortDir?: SortDirection;
  }
): Promise<{ notes: Note[]; total: number }> {
  const {
    search,
    page,
    pageSize,
    folderId,
    favoriteOnly,
    tagIds,
  } = options;
  const skip = (page - 1) * pageSize;

  // Build tsquery from search terms
  const tsQuery = buildTsQuery(search);

  if (!tsQuery) {
    // Empty search after sanitization - return empty results
    return { notes: [], total: 0 };
  }

  // Build dynamic WHERE conditions
  // Include: personal notes + workspace notes where user has access (Story 8.3)
  const conditions: string[] = [
    `(
      ("createdById" = $1 AND "workspaceId" IS NULL) OR
      EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id = n."workspaceId" AND w."ownerId" = $1) OR
      EXISTS (SELECT 1 FROM "WorkspaceMember" wm WHERE wm."workspaceId" = n."workspaceId" AND wm."userId" = $1)
    )`,
    `"deletedAt" IS NULL`,
  ];
  const params: (string | boolean | string[])[] = [userId];
  let paramIndex = 2;

  // FTS condition - search both French and English
  conditions.push(`"searchVector" @@ (to_tsquery('french', $${paramIndex}) || to_tsquery('english', $${paramIndex}))`);
  params.push(tsQuery);
  paramIndex++;

  // Folder filter
  if (folderId !== undefined) {
    if (folderId === null) {
      conditions.push(`"folderId" IS NULL`);
    } else {
      conditions.push(`"folderId" = $${paramIndex}`);
      params.push(folderId);
      paramIndex++;
    }
  }

  // Favorite filter
  if (favoriteOnly) {
    conditions.push(`"isFavorite" = true`);
  }

  // Tag filter (notes that have at least one of the specified tags)
  if (tagIds && tagIds.length > 0) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "NoteTag" nt
      WHERE nt."noteId" = n.id
      AND nt."tagId" = ANY($${paramIndex}::text[])
    )`);
    params.push(tagIds);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  try {
    // Execute queries with parameters
    const [notesResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{
        id: string;
        title: string;
        content: string | null;
        folderId: string | null;
        workspaceId: string | null;
        isFavorite: boolean;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        createdById: string;
        rank: number;
      }>>(
        `SELECT
          n.id, n.title, n.content, n."folderId", n."workspaceId", n."isFavorite", n."sortOrder",
          n."createdAt", n."updatedAt", n."createdById",
          ts_rank("searchVector", to_tsquery('french', $2) || to_tsquery('english', $2)) as rank
        FROM "Note" n
        WHERE ${whereClause}
        ORDER BY n."isFavorite" DESC, rank DESC, n."updatedAt" DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}`,
        ...params,
        pageSize,
        skip
      ),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int as count FROM "Note" n WHERE ${whereClause}`,
        ...params
      ),
    ]);

    const total = countResult[0]?.count ?? 0;

    // If FTS returned no results, try fallback LIKE search
    // This handles notes that might not have searchVector populated
    if (notesResult.length === 0 && total === 0) {
      logger.info({ userId, search }, "FTS returned no results, trying LIKE fallback");
      return searchNotesWithLikeFallback(userId, options);
    }

    // Fetch tags and folders for the found notes
    const noteIds = notesResult.map((n) => n.id);
    const folderIds = notesResult.map((n) => n.folderId).filter((id): id is string => id !== null);
    const { tagsByNoteId, foldersById } = await fetchNotesRelations(noteIds, folderIds);

    // Transform results to Note format
    const notes: Note[] = notesResult.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId,
      workspaceId: n.workspaceId,
      isFavorite: n.isFavorite,
      sortOrder: n.sortOrder,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      createdById: n.createdById,
      tags: tagsByNoteId.get(n.id) ?? [],
      folder: n.folderId ? foldersById.get(n.folderId) ?? null : null,
    }));

    logger.info({ userId, search, total, ftsUsed: true }, "Notes FTS search executed");

    return { notes, total };
  } catch (error) {
    // Log error and fall back to LIKE search
    logger.error({ error, userId, search }, "FTS search failed, falling back to LIKE");
    return searchNotesWithLikeFallback(userId, options);
  }
}

/**
 * Fallback LIKE-based search for backward compatibility
 *
 * Used when FTS fails or returns no results (e.g., for notes without searchVector).
 */
async function searchNotesWithLikeFallback(
  userId: string,
  options: {
    search: string;
    page: number;
    pageSize: number;
    folderId?: string | null;
    favoriteOnly?: boolean;
    tagIds?: string[];
    sortBy?: NoteSortField;
    sortDir?: SortDirection;
  }
): Promise<{ notes: Note[]; total: number }> {
  const {
    search,
    page,
    pageSize,
    folderId,
    favoriteOnly,
    tagIds,
    sortBy = "updatedAt",
    sortDir = "desc",
  } = options;
  const skip = (page - 1) * pageSize;

  const where = {
    deletedAt: null,
    AND: [
      // Access control - user can see their personal notes or workspace notes
      {
        OR: [
          // Personal notes (created by user, no workspace)
          { createdById: userId, workspaceId: null },
          // Notes in workspaces owned by user
          { workspace: { ownerId: userId } },
          // Notes in workspaces where user is a member
          { workspace: { members: { some: { userId } } } },
        ],
      },
      // Search filter - title or content contains search term
      {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { content: { contains: search, mode: "insensitive" as const } },
        ],
      },
    ],
    ...(folderId !== undefined && { folderId }),
    ...(favoriteOnly && { isFavorite: true }),
    ...(tagIds?.length && {
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    }),
  };

  const orderBy = [
    { isFavorite: "desc" as const },
    { [sortBy]: sortDir },
  ];

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      select: noteWithTagsSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  logger.info({ userId, search, total, ftsUsed: false }, "Notes LIKE fallback search executed");

  return {
    notes: notes.map(transformNoteWithTags),
    total,
  };
}

/**
 * Search result with highlight and rank
 *
 * ⚠️ SECURITY NOTE: The `highlight` field contains HTML markup (<mark> tags)
 * generated by PostgreSQL ts_headline(). When rendering in the frontend,
 * ensure proper sanitization to prevent XSS attacks. Use a sanitizer like
 * DOMPurify or render with React's dangerouslySetInnerHTML only after
 * stripping dangerous tags.
 *
 * @see Story 6.1 Code Review - XSS warning
 */
export interface SearchResultNote extends Note {
  highlight: string | null;
  rank: number;
}

/**
 * Options for dedicated search endpoint
 */
export interface SearchNotesOptions {
  query: string;
  page: number;
  pageSize: number;
  folderId?: string | null;
  favoriteOnly?: boolean;
  tagIds?: string[];
}

/**
 * Dedicated full-text search with highlights and relevance ranking
 *
 * Uses PostgreSQL ts_headline for highlighted excerpts and ts_rank for relevance.
 * This is the dedicated search endpoint that provides richer search results.
 *
 * @see Story 6.1: Index Full-Text PostgreSQL (Task 3)
 */
export async function searchNotes(
  userId: string,
  options: SearchNotesOptions
): Promise<{ notes: SearchResultNote[]; total: number }> {
  const {
    query,
    page,
    pageSize,
    folderId,
    favoriteOnly,
    tagIds,
  } = options;
  const skip = (page - 1) * pageSize;

  // Build tsquery from search terms
  const tsQuery = buildTsQuery(query);

  if (!tsQuery) {
    return { notes: [], total: 0 };
  }

  // Build dynamic WHERE conditions
  // Include: personal notes + workspace notes where user has access (Story 8.3)
  const conditions: string[] = [
    `(
      ("createdById" = $1 AND "workspaceId" IS NULL) OR
      EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id = n."workspaceId" AND w."ownerId" = $1) OR
      EXISTS (SELECT 1 FROM "WorkspaceMember" wm WHERE wm."workspaceId" = n."workspaceId" AND wm."userId" = $1)
    )`,
    `"deletedAt" IS NULL`,
    `"searchVector" @@ (to_tsquery('french', $2) || to_tsquery('english', $2))`,
  ];
  const params: (string | boolean | string[])[] = [userId, tsQuery];
  let paramIndex = 3;

  // Folder filter
  if (folderId !== undefined) {
    if (folderId === null) {
      conditions.push(`"folderId" IS NULL`);
    } else {
      conditions.push(`"folderId" = $${paramIndex}`);
      params.push(folderId);
      paramIndex++;
    }
  }

  // Favorite filter
  if (favoriteOnly) {
    conditions.push(`"isFavorite" = true`);
  }

  // Tag filter
  if (tagIds && tagIds.length > 0) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "NoteTag" nt
      WHERE nt."noteId" = n.id
      AND nt."tagId" = ANY($${paramIndex}::text[])
    )`);
    params.push(tagIds);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  try {
    // Query with ts_headline for highlights and ts_rank for relevance
    const notesResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      title: string;
      content: string | null;
      folderId: string | null;
      workspaceId: string | null;
      isFavorite: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      createdById: string;
      highlight: string | null;
      rank: number;
    }>>(
      `SELECT
        n.id, n.title, n.content, n."folderId", n."workspaceId", n."isFavorite", n."sortOrder",
        n."createdAt", n."updatedAt", n."createdById",
        ts_headline(
          'french',
          COALESCE(n.content, ''),
          to_tsquery('french', $2) || to_tsquery('english', $2),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=2'
        ) as highlight,
        ts_rank("searchVector", to_tsquery('french', $2) || to_tsquery('english', $2)) as rank
      FROM "Note" n
      WHERE ${whereClause}
      ORDER BY n."isFavorite" DESC, rank DESC, n."updatedAt" DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}`,
      ...params,
      pageSize,
      skip
    );

    // Count total
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int as count FROM "Note" n WHERE ${whereClause}`,
      ...params
    );

    const total = countResult[0]?.count ?? 0;

    // Fetch tags and folders using shared helper
    const noteIds = notesResult.map((n) => n.id);
    const folderIds = notesResult.map((n) => n.folderId).filter((id): id is string => id !== null);
    const { tagsByNoteId, foldersById } = await fetchNotesRelations(noteIds, folderIds);

    // Transform results
    const notes: SearchResultNote[] = notesResult.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId,
      workspaceId: n.workspaceId,
      isFavorite: n.isFavorite,
      sortOrder: n.sortOrder,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      createdById: n.createdById,
      tags: tagsByNoteId.get(n.id) ?? [],
      folder: n.folderId ? foldersById.get(n.folderId) ?? null : null,
      highlight: n.highlight,
      rank: n.rank,
    }));

    logger.info({ userId, query, total }, "Notes search with highlights executed");

    return { notes, total };
  } catch (error) {
    // Log error and fall back to LIKE search (consistent with searchNotesWithFTS)
    // @see Story 6.1 Code Review - consistent error handling
    logger.error({ error, userId, query }, "Search with highlights failed, falling back to LIKE");
    const fallbackResult = await searchNotesWithLikeFallback(userId, {
      search: query,
      page,
      pageSize,
      folderId,
      favoriteOnly,
      tagIds,
    });
    // Transform to SearchResultNote format with empty highlights
    return {
      notes: fallbackResult.notes.map((n) => ({ ...n, highlight: null, rank: 0 })),
      total: fallbackResult.total,
    };
  }
}

/**
 * Update a note with ownership/permission verification
 *
 * Excludes soft-deleted notes (Story 3.5).
 * Checks workspace permissions if note belongs to a workspace (Story 8.3).
 *
 * @throws {NotFoundError} If note doesn't exist or is deleted
 * @throws {ForbiddenError} If user doesn't have permission to update the note
 */
export async function updateNote(
  noteId: string,
  userId: string,
  data: UpdateNoteInput
): Promise<Note> {
  // Verify access and not deleted
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true, deletedAt: true, workspaceId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Treat deleted notes as not found (Story 3.5)
  if (existing.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Check edit permission (Story 8.3)
  let canEdit = false;

  if (existing.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    canEdit = await canEditNotes(userId, existing.workspaceId);
  } else {
    // Personal note (no workspace) - check ownership
    canEdit = existing.createdById === userId;
  }

  if (!canEdit) {
    throw new ForbiddenError("You do not have permission to update this note");
  }

  // Handle tag updates if provided
  const tagUpdate = data.tagIds !== undefined
    ? {
        tags: {
          deleteMany: {}, // Remove all existing tags
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      }
    : {};

  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.folderId !== undefined && { folderId: data.folderId }),
      ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
      ...tagUpdate,
    },
    select: noteWithTagsSelect,
  });

  logger.info({ noteId, userId, folderId: note.folderId }, "Note updated");
  return transformNoteWithTags(note);
}

/**
 * Toggle favorite status for a note
 *
 * Excludes soft-deleted notes (Story 3.5).
 * Checks workspace permissions if note belongs to a workspace (Story 8.3).
 *
 * @throws {NotFoundError} If note doesn't exist or is deleted
 * @throws {ForbiddenError} If user doesn't have permission to update the note
 */
export async function toggleNoteFavorite(
  noteId: string,
  userId: string
): Promise<Note> {
  // Get current state and verify access
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true, isFavorite: true, deletedAt: true, workspaceId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Treat deleted notes as not found (Story 3.5)
  if (existing.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Check edit permission (Story 8.3)
  let canEdit = false;

  if (existing.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    canEdit = await canEditNotes(userId, existing.workspaceId);
  } else {
    // Personal note (no workspace) - check ownership
    canEdit = existing.createdById === userId;
  }

  if (!canEdit) {
    throw new ForbiddenError("You do not have permission to update this note");
  }

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { isFavorite: !existing.isFavorite },
    select: noteWithTagsSelect,
  });

  logger.info(
    { noteId, userId, isFavorite: note.isFavorite },
    "Note favorite toggled"
  );
  return transformNoteWithTags(note);
}

/**
 * Soft delete a note with ownership/permission verification
 *
 * Sets deletedAt timestamp instead of permanently deleting.
 * Note can be restored within 30 seconds via restoreNote().
 * Checks workspace permissions if note belongs to a workspace (Story 8.3).
 *
 * @see Story 3.5: Suppression d'une Note
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't have permission to delete the note
 */
export async function deleteNote(noteId: string, userId: string): Promise<void> {
  // Verify access first
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true, deletedAt: true, workspaceId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Check delete permission (Story 8.3)
  let canDelete = false;

  if (existing.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    // Only OWNER and ADMIN can delete notes
    canDelete = await canDeleteNotes(userId, existing.workspaceId);
  } else {
    // Personal note (no workspace) - check ownership
    canDelete = existing.createdById === userId;
  }

  if (!canDelete) {
    throw new ForbiddenError("You do not have permission to delete this note");
  }

  // Already deleted - no-op
  if (existing.deletedAt) {
    return;
  }

  await prisma.note.update({
    where: { id: noteId },
    data: { deletedAt: new Date() },
  });

  logger.info({ noteId, userId }, "Note soft deleted");
}

/**
 * Restore a soft-deleted note
 *
 * Clears the deletedAt timestamp to restore the note.
 * Checks workspace permissions if note belongs to a workspace (Story 8.3).
 *
 * @see Story 3.5: Suppression d'une Note
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't have permission to restore the note
 */
export async function restoreNote(noteId: string, userId: string): Promise<void> {
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true, deletedAt: true, workspaceId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // Check delete permission (restoring requires same permission as deleting)
  let canRestore = false;

  if (existing.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    canRestore = await canDeleteNotes(userId, existing.workspaceId);
  } else {
    // Personal note (no workspace) - check ownership
    canRestore = existing.createdById === userId;
  }

  if (!canRestore) {
    throw new ForbiddenError("You do not have permission to restore this note");
  }

  // Not deleted - no-op
  if (!existing.deletedAt) {
    return;
  }

  await prisma.note.update({
    where: { id: noteId },
    data: { deletedAt: null },
  });

  logger.info({ noteId, userId }, "Note restored");
}
