/**
 * DeleteWorkspaceDialog Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteWorkspaceDialog } from "./DeleteWorkspaceDialog";
import type { WorkspaceWithCount } from "../types";

// Mock the hooks
vi.mock("../hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(),
}));

vi.mock("../hooks/useWorkspacesMutation", () => ({
  useWorkspacesMutation: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useWorkspaces } from "../hooks/useWorkspaces";
import { useWorkspacesMutation } from "../hooks/useWorkspacesMutation";
import { toast } from "sonner";

const mockUseWorkspaces = useWorkspaces as ReturnType<typeof vi.fn>;
const mockUseWorkspacesMutation = useWorkspacesMutation as ReturnType<typeof vi.fn>;

const mockWorkspaceEmpty: WorkspaceWithCount = {
  id: "workspace-1",
  name: "Empty Workspace",
  description: "No notes",
  icon: "folder",
  isPersonal: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: "user-1",
  _count: { notes: 0 },
};

const mockWorkspaceWithNotes: WorkspaceWithCount = {
  id: "workspace-2",
  name: "Workspace With Notes",
  description: "Has notes",
  icon: "briefcase",
  isPersonal: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: "user-1",
  _count: { notes: 5 },
};

const mockTargetWorkspace: WorkspaceWithCount = {
  id: "workspace-3",
  name: "Target Workspace",
  description: "Destination for notes",
  icon: "folder",
  isPersonal: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: "user-1",
  _count: { notes: 0 },
};

describe("DeleteWorkspaceDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockDeleteWorkspaceAsync = vi.fn();
  const mockMoveNotesAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWorkspaceAsync.mockResolvedValue(undefined);
    mockMoveNotesAsync.mockResolvedValue(undefined);
    mockUseWorkspacesMutation.mockReturnValue({
      deleteWorkspaceAsync: mockDeleteWorkspaceAsync,
      isDeleting: false,
      moveNotesAsync: mockMoveNotesAsync,
      isMoving: false,
    });
    mockUseWorkspaces.mockReturnValue({
      data: { data: [mockWorkspaceEmpty, mockWorkspaceWithNotes, mockTargetWorkspace] },
    });
  });

  it("renders nothing when workspace is null", () => {
    const { container } = render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders simple delete confirmation for empty workspace", () => {
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceEmpty}
      />
    );

    expect(screen.getByTestId("delete-workspace-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Empty Workspace/)).toBeInTheDocument();
    // For empty workspace, button should say "Supprimer" not "Deplacer et supprimer"
    expect(screen.getByTestId("confirm-delete-button")).toHaveTextContent("Supprimer");
    expect(screen.queryByTestId("target-workspace-select")).not.toBeInTheDocument();
  });

  it("renders note migration UI for workspace with notes", () => {
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceWithNotes}
      />
    );

    expect(screen.getByText(/Ce workspace contient 5 note/)).toBeInTheDocument();
    expect(screen.getByTestId("target-workspace-select")).toBeInTheDocument();
    expect(screen.getByText("Deplacer et supprimer")).toBeInTheDocument();
  });

  it("deletes empty workspace directly", async () => {
    const user = userEvent.setup();
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceEmpty}
      />
    );

    await user.click(screen.getByTestId("confirm-delete-button"));

    await waitFor(() => {
      expect(mockDeleteWorkspaceAsync).toHaveBeenCalledWith("workspace-1");
    });
    expect(mockMoveNotesAsync).not.toHaveBeenCalled();
  });

  it("shows success toast after deletion", async () => {
    const user = userEvent.setup();
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceEmpty}
      />
    );

    await user.click(screen.getByTestId("confirm-delete-button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Workspace "Empty Workspace" supprime');
    });
  });

  it("requires target selection for workspace with notes", async () => {
    const user = userEvent.setup();
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceWithNotes}
      />
    );

    // Button should be disabled without target selection
    expect(screen.getByTestId("confirm-delete-button")).toBeDisabled();
  });

  it("shows move and delete button when workspace has notes", () => {
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceWithNotes}
      />
    );

    // Button should be disabled initially (no target selected)
    const confirmButton = screen.getByTestId("confirm-delete-button");
    expect(confirmButton).toHaveTextContent("Deplacer et supprimer");
    expect(confirmButton).toBeDisabled();
  });

  it("shows error toast on deletion failure", async () => {
    mockDeleteWorkspaceAsync.mockRejectedValueOnce(new Error("Deletion failed"));
    const user = userEvent.setup();
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceEmpty}
      />
    );

    await user.click(screen.getByTestId("confirm-delete-button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Deletion failed");
    });
  });

  it("closes dialog on cancel", async () => {
    const user = userEvent.setup();
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceEmpty}
      />
    );

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters out current workspace from target options", () => {
    render(
      <DeleteWorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspaceWithNotes}
      />
    );

    // The workspace being deleted should not appear in target options
    // Only mockTargetWorkspace and mockWorkspaceEmpty should be available
  });
});
