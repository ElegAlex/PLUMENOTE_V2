/**
 * Tests for Personal Workspace Service
 *
 * @see Story 8.5: Espace Personnel Prive
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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
  getOrCreatePersonalWorkspace,
  getPersonalWorkspace,
  isPersonalWorkspace,
  ensurePersonalWorkspaceExists,
  createPersonalWorkspaceInTransaction,
  PERSONAL_WORKSPACE_NAME,
  PERSONAL_WORKSPACE_ICON,
} from "./personal-workspace.service";
import { prisma } from "@/lib/prisma";

describe("Personal Workspace Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreatePersonalWorkspace", () => {
    it("should return existing personal workspace if it exists", async () => {
      const existingWorkspace = {
        id: "ws-1",
        name: PERSONAL_WORKSPACE_NAME,
        icon: PERSONAL_WORKSPACE_ICON,
        isPersonal: true,
        ownerId: "user-1",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(existingWorkspace as any);

      const result = await getOrCreatePersonalWorkspace("user-1");

      expect(result).toEqual(existingWorkspace);
      expect(vi.mocked(prisma.workspace.findFirst)).toHaveBeenCalledWith({
        where: {
          ownerId: "user-1",
          isPersonal: true,
        },
        select: expect.any(Object),
      });
      expect(vi.mocked(prisma.workspace.create)).not.toHaveBeenCalled();
    });

    it("should create new personal workspace if none exists", async () => {
      const newWorkspace = {
        id: "ws-new",
        name: PERSONAL_WORKSPACE_NAME,
        icon: PERSONAL_WORKSPACE_ICON,
        isPersonal: true,
        ownerId: "user-1",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.workspace.create).mockResolvedValue(newWorkspace as any);

      const result = await getOrCreatePersonalWorkspace("user-1");

      expect(result).toEqual(newWorkspace);
      expect(vi.mocked(prisma.workspace.create)).toHaveBeenCalledWith({
        data: {
          name: PERSONAL_WORKSPACE_NAME,
          icon: PERSONAL_WORKSPACE_ICON,
          isPersonal: true,
          ownerId: "user-1",
        },
        select: expect.any(Object),
      });
    });
  });

  describe("getPersonalWorkspace", () => {
    it("should return personal workspace if exists", async () => {
      const workspace = {
        id: "ws-1",
        name: PERSONAL_WORKSPACE_NAME,
        isPersonal: true,
        ownerId: "user-1",
      };

      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(workspace as any);

      const result = await getPersonalWorkspace("user-1");

      expect(result).toEqual(workspace);
    });

    it("should return null if personal workspace does not exist", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const result = await getPersonalWorkspace("user-1");

      expect(result).toBeNull();
    });
  });

  describe("isPersonalWorkspace", () => {
    it("should return true for personal workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({ isPersonal: true } as any);

      const result = await isPersonalWorkspace("ws-personal");

      expect(result).toBe(true);
    });

    it("should return false for team workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({ isPersonal: false } as any);

      const result = await isPersonalWorkspace("ws-team");

      expect(result).toBe(false);
    });

    it("should return false for non-existent workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const result = await isPersonalWorkspace("ws-nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("ensurePersonalWorkspaceExists", () => {
    it("should call getOrCreatePersonalWorkspace", async () => {
      const workspace = {
        id: "ws-1",
        name: PERSONAL_WORKSPACE_NAME,
        isPersonal: true,
        ownerId: "user-1",
      };

      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(workspace as any);

      const result = await ensurePersonalWorkspaceExists("user-1");

      expect(result).toEqual(workspace);
    });
  });

  describe("createPersonalWorkspaceInTransaction", () => {
    it("should create personal workspace using transaction client", async () => {
      const mockTx = {
        workspace: {
          create: vi.fn(),
        },
      };

      const newWorkspace = {
        id: "ws-new",
        name: PERSONAL_WORKSPACE_NAME,
        icon: PERSONAL_WORKSPACE_ICON,
        isPersonal: true,
        ownerId: "user-1",
      };

      mockTx.workspace.create.mockResolvedValue(newWorkspace);

      const result = await createPersonalWorkspaceInTransaction(
        mockTx as any,
        "user-1"
      );

      expect(result).toEqual(newWorkspace);
      expect(mockTx.workspace.create).toHaveBeenCalledWith({
        data: {
          name: PERSONAL_WORKSPACE_NAME,
          icon: PERSONAL_WORKSPACE_ICON,
          isPersonal: true,
          ownerId: "user-1",
        },
        select: expect.any(Object),
      });
    });
  });

  describe("constants", () => {
    it("should export correct personal workspace name", () => {
      expect(PERSONAL_WORKSPACE_NAME).toBe("Mon espace");
    });

    it("should export correct personal workspace icon", () => {
      expect(PERSONAL_WORKSPACE_ICON).toBe("user");
    });
  });
});
