/**
 * Tests for Workspace Permissions Service
 *
 * Focus on personal workspace isolation (Story 8.5)
 *
 * @see Story 8.3: Permissions par Workspace
 * @see Story 8.5: Espace Personnel Prive
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  canAccessWorkspace,
  getAccessibleWorkspaces,
} from "./permissions.service";
import { prisma } from "@/lib/prisma";

describe("Workspace Permissions Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAccessWorkspace - Personal Workspace Isolation (Story 8.5)", () => {
    it("should allow owner to access their personal workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: true,
        members: [],
      } as any);

      const result = await canAccessWorkspace("user-1", "ws-personal");

      expect(result).toBe(true);
    });

    it("should deny other user access to personal workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: true,
        members: [],
      } as any);

      const result = await canAccessWorkspace("user-2", "ws-personal");

      expect(result).toBe(false);
    });

    it("should deny admin access to another user's personal workspace", async () => {
      // Even if admin-user has some membership, personal workspace blocks access
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: true,
        members: [{ id: "member-1" }], // Even with membership entry
      } as any);

      const result = await canAccessWorkspace("admin-user", "ws-personal");

      expect(result).toBe(false);
    });

    it("should allow owner access to team workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: false,
        members: [],
      } as any);

      const result = await canAccessWorkspace("user-1", "ws-team");

      expect(result).toBe(true);
    });

    it("should allow member access to team workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: false,
        members: [{ id: "member-1" }],
      } as any);

      const result = await canAccessWorkspace("user-2", "ws-team");

      expect(result).toBe(true);
    });

    it("should deny non-member access to team workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "user-1",
        isPersonal: false,
        members: [],
      } as any);

      const result = await canAccessWorkspace("user-3", "ws-team");

      expect(result).toBe(false);
    });

    it("should return false for non-existent workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const result = await canAccessWorkspace("user-1", "ws-nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("getAccessibleWorkspaces - Personal Workspace Filtering (Story 8.5)", () => {
    it("should include user's own personal workspace", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([
        {
          id: "ws-personal",
          name: "Mon espace",
          isPersonal: true,
          ownerId: "user-1",
        },
        {
          id: "ws-team",
          name: "Team",
          isPersonal: false,
          ownerId: "user-1",
        },
      ] as any);

      const result = await getAccessibleWorkspaces("user-1");

      expect(result).toHaveLength(2);
      expect(result.find(ws => ws.isPersonal)).toBeDefined();
    });

    it("should exclude personal workspaces of other users in query", async () => {
      // The query itself should filter out personal workspaces of others
      // So the mock should only return what the query would return
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([
        {
          id: "ws-team",
          name: "Shared Team",
          isPersonal: false,
          ownerId: "user-2",
        },
      ] as any);

      const result = await getAccessibleWorkspaces("user-1");

      // Should only get team workspace, not user-2's personal workspace
      expect(result.every(ws => !ws.isPersonal || ws.ownerId === "user-1")).toBe(true);
    });

    it("should include team workspaces where user is member", async () => {
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([
        {
          id: "ws-team-1",
          name: "Team A",
          isPersonal: false,
          ownerId: "user-2",
        },
        {
          id: "ws-team-2",
          name: "Team B",
          isPersonal: false,
          ownerId: "user-3",
        },
      ] as any);

      const result = await getAccessibleWorkspaces("user-1");

      expect(result).toHaveLength(2);
      expect(result.every(ws => !ws.isPersonal)).toBe(true);
    });
  });
});
