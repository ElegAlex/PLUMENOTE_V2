/**
 * TemplateDialog Component Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateDialog } from "./TemplateDialog";
import type { Template } from "../types";

// Mock the hooks
vi.mock("../hooks/useTemplatesMutation", () => ({
  useTemplatesMutation: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the Editor component
vi.mock("@/features/editor/components/Editor", () => ({
  Editor: vi.fn(({ content, onUpdate, placeholder }) => {
    return (
      <textarea
        data-testid="mock-editor"
        defaultValue={content}
        onChange={(e) => onUpdate?.(e.target.value || "<p></p>")}
        placeholder={placeholder}
      />
    );
  }),
}));

import { useTemplatesMutation } from "../hooks/useTemplatesMutation";
import { toast } from "sonner";

const mockUseTemplatesMutation = useTemplatesMutation as ReturnType<typeof vi.fn>;

const mockTemplate: Template = {
  id: "template-1",
  name: "Test Template",
  description: "Test description",
  content: "<p>Test content</p>",
  icon: "file-text",
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: "user-1",
};

describe("TemplateDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockCreateTemplateAsync = vi.fn();
  const mockUpdateTemplateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTemplateAsync.mockResolvedValue(mockTemplate);
    mockUpdateTemplateAsync.mockResolvedValue(mockTemplate);
    mockUseTemplatesMutation.mockReturnValue({
      createTemplateAsync: mockCreateTemplateAsync,
      isCreating: false,
      updateTemplateAsync: mockUpdateTemplateAsync,
      isUpdating: false,
    });
  });

  it("renders create mode dialog", () => {
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText("Creer un nouveau template")).toBeInTheDocument();
    expect(screen.getByText("Definissez les informations et le contenu de votre nouveau template.")).toBeInTheDocument();
  });

  it("renders edit mode dialog", () => {
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={mockTemplate}
      />
    );

    expect(screen.getByText("Modifier le template")).toBeInTheDocument();
    expect(screen.getByText("Modifiez les informations et le contenu du template.")).toBeInTheDocument();
  });

  it("renders tabs for edit and preview", () => {
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole("tab", { name: "Edition" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Apercu" })).toBeInTheDocument();
  });

  it("switches to preview tab when clicked", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={mockTemplate}
      />
    );

    const previewTab = screen.getByRole("tab", { name: "Apercu" });
    await user.click(previewTab);

    expect(screen.getByText("Apercu du contenu du template tel qu'il apparaitra dans une note.")).toBeInTheDocument();
  });

  it("calls createTemplateAsync on form submit in create mode", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/Nom/), "New Template");

    const editor = screen.getByTestId("mock-editor");
    await user.clear(editor);
    await user.type(editor, "<p>Content</p>");

    // Submit
    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTemplateAsync).toHaveBeenCalled();
    });
  });

  it("calls updateTemplateAsync on form submit in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={mockTemplate}
      />
    );

    // Modify the name
    const nameInput = screen.getByLabelText(/Nom/);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Template");

    // Submit
    const submitButton = screen.getByRole("button", { name: "Mettre a jour" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateTemplateAsync).toHaveBeenCalledWith({
        id: "template-1",
        data: expect.objectContaining({
          name: "Updated Template",
        }),
      });
    });
  });

  it("shows success toast after successful create", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/Nom/), "New Template");
    const editor = screen.getByTestId("mock-editor");
    await user.clear(editor);
    await user.type(editor, "<p>Content</p>");

    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Template "New Template" cree');
    });
  });

  it("shows error toast on create failure", async () => {
    const user = userEvent.setup();
    mockCreateTemplateAsync.mockRejectedValueOnce(new Error("Creation failed"));

    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/Nom/), "New Template");
    const editor = screen.getByTestId("mock-editor");
    await user.clear(editor);
    await user.type(editor, "<p>Content</p>");

    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });
  });

  it("closes dialog on successful submit", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.type(screen.getByLabelText(/Nom/), "New Template");
    const editor = screen.getByTestId("mock-editor");
    await user.clear(editor);
    await user.type(editor, "<p>Content</p>");

    const submitButton = screen.getByRole("button", { name: "Creer" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Annuler" });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when closed", () => {
    render(
      <TemplateDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText("Creer un nouveau template")).not.toBeInTheDocument();
  });

  it("pre-fills form with template data in edit mode", () => {
    render(
      <TemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={mockTemplate}
      />
    );

    expect(screen.getByLabelText(/Nom/)).toHaveValue("Test Template");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Test description");
  });

  // Accessibility tests
  describe("keyboard accessibility", () => {
    it("can navigate between tabs using keyboard", async () => {
      const user = userEvent.setup();
      render(
        <TemplateDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const editTab = screen.getByRole("tab", { name: "Edition" });
      const previewTab = screen.getByRole("tab", { name: "Apercu" });

      // Focus the first tab
      editTab.focus();
      expect(document.activeElement).toBe(editTab);

      // Arrow right should move to preview tab
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(previewTab);

      // Arrow left should move back to edit tab
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toBe(editTab);
    });

    it("can switch tabs using Enter/Space key", async () => {
      const user = userEvent.setup();
      render(
        <TemplateDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          template={mockTemplate}
        />
      );

      const previewTab = screen.getByRole("tab", { name: "Apercu" });
      previewTab.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByText("Apercu du contenu du template tel qu'il apparaitra dans une note.")).toBeInTheDocument();
    });

    it("form elements are focusable via Tab key", async () => {
      const user = userEvent.setup();
      render(
        <TemplateDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Focus first interactive element
      const nameInput = screen.getByLabelText(/Nom/);
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Tab to next element (description)
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/Description/));
    });

    it("dialog has correct aria attributes", () => {
      render(
        <TemplateDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // Dialog is accessible and has proper labeling
      expect(dialog).toHaveAttribute("aria-describedby");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });
  });
});
