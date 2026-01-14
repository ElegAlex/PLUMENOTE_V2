/**
 * WorkspaceForm Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceForm } from "./WorkspaceForm";
import type { Workspace } from "../types";

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

describe("WorkspaceForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders form in create mode", () => {
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByTestId("workspace-form")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-name-input")).toHaveValue("");
    expect(screen.getByTestId("workspace-description-input")).toHaveValue("");
    expect(screen.getByTestId("workspace-form-submit")).toHaveTextContent("Creer");
  });

  it("renders form in edit mode with workspace data", () => {
    render(
      <WorkspaceForm
        workspace={mockWorkspace}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId("workspace-name-input")).toHaveValue("Test Workspace");
    expect(screen.getByTestId("workspace-description-input")).toHaveValue(
      "Test description"
    );
    expect(screen.getByTestId("workspace-form-submit")).toHaveTextContent(
      "Mettre a jour"
    );
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByTestId("workspace-form-submit");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Le nom est requis")).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with form data when valid", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    await user.type(screen.getByTestId("workspace-name-input"), "New Workspace");
    await user.type(
      screen.getByTestId("workspace-description-input"),
      "New description"
    );
    await user.click(screen.getByTestId("workspace-form-submit"));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "New Workspace",
        description: "New description",
        icon: "folder", // default icon
      });
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    await user.click(screen.getByTestId("workspace-form-cancel"));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("disables form fields when isSubmitting is true", () => {
    render(
      <WorkspaceForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByTestId("workspace-name-input")).toBeDisabled();
    expect(screen.getByTestId("workspace-description-input")).toBeDisabled();
    expect(screen.getByTestId("workspace-form-cancel")).toBeDisabled();
    expect(screen.getByTestId("workspace-form-submit")).toBeDisabled();
  });

  it("shows submitting text when isSubmitting is true", () => {
    render(
      <WorkspaceForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByTestId("workspace-form-submit")).toHaveTextContent(
      "Enregistrement..."
    );
  });

  it("renders icon selector", () => {
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Icon selector should be present
    expect(screen.getByText("Icone")).toBeInTheDocument();
  });

  it("renders required field indicator for name", () => {
    render(
      <WorkspaceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
