/**
 * Tests for CommentForm Component
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #1 - Zone de saisie de commentaire
 * @see AC: #2 - Écrire et soumettre un commentaire
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentForm } from "./CommentForm";

describe("CommentForm", () => {
  const defaultProps = {
    anchorStart: 10,
    anchorEnd: 25,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render textarea", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.getByRole("textbox", { name: /contenu/i })).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: /envoyer/i })).toBeInTheDocument();
    });

    it("should display selected text as quote", () => {
      render(
        <CommentForm
          {...defaultProps}
          selectedText="Texte sélectionné pour commenter"
        />
      );

      expect(screen.getByText(/texte sélectionné/i)).toBeInTheDocument();
    });

    it("should truncate long selected text", () => {
      const longText = "A".repeat(200);
      render(
        <CommentForm
          {...defaultProps}
          selectedText={longText}
        />
      );

      // Should truncate and add ellipsis
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });

    it("should show cancel button when onCancel provided", () => {
      render(
        <CommentForm
          {...defaultProps}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /annuler/i })).toBeInTheDocument();
    });

    it("should not show cancel button when onCancel not provided", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /annuler/i })).not.toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("should call onSubmit with content and positions", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <CommentForm
          {...defaultProps}
          onSubmit={onSubmit}
        />
      );

      await user.type(screen.getByRole("textbox"), "Mon commentaire");
      await user.click(screen.getByRole("button", { name: /envoyer/i }));

      expect(onSubmit).toHaveBeenCalledWith({
        content: "Mon commentaire",
        anchorStart: 10,
        anchorEnd: 25,
      });
    });

    it("should clear textarea after submission", async () => {
      const user = userEvent.setup();
      render(<CommentForm {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test commentaire");
      await user.click(screen.getByRole("button", { name: /envoyer/i }));

      expect(textarea).toHaveValue("");
    });

    it("should submit on Ctrl+Enter", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <CommentForm
          {...defaultProps}
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Commentaire rapide");
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should trim content before submission", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <CommentForm
          {...defaultProps}
          onSubmit={onSubmit}
        />
      );

      await user.type(screen.getByRole("textbox"), "  Contenu avec espaces  ");
      await user.click(screen.getByRole("button", { name: /envoyer/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Contenu avec espaces",
        })
      );
    });
  });

  describe("validation", () => {
    it("should disable submit button when content is empty", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
    });

    it("should disable submit button when content is only whitespace", async () => {
      const user = userEvent.setup();
      render(<CommentForm {...defaultProps} />);

      await user.type(screen.getByRole("textbox"), "   ");

      expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
    });

    it("should enable submit button when content is valid", async () => {
      const user = userEvent.setup();
      render(<CommentForm {...defaultProps} />);

      await user.type(screen.getByRole("textbox"), "Commentaire valide");

      expect(screen.getByRole("button", { name: /envoyer/i })).not.toBeDisabled();
    });

    it("should show character count when typing", async () => {
      const user = userEvent.setup();
      render(<CommentForm {...defaultProps} />);

      await user.type(screen.getByRole("textbox"), "Test");

      expect(screen.getByText(/caractères restants/i)).toBeInTheDocument();
    });
  });

  describe("cancellation", () => {
    it("should call onCancel when cancel button clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(
        <CommentForm
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: /annuler/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onCancel on Escape key", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(
        <CommentForm
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      await user.type(screen.getByRole("textbox"), "Test");
      await user.keyboard("{Escape}");

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("should disable textarea when submitting", () => {
      render(
        <CommentForm
          {...defaultProps}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should disable submit button when submitting", () => {
      render(
        <CommentForm
          {...defaultProps}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole("button", { name: /envoi/i })).toBeDisabled();
    });

    it("should show loading text on submit button", () => {
      render(
        <CommentForm
          {...defaultProps}
          isSubmitting={true}
        />
      );

      expect(screen.getByText(/envoi\.\.\./i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have form with aria-label", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.getByRole("form", { name: /formulaire de commentaire/i })).toBeInTheDocument();
    });

    it("should focus textarea on mount", () => {
      render(<CommentForm {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });
});
