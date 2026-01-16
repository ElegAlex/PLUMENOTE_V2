/**
 * @vitest-environment node
 * Tests for /api/admin/stats route
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import type { AdminStats } from "@/features/analytics/types/admin-stats";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock admin stats service
vi.mock("@/features/analytics/services/admin-stats.service", () => ({
  getAdminStats: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getAdminStats } from "@/features/analytics/services/admin-stats.service";

const mockAuth = vi.mocked(auth);
const mockGetAdminStats = vi.mocked(getAdminStats);

const mockStats: AdminStats = {
  totalNotes: 100,
  notesThisWeek: 15,
  activeUsers: 10,
  dailyActivity: [],
  topNotes: [],
  topContributors: [],
};

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("/api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(createRequest("/api/admin/stats"));
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.detail).toBe("Authentication required");
    });

    it("should return 401 if session has no user", async () => {
      mockAuth.mockResolvedValue({ user: undefined } as never);

      const response = await GET(createRequest("/api/admin/stats"));
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.detail).toBe("Authentication required");
    });
  });

  describe("authorization", () => {
    it("should return 403 if user is not ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "EDITOR" },
      } as never);

      const response = await GET(createRequest("/api/admin/stats"));
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.detail).toBe("Admin access required to view statistics");
    });

    it("should return 403 for VIEWER role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "VIEWER" },
      } as never);

      const response = await GET(createRequest("/api/admin/stats"));

      expect(response.status).toBe(403);
    });
  });

  describe("successful requests", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as never);
      mockGetAdminStats.mockResolvedValue(mockStats);
    });

    it("should return stats for ADMIN user", async () => {
      const response = await GET(createRequest("/api/admin/stats"));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockStats);
    });

    it("should call getAdminStats without workspaceId by default", async () => {
      await GET(createRequest("/api/admin/stats"));

      expect(mockGetAdminStats).toHaveBeenCalledWith(undefined);
    });

    it("should pass valid workspaceId to service", async () => {
      const validCuid = "cm4qw9e3v0000abcdefghijkl";
      await GET(createRequest(`/api/admin/stats?workspaceId=${validCuid}`));

      expect(mockGetAdminStats).toHaveBeenCalledWith(validCuid);
    });
  });

  describe("workspaceId validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as never);
    });

    it("should return 400 for invalid workspaceId format", async () => {
      const response = await GET(
        createRequest("/api/admin/stats?workspaceId=invalid")
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.detail).toBe("Invalid workspace ID format");
    });

    it("should return 400 for too short workspaceId", async () => {
      const response = await GET(
        createRequest("/api/admin/stats?workspaceId=c123")
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for workspaceId not starting with c", async () => {
      const response = await GET(
        createRequest("/api/admin/stats?workspaceId=x1234567890123456789012345")
      );

      expect(response.status).toBe(400);
    });

    it("should accept valid CUID format", async () => {
      mockGetAdminStats.mockResolvedValue(mockStats);
      const validCuid = "cm4qw9e3v0000abcdefghijkl";

      const response = await GET(
        createRequest(`/api/admin/stats?workspaceId=${validCuid}`)
      );

      expect(response.status).toBe(200);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as never);
    });

    it("should return 500 on service error", async () => {
      mockGetAdminStats.mockRejectedValue(new Error("Database error"));

      const response = await GET(createRequest("/api/admin/stats"));
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.detail).toBe("An error occurred while fetching statistics");
    });
  });
});
