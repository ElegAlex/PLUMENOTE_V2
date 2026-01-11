import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteHeader, type SaveStatus } from "./NoteHeader";

describe("NoteHeader", () => {
  const defaultProps = {
    title: "Test Note",
    onTitleChange: vi.fn(),
    saveStatus: "idle" as SaveStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Title Input", () => {
    it("renders with the provided title", () => {
      render(<NoteHeader {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      expect(input).toHaveValue("Test Note");
    });

    it("calls onTitleChange when title is edited", async () => {
      const user = userEvent.setup();
      const onTitleChange = vi.fn();
      render(<NoteHeader {...defaultProps} onTitleChange={onTitleChange} />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      await user.clear(input);
      await user.type(input, "New Title");

      // onTitleChange is called for each character
      expect(onTitleChange).toHaveBeenCalled();
    });

    it("shows placeholder when title is empty", () => {
      render(<NoteHeader {...defaultProps} title="" placeholder="Sans titre" />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      expect(input).toHaveAttribute("placeholder", "Sans titre");
    });

    it("auto-focuses and selects text for new notes", () => {
      render(<NoteHeader {...defaultProps} title="Sans titre" isNewNote={true} />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      expect(document.activeElement).toBe(input);
    });

    it("does not auto-focus for existing notes", () => {
      render(<NoteHeader {...defaultProps} isNewNote={false} />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      expect(document.activeElement).not.toBe(input);
    });

    it("respects maxLength constraint", () => {
      render(<NoteHeader {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /titre de la note/i });
      expect(input).toHaveAttribute("maxLength", "255");
    });
  });

  describe("Save Status Indicator", () => {
    it("shows nothing for idle status", () => {
      render(<NoteHeader {...defaultProps} saveStatus="idle" />);

      // The indicator should be invisible (opacity-0)
      const status = screen.getByRole("status");
      expect(status).toHaveClass("opacity-0");
    });

    it("shows saving indicator", () => {
      render(<NoteHeader {...defaultProps} saveStatus="saving" />);

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Sauvegarde...");
    });

    it("shows saved indicator", () => {
      render(<NoteHeader {...defaultProps} saveStatus="saved" />);

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Sauvegardé");
    });

    it("shows error indicator", () => {
      render(<NoteHeader {...defaultProps} saveStatus="error" />);

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Erreur");
    });

    it("shows offline indicator", () => {
      render(<NoteHeader {...defaultProps} saveStatus="offline" />);

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Hors ligne");
    });
  });

  describe("Accessibility", () => {
    it("has accessible name for title input", () => {
      render(<NoteHeader {...defaultProps} />);

      const input = screen.getByLabelText(/titre de la note/i);
      expect(input).toBeInTheDocument();
    });

    it("has live region for save status", () => {
      render(<NoteHeader {...defaultProps} saveStatus="saving" />);

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
    });
  });
});
