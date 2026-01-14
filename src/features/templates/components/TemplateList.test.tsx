/**
 * TemplateList Component Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateList } from "./TemplateList";
import type { Template } from "../types";

// Mock the hooks
vi.mock("../hooks/useTemplates", () => ({
  useTemplates: vi.fn(),
}));

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

import { useTemplates } from "../hooks/useTemplates";
import { useTemplatesMutation } from "../hooks/useTemplatesMutation";
import { toast } from "sonner";

const mockUseTemplates = useTemplates as ReturnType<typeof vi.fn>;
const mockUseTemplatesMutation = useTemplatesMutation as ReturnType<typeof vi.fn>;

const mockTemplates: Template[] = [
  {
    id: "template-1",
    name: "Fiche Serveur",
    description: "Template pour documenter un serveur",
    content: "<p>Serveur content</p>",
    icon: "server",
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "template-2",
    name: "System Template",
    description: "A system template",
    content: "<p>System content</p>",
    icon: "file-text",
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: null,
  },
];

describe("TemplateList", () => {
  const mockOnEdit = vi.fn();
  const mockDeleteTemplateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTemplatesMutation.mockReturnValue({
      deleteTemplateAsync: mockDeleteTemplateAsync,
      isDeleting: false,
    });
  });

  it("renders loading skeleton when loading", () => {
    mockUseTemplates.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<TemplateList onEdit={mockOnEdit} />);

    // Should show skeleton with animate-pulse class
    expect(container.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("renders error message when error occurs", () => {
    mockUseTemplates.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch"),
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to fetch");
  });

  it("renders empty state when no templates", () => {
    mockUseTemplates.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    expect(screen.getByText("Aucun template cree")).toBeInTheDocument();
  });

  it("renders template list with items", () => {
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
    expect(screen.getByText("System Template")).toBeInTheDocument();
    expect(screen.getByText("Template pour documenter un serveur")).toBeInTheDocument();
  });

  it("shows system badge for system templates", () => {
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    expect(screen.getByText("Systeme")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const editButton = screen.getByLabelText("Modifier Fiche Serveur");
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it("disables delete button for system templates", () => {
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const systemDeleteButton = screen.getByLabelText(
      "Les templates systeme ne peuvent pas etre supprimes"
    );
    expect(systemDeleteButton).toBeDisabled();
  });

  it("opens delete confirmation dialog when delete is clicked", async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const deleteButton = screen.getByLabelText("Supprimer Fiche Serveur");
    await user.click(deleteButton);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
  });

  it("calls deleteTemplateAsync when delete is confirmed", async () => {
    const user = userEvent.setup();
    mockDeleteTemplateAsync.mockResolvedValueOnce(undefined);
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const deleteButton = screen.getByLabelText("Supprimer Fiche Serveur");
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Supprimer" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteTemplateAsync).toHaveBeenCalledWith("template-1");
    });
  });

  it("shows success toast after successful delete", async () => {
    const user = userEvent.setup();
    mockDeleteTemplateAsync.mockResolvedValueOnce(undefined);
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const deleteButton = screen.getByLabelText("Supprimer Fiche Serveur");
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Supprimer" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Template "Fiche Serveur" supprime');
    });
  });

  it("shows error toast when delete fails", async () => {
    const user = userEvent.setup();
    mockDeleteTemplateAsync.mockRejectedValueOnce(new Error("Delete failed"));
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const deleteButton = screen.getByLabelText("Supprimer Fiche Serveur");
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Supprimer" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    mockUseTemplates.mockReturnValue({
      data: { data: mockTemplates },
      isLoading: false,
      error: null,
    });

    render(<TemplateList onEdit={mockOnEdit} />);

    const deleteButton = screen.getByLabelText("Supprimer Fiche Serveur");
    await user.click(deleteButton);

    expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Annuler" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Confirmer la suppression")).not.toBeInTheDocument();
    });
  });
});
