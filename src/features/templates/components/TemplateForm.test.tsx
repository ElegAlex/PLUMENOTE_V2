/**
 * TemplateForm Component Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateForm } from "./TemplateForm";
import type { Template } from "../types";

// Mock the Editor component
vi.mock("@/features/editor/components/Editor", () => ({
  Editor: vi.fn(({ content, onUpdate, placeholder, editable }) => {
    return (
      <textarea
        data-testid="mock-editor"
        defaultValue={content}
        onChange={(e) => onUpdate?.(e.target.value || "<p></p>")}
        placeholder={placeholder}
        disabled={!editable}
      />
    );
  }),
}));

const mockTemplate: Template = {
  id: "template-1",
  name: "Test Template",
  description: "Test description",
  content: "<p>Test content</p>",
  icon: "server",
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: "user-1",
};

describe("TemplateForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders empty form in create mode", () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Nom/)).toHaveValue("");
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Creer" })).toBeInTheDocument();
  });

  it("renders populated form in edit mode", () => {
    render(
      <TemplateForm
        template={mockTemplate}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Nom/)).toHaveValue("Test Template");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Test description");
    expect(screen.getByRole("button", { name: "Mettre a jour" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without name
    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Le nom est requis")).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with form data when valid", async () => {
    const user = userEvent.setup();
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText(/Nom/), "New Template");
    await user.type(screen.getByLabelText(/Description/), "New description");

    // Add content to the mock editor
    const editor = screen.getByTestId("mock-editor");
    await user.clear(editor);
    await user.type(editor, "<p>New content</p>");

    // Submit
    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Template",
          description: "New description",
          icon: "file-text",
        })
      );
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Annuler" });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("disables form during submission", () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByLabelText(/Nom/)).toBeDisabled();
    expect(screen.getByLabelText(/Description/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enregistrement..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
  });

  it("shows content validation error when content is empty", async () => {
    const user = userEvent.setup();
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in name but leave content empty
    await user.type(screen.getByLabelText(/Nom/), "Template Name");

    // Submit
    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Le contenu est requis")).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("renders icon selector", () => {
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check that icon selector is present
    expect(screen.getByRole("radiogroup", { name: "Selectionner une icone" })).toBeInTheDocument();
  });

  it("updates icon when icon selector is used", async () => {
    const user = userEvent.setup();
    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const serverIcon = screen.getByRole("radio", { name: "Serveur" });
    await user.click(serverIcon);

    expect(serverIcon).toHaveAttribute("aria-checked", "true");
  });

  it("calls onContentChange when editor content changes", async () => {
    const user = userEvent.setup();
    const mockOnContentChange = vi.fn();

    render(
      <TemplateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onContentChange={mockOnContentChange}
      />
    );

    const editor = screen.getByTestId("mock-editor");
    await user.type(editor, "New content");

    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalled();
    });
  });
});
