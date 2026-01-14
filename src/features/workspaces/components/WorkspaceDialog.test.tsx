/**
 * WorkspaceDialog Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceDialog } from "./WorkspaceDialog";
import type { Workspace } from "../types";

// Mock the hooks
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

import { useWorkspacesMutation } from "../hooks/useWorkspacesMutation";
import { toast } from "sonner";

const mockUseWorkspacesMutation = useWorkspacesMutation as ReturnType<typeof vi.fn>;

const mockWorkspace: Workspace = {
  id: "workspace-1",
  name: "Test Workspace",
  description: "Test description",
  icon: "briefcase",
  isPersonal: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerId: "user-1",
};

describe("WorkspaceDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockCreateWorkspaceAsync = vi.fn();
  const mockUpdateWorkspaceAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorkspaceAsync.mockResolvedValue(mockWorkspace);
    mockUpdateWorkspaceAsync.mockResolvedValue(mockWorkspace);
    mockUseWorkspacesMutation.mockReturnValue({
      createWorkspaceAsync: mockCreateWorkspaceAsync,
      isCreating: false,
      updateWorkspaceAsync: mockUpdateWorkspaceAsync,
      isUpdating: false,
    });
  });

  it("renders in create mode when no workspace provided", () => {
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    expect(screen.getByTestId("workspace-dialog")).toBeInTheDocument();
    expect(screen.getByText("Nouveau workspace")).toBeInTheDocument();
  });

  it("renders in edit mode when workspace provided", () => {
    render(
      <WorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspace}
      />
    );

    expect(screen.getByText("Modifier le workspace")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-name-input")).toHaveValue("Test Workspace");
  });

  it("calls createWorkspaceAsync on submit in create mode", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    await user.type(screen.getByTestId("workspace-name-input"), "New Workspace");
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(mockCreateWorkspaceAsync).toHaveBeenCalled();
    });
  });

  it("calls updateWorkspaceAsync on submit in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workspace={mockWorkspace}
      />
    );

    await user.clear(screen.getByTestId("workspace-name-input"));
    await user.type(screen.getByTestId("workspace-name-input"), "Updated Name");
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(mockUpdateWorkspaceAsync).toHaveBeenCalledWith({
        id: "workspace-1",
        data: expect.objectContaining({ name: "Updated Name" }),
      });
    });
  });

  it("shows success toast on successful create", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    await user.type(screen.getByTestId("workspace-name-input"), "New Workspace");
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Workspace "New Workspace" cree');
    });
  });

  it("shows error toast on failed create", async () => {
    mockCreateWorkspaceAsync.mockRejectedValueOnce(new Error("Creation failed"));
    const user = userEvent.setup();
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    await user.type(screen.getByTestId("workspace-name-input"), "New Workspace");
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });
  });

  it("closes dialog on successful submit", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    await user.type(screen.getByTestId("workspace-name-input"), "New Workspace");
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("closes dialog on cancel", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    await user.click(screen.getByTestId("workspace-form-cancel"));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
