/**
 * Integration tests for versions API endpoints
 *
 * Tests:
 * - GET /api/notes/[id]/versions - List versions
 * - GET /api/notes/[id]/versions/[versionId] - Get version detail
 * - POST /api/notes/snapshot - Create snapshot
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing handlers
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
    },
    noteVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/workspaces/services/permissions.service", () => ({
  canAccessWorkspace: vi.fn(),
  canAccessFolder: vi.fn(),
}));

// Import handlers after mocks
import { GET as getVersionsList } from "@/app/api/notes/[id]/versions/route";
import { GET as getVersionDetail } from "@/app/api/notes/[id]/versions/[versionId]/route";
import { POST as createSnapshot } from "@/app/api/notes/snapshot/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessWorkspace,
  canAccessFolder,
} from "@/features/workspaces/services/permissions.service";

const VALID_CUID = "clx1234567890abcdefghijkl";
const VALID_NOTE_ID = "clx1234567890abcdefghijk1";
const VALID_VERSION_ID = "clx1234567890abcdefghijk2";

const mockSession = {
  user: { id: "user-1", email: "test@example.com" },
  expires: new Date().toISOString(),
};

const mockNote = {
  id: VALID_NOTE_ID,
  workspaceId: null,
  folderId: null,
  createdById: "user-1",
  deletedAt: null,
};

const mockVersion = {
  id: VALID_VERSION_ID,
  version: 1,
  title: "Test Version",
  content: "# Content",
  ydoc: null,
  createdAt: new Date(),
  noteId: VALID_NOTE_ID,
  createdById: "user-1",
  createdBy: { name: "User", image: null },
};

describe("GET /api/notes/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions`)
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return 400 if note ID format is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/invalid-id/versions")
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: "invalid-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 404 if note does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions`)
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain("not-found");
  });

  it("should return 403 if user has no access to note", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      ...mockNote,
      createdById: "other-user",
    });

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions`)
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.type).toContain("forbidden");
  });

  it("should return paginated versions list", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [mockVersion],
      1,
    ]);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions?page=1&pageSize=20`)
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it("should use default pagination when not provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote);
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions`)
    );
    const response = await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(20);
  });

  it("should check workspace permissions for workspace notes", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      ...mockNote,
      workspaceId: "workspace-1",
      folderId: "folder-1",
      createdById: "other-user",
    });
    vi.mocked(canAccessWorkspace).mockResolvedValue(true);
    vi.mocked(canAccessFolder).mockResolvedValue(true);
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions`)
    );
    await getVersionsList(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID }),
    });

    expect(canAccessWorkspace).toHaveBeenCalledWith("user-1", "workspace-1");
    expect(canAccessFolder).toHaveBeenCalledWith("user-1", "folder-1");
  });
});

describe("GET /api/notes/[id]/versions/[versionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVersionWithNote = {
    ...mockVersion,
    note: mockNote,
  };

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return 400 if note ID format is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/invalid-id/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: "invalid-id", versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 400 if version ID format is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/invalid-id`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: "invalid-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 404 if version does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain("not-found");
  });

  it("should return 404 if version belongs to different note", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue({
      ...mockVersionWithNote,
      noteId: "different-note-id",
    });

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
  });

  it("should return 403 if user has no access to note", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue({
      ...mockVersionWithNote,
      note: { ...mockNote, createdById: "other-user" },
    });

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.type).toContain("forbidden");
  });

  it("should return version with full content", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.noteVersion.findUnique).mockResolvedValue(mockVersionWithNote);

    const request = new NextRequest(
      new URL(`http://localhost:3000/api/notes/${VALID_NOTE_ID}/versions/${VALID_VERSION_ID}`)
    );
    const response = await getVersionDetail(request, {
      params: Promise.resolve({ id: VALID_NOTE_ID, versionId: VALID_VERSION_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(VALID_VERSION_ID);
    expect(body.data.title).toBe("Test Version");
    expect(body.data.content).toBe("# Content");
  });
});

describe("POST /api/notes/snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/snapshot"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: VALID_NOTE_ID }),
      }
    );
    const response = await createSnapshot(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.type).toContain("unauthorized");
  });

  it("should return 400 if noteId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/snapshot"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    const response = await createSnapshot(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should return 400 if noteId format is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/snapshot"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: "invalid" }),
      }
    );
    const response = await createSnapshot(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain("validation");
  });

  it("should create snapshot and return result", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      id: VALID_NOTE_ID,
      title: "Test Note",
      content: "# Content",
      ydoc: null,
      workspaceId: null,
      folderId: null,
      createdById: "user-1",
      deletedAt: null,
    });
    vi.mocked(prisma.noteVersion.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.noteVersion.create).mockResolvedValue(mockVersion);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/snapshot"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: VALID_NOTE_ID }),
      }
    );
    const response = await createSnapshot(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.created).toBe(true);
    expect(body.data.reason).toBe("created");
  });

  it("should handle text/plain content type (sendBeacon)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/notes/snapshot"),
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ noteId: VALID_NOTE_ID }),
      }
    );
    const response = await createSnapshot(request);
    const body = await response.json();

    // Should still work with text/plain (sendBeacon sends this)
    expect(response.status).toBe(200);
    expect(body.data.created).toBe(false);
    expect(body.data.reason).toBe("note_not_found");
  });
});
