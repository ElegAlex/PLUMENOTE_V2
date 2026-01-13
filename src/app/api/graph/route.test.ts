/**
 * Tests for GET /api/graph
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Graphe interactif avec notes comme nœuds et liens comme arêtes
 * @see AC: #6 - Chargement < 500ms
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: {
      findMany: vi.fn(),
    },
    folder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/graph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.type).toContain("unauthorized");
  });

  it("returns empty nodes and edges if user has no notes", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.note.findMany as Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.nodes).toEqual([]);
    expect(json.data.edges).toEqual([]);
  });

  it("returns nodes with correct format", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.note.findMany as Mock).mockResolvedValue([
      {
        id: "note-1",
        title: "Test Note",
        sourceLinks: [],
        targetLinks: [],
      },
    ]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.nodes).toHaveLength(1);
    expect(json.data.nodes[0]).toEqual({
      id: "note-1",
      title: "Test Note",
      linkCount: 0,
    });
  });

  it("returns edges for internal links", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.note.findMany as Mock).mockResolvedValue([
      {
        id: "note-1",
        title: "Note 1",
        sourceLinks: [{ targetNoteId: "note-2" }],
        targetLinks: [],
      },
      {
        id: "note-2",
        title: "Note 2",
        sourceLinks: [],
        targetLinks: [{ sourceNoteId: "note-1" }],
      },
    ]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.edges).toHaveLength(1);
    expect(json.data.edges[0]).toEqual({
      source: "note-1",
      target: "note-2",
    });
  });

  it("counts links correctly for each node", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.note.findMany as Mock).mockResolvedValue([
      {
        id: "note-1",
        title: "Hub Note",
        sourceLinks: [{ targetNoteId: "note-2" }, { targetNoteId: "note-3" }],
        targetLinks: [{ sourceNoteId: "note-3" }],
      },
      {
        id: "note-2",
        title: "Note 2",
        sourceLinks: [],
        targetLinks: [{ sourceNoteId: "note-1" }],
      },
      {
        id: "note-3",
        title: "Note 3",
        sourceLinks: [{ targetNoteId: "note-1" }],
        targetLinks: [{ sourceNoteId: "note-1" }],
      },
    ]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();

    const hubNode = json.data.nodes.find((n: { id: string }) => n.id === "note-1");
    expect(hubNode.linkCount).toBe(3); // 2 outgoing + 1 incoming
  });

  it("filters out edges to notes not in the result set", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    // Note links to note-deleted which is not in the result (deleted or different user)
    (prisma.note.findMany as Mock).mockResolvedValue([
      {
        id: "note-1",
        title: "Note 1",
        sourceLinks: [{ targetNoteId: "note-deleted" }],
        targetLinks: [],
      },
    ]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    // Edge should be filtered out because note-deleted is not in nodes
    expect(json.data.edges).toHaveLength(0);
  });

  it("uses 'Sans titre' for notes without title", async () => {
    (auth as Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.note.findMany as Mock).mockResolvedValue([
      {
        id: "note-1",
        title: null,
        sourceLinks: [],
        targetLinks: [],
      },
    ]);

    const request = new NextRequest("http://localhost/api/graph");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.nodes[0].title).toBe("Sans titre");
  });

  // Story 6.9: Folder filtering tests
  describe("folder filtering (Story 6.9)", () => {
    it("returns all notes when folderId is not specified", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.note.findMany as Mock).mockResolvedValue([
        { id: "note-1", title: "Note 1", folderId: "folder-1", sourceLinks: [], targetLinks: [] },
        { id: "note-2", title: "Note 2", folderId: "folder-2", sourceLinks: [], targetLinks: [] },
      ]);

      const request = new NextRequest("http://localhost/api/graph");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.nodes).toHaveLength(2);
      expect(json.data.outOfScopeEdges).toEqual([]);
    });

    it("filters notes by folderId when specified", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      // Mock folder hierarchy
      (prisma.folder.findMany as Mock).mockResolvedValue([]);
      // Mock notes - only note-1 is in folder-1
      (prisma.note.findMany as Mock).mockResolvedValue([
        { id: "note-1", title: "Note 1", folderId: "folder-1", sourceLinks: [], targetLinks: [] },
      ]);

      const request = new NextRequest("http://localhost/api/graph?folderId=folder-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.nodes).toHaveLength(1);
      expect(json.data.nodes[0].id).toBe("note-1");
    });

    it("includes notes from sub-folders when filtering recursively", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      // Mock folder hierarchy: folder-1 -> folder-1a (child)
      (prisma.folder.findMany as Mock).mockResolvedValue([
        { id: "folder-1a", parentId: "folder-1" },
      ]);
      // Mock notes in parent and child folders
      (prisma.note.findMany as Mock).mockResolvedValue([
        { id: "note-1", title: "Note in parent", folderId: "folder-1", sourceLinks: [], targetLinks: [] },
        { id: "note-2", title: "Note in child", folderId: "folder-1a", sourceLinks: [], targetLinks: [] },
      ]);

      const request = new NextRequest("http://localhost/api/graph?folderId=folder-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.nodes).toHaveLength(2);
    });

    it("returns outOfScopeEdges for connections to notes outside the folder", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      // No sub-folders
      (prisma.folder.findMany as Mock).mockResolvedValue([]);
      // note-1 is in folder-1 and links to note-2 which is outside
      (prisma.note.findMany as Mock).mockResolvedValue([
        {
          id: "note-1",
          title: "Note in scope",
          folderId: "folder-1",
          sourceLinks: [{ targetNoteId: "note-2" }],
          targetLinks: []
        },
      ]);

      const request = new NextRequest("http://localhost/api/graph?folderId=folder-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.nodes).toHaveLength(1);
      expect(json.data.edges).toEqual([]); // No in-scope edges
      expect(json.data.outOfScopeEdges).toHaveLength(1);
      expect(json.data.outOfScopeEdges[0]).toEqual({
        source: "note-1",
        target: "note-2",
      });
    });

    it("separates in-scope and out-of-scope edges correctly", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.folder.findMany as Mock).mockResolvedValue([]);
      // Two notes in folder, one links internally and one links outside
      (prisma.note.findMany as Mock).mockResolvedValue([
        {
          id: "note-1",
          title: "Note 1",
          folderId: "folder-1",
          sourceLinks: [{ targetNoteId: "note-2" }, { targetNoteId: "note-outside" }],
          targetLinks: []
        },
        {
          id: "note-2",
          title: "Note 2",
          folderId: "folder-1",
          sourceLinks: [],
          targetLinks: [{ sourceNoteId: "note-1" }]
        },
      ]);

      const request = new NextRequest("http://localhost/api/graph?folderId=folder-1");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.nodes).toHaveLength(2);
      // In-scope edge: note-1 -> note-2
      expect(json.data.edges).toHaveLength(1);
      expect(json.data.edges[0]).toEqual({ source: "note-1", target: "note-2" });
      // Out-of-scope edge: note-1 -> note-outside
      expect(json.data.outOfScopeEdges).toHaveLength(1);
      expect(json.data.outOfScopeEdges[0]).toEqual({ source: "note-1", target: "note-outside" });
    });

    it("returns empty outOfScopeEdges when no filtering is applied", async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: "user-1" },
      });
      (prisma.note.findMany as Mock).mockResolvedValue([
        {
          id: "note-1",
          title: "Note 1",
          folderId: "folder-1",
          sourceLinks: [{ targetNoteId: "note-2" }],
          targetLinks: []
        },
        {
          id: "note-2",
          title: "Note 2",
          folderId: "folder-2",
          sourceLinks: [],
          targetLinks: [{ sourceNoteId: "note-1" }]
        },
      ]);

      const request = new NextRequest("http://localhost/api/graph");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      // Without filtering, all edges are in-scope
      expect(json.data.edges).toHaveLength(1);
      expect(json.data.outOfScopeEdges).toEqual([]);
    });
  });
});
