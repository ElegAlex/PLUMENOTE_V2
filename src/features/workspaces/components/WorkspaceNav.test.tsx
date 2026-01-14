/**
 * WorkspaceNav Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceNav } from "./WorkspaceNav";
import type { WorkspaceWithCount } from "../types";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

// Mock the hooks
vi.mock("../hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(),
}));

import { useWorkspaces } from "../hooks/useWorkspaces";
import { usePathname } from "next/navigation";

const mockUseWorkspaces = useWorkspaces as ReturnType<typeof vi.fn>;
const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

const mockWorkspaces: WorkspaceWithCount[] = [
  {
    id: "workspace-1",
    name: "Mon Projet",
    description: "Un workspace pour mon projet",
    icon: "briefcase",
    isPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: "user-1",
    _count: { notes: 5 },
  },
  {
    id: "workspace-2",
    name: "Personnel",
    description: "Mon workspace personnel",
    icon: "folder",
    isPersonal: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: "user-1",
    _count: { notes: 0 },
  },
];

describe("WorkspaceNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders collapsed state with single icon", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceNav showLabels={false} />);

    // Should show icon link to /admin/workspaces
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/workspaces");
  });

  it("renders loading skeleton when loading", () => {
    mockUseWorkspaces.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<WorkspaceNav showLabels={true} />);

    expect(screen.getByText("Workspaces")).toBeInTheDocument();
  });

  it("renders nothing when error occurs", () => {
    mockUseWorkspaces.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch"),
    });

    const { container } = render(<WorkspaceNav showLabels={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no workspaces", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
    });

    const { container } = render(<WorkspaceNav showLabels={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders workspace list with items", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceNav showLabels={true} />);

    expect(screen.getByTestId("workspace-nav")).toBeInTheDocument();
    expect(screen.getByText("Mon Projet")).toBeInTheDocument();
    expect(screen.getByText("Personnel")).toBeInTheDocument();
  });

  it("renders links to workspace pages", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceNav showLabels={true} />);

    const link1 = screen.getByTestId("workspace-nav-item-workspace-1");
    expect(link1).toHaveAttribute("href", "/workspaces/workspace-1");

    const link2 = screen.getByTestId("workspace-nav-item-workspace-2");
    expect(link2).toHaveAttribute("href", "/workspaces/workspace-2");
  });

  it("highlights active workspace based on pathname", () => {
    mockUsePathname.mockReturnValue("/workspaces/workspace-1");
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceNav showLabels={true} />);

    const activeItem = screen.getByTestId("workspace-nav-item-workspace-1");
    // Active item should have bg-accent class
    expect(activeItem.className).toContain("bg-accent");
  });

  it("shows section header Workspaces", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceNav showLabels={true} />);

    expect(screen.getByText("Workspaces")).toBeInTheDocument();
  });
});
