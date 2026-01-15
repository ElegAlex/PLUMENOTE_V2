/**
 * Tests for Workspace Members Service
 *
 * @see Story 8.3: Permissions par Workspace
 * @see Story 8.5: Espace Personnel Prive - Blocking members on personal workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
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

import { addMember } from "./workspace-members.service";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";

describe("Workspace Members Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addMember", () => {
    it("should add member to team workspace successfully", async () => {
      const mockMember = {
        id: "member-1",
        role: "EDITOR",
        workspaceId: "ws-team",
        userId: "user-2",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-2",
          name: "Test User",
          email: "test@example.com",
          avatar: null,
        },
      };

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-team",
        ownerId: "user-1",
        isPersonal: false,
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.workspaceMember.create).mockResolvedValue(mockMember as any);

      const result = await addMember("ws-team", {
        userId: "user-2",
        role: "EDITOR",
      });

      expect(result).toEqual(mockMember);
      expect(vi.mocked(prisma.workspaceMember.create)).toHaveBeenCalled();
    });

    it("should throw NotFoundError when workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(
        addMember("ws-nonexistent", { userId: "user-2", role: "EDITOR" })
      ).rejects.toThrow(NotFoundError);
    });

    // Story 8.5: Personal workspace member blocking
    it("should throw ForbiddenError when adding member to personal workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-personal",
        ownerId: "user-1",
        isPersonal: true,
      } as any);

      await expect(
        addMember("ws-personal", { userId: "user-2", role: "EDITOR" })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        addMember("ws-personal", { userId: "user-2", role: "EDITOR" })
      ).rejects.toThrow("Impossible d'ajouter des membres à un espace personnel");
    });

    it("should throw ForbiddenError with correct error type for personal workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-personal",
        ownerId: "user-1",
        isPersonal: true,
      } as any);

      try {
        await addMember("ws-personal", { userId: "user-2", role: "EDITOR" });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).errorType).toBe("workspace-personal-no-members");
      }
    });

    it("should throw ConflictError when adding owner as member", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-team",
        ownerId: "user-1",
        isPersonal: false,
      } as any);

      await expect(
        addMember("ws-team", { userId: "user-1", role: "EDITOR" })
      ).rejects.toThrow(ConflictError);
      await expect(
        addMember("ws-team", { userId: "user-1", role: "EDITOR" })
      ).rejects.toThrow("Cannot add workspace owner as a member");
    });

    it("should throw NotFoundError when user not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-team",
        ownerId: "user-1",
        isPersonal: false,
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        addMember("ws-team", { userId: "user-nonexistent", role: "EDITOR" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ConflictError when user already a member", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-team",
        ownerId: "user-1",
        isPersonal: false,
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2" } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
        id: "existing-member",
      } as any);

      await expect(
        addMember("ws-team", { userId: "user-2", role: "EDITOR" })
      ).rejects.toThrow(ConflictError);
      await expect(
        addMember("ws-team", { userId: "user-2", role: "EDITOR" })
      ).rejects.toThrow("User is already a member of this workspace");
    });
  });
});
