/**
 * WorkspaceList Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceList } from "./WorkspaceList";
import type { WorkspaceWithCount } from "../types";

// Mock the hooks
vi.mock("../hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(),
}));

import { useWorkspaces } from "../hooks/useWorkspaces";

const mockUseWorkspaces = useWorkspaces as ReturnType<typeof vi.fn>;

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
  {
    id: "workspace-3",
    name: "Documentation",
    description: null,
    icon: "book",
    isPersonal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: "user-1",
    _count: { notes: 1 },
  },
];

describe("WorkspaceList", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when loading", () => {
    mockUseWorkspaces.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByTestId("workspace-list-skeleton")).toBeInTheDocument();
  });

  it("renders error message when error occurs", () => {
    mockUseWorkspaces.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch workspaces"),
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Erreur lors du chargement des workspaces: Failed to fetch workspaces"
    );
  });

  it("renders empty state when no workspaces", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByTestId("workspace-list-empty")).toBeInTheDocument();
    expect(screen.getByText("Aucun workspace cree")).toBeInTheDocument();
  });

  it("renders workspace list with items", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByTestId("workspace-list")).toBeInTheDocument();
    expect(screen.getByText("Mon Projet")).toBeInTheDocument();
    // "Personnel" appears both as workspace name and badge, use test id
    expect(screen.getByTestId("workspace-item-workspace-2")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
  });

  it("shows personal badge for personal workspaces", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    // Should show only one "Personnel" badge (for the personal workspace)
    const personalBadges = screen.getAllByText("Personnel");
    expect(personalBadges.length).toBe(2); // workspace name + badge
  });

  it("shows note count badge when notes exist", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("5 notes")).toBeInTheDocument();
    expect(screen.getByText("1 note")).toBeInTheDocument();
    // No badge for 0 notes
    expect(screen.queryByText("0 note")).not.toBeInTheDocument();
  });

  it("shows workspace description when available", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(
      screen.getByText("Un workspace pour mon projet")
    ).toBeInTheDocument();
    expect(screen.getByText("Mon workspace personnel")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButton = screen.getByLabelText("Modifier Mon Projet");
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockWorkspaces[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByLabelText("Supprimer Mon Projet");
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockWorkspaces[0]);
  });

  it("renders workspace items with correct test ids", () => {
    mockUseWorkspaces.mockReturnValue({
      data: { data: mockWorkspaces },
      isLoading: false,
      error: null,
    });

    render(<WorkspaceList onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByTestId("workspace-item-workspace-1")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-item-workspace-2")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-item-workspace-3")).toBeInTheDocument();
  });
});
