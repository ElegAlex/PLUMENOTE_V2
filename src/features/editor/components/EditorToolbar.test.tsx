/**
 * Unit tests for EditorToolbar component
 *
 * Tests toolbar buttons and accessibility.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditorToolbar } from "./EditorToolbar";

// Create a mock editor factory
function createMockEditor(activeStates: Record<string, boolean> = {}) {
  return {
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleHeading: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
        toggleCode: () => ({ run: vi.fn() }),
        toggleCodeBlock: () => ({ run: vi.fn() }),
      }),
    }),
    isActive: (type: string, attrs?: { level?: number }) => {
      if (attrs?.level) {
        return activeStates[`${type}-${attrs.level}`] ?? false;
      }
      return activeStates[type] ?? false;
    },
  };
}

describe("EditorToolbar", () => {
  it("should return null when editor is null", () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render toolbar with all buttons", () => {
    const mockEditor = createMockEditor();
    render(<EditorToolbar editor={mockEditor as never} />);

    // Check toolbar is rendered
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByRole("toolbar")).toHaveAttribute(
      "aria-label",
      "Formatting options"
    );

    // Check all buttons are present
    expect(screen.getByLabelText("Bold (Ctrl+B)")).toBeInTheDocument();
    expect(screen.getByLabelText("Italic (Ctrl+I)")).toBeInTheDocument();
    expect(screen.getByLabelText("Heading 1 (Ctrl+Alt+1)")).toBeInTheDocument();
    expect(screen.getByLabelText("Heading 2 (Ctrl+Alt+2)")).toBeInTheDocument();
    expect(screen.getByLabelText("Heading 3 (Ctrl+Alt+3)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bullet list")).toBeInTheDocument();
    expect(screen.getByLabelText("Numbered list")).toBeInTheDocument();
    expect(screen.getByLabelText("Inline code")).toBeInTheDocument();
    expect(screen.getByLabelText("Code block")).toBeInTheDocument();
  });

  it("should show active state for bold button", () => {
    const mockEditor = createMockEditor({ bold: true });
    render(<EditorToolbar editor={mockEditor as never} />);

    const boldButton = screen.getByLabelText("Bold (Ctrl+B)");
    expect(boldButton).toHaveAttribute("data-state", "on");
  });

  it("should show active state for italic button", () => {
    const mockEditor = createMockEditor({ italic: true });
    render(<EditorToolbar editor={mockEditor as never} />);

    const italicButton = screen.getByLabelText("Italic (Ctrl+I)");
    expect(italicButton).toHaveAttribute("data-state", "on");
  });

  it("should show active state for heading buttons", () => {
    const mockEditor = createMockEditor({ "heading-2": true });
    render(<EditorToolbar editor={mockEditor as never} />);

    const h1Button = screen.getByLabelText("Heading 1 (Ctrl+Alt+1)");
    const h2Button = screen.getByLabelText("Heading 2 (Ctrl+Alt+2)");
    const h3Button = screen.getByLabelText("Heading 3 (Ctrl+Alt+3)");

    expect(h1Button).toHaveAttribute("data-state", "off");
    expect(h2Button).toHaveAttribute("data-state", "on");
    expect(h3Button).toHaveAttribute("data-state", "off");
  });

  it("should call toggle functions when buttons are clicked", () => {
    const toggleBoldRun = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: toggleBoldRun }),
          toggleItalic: () => ({ run: vi.fn() }),
          toggleHeading: () => ({ run: vi.fn() }),
          toggleBulletList: () => ({ run: vi.fn() }),
          toggleOrderedList: () => ({ run: vi.fn() }),
          toggleCode: () => ({ run: vi.fn() }),
          toggleCodeBlock: () => ({ run: vi.fn() }),
        }),
      }),
      isActive: () => false,
    };

    render(<EditorToolbar editor={mockEditor as never} />);

    const boldButton = screen.getByLabelText("Bold (Ctrl+B)");
    fireEvent.click(boldButton);

    expect(toggleBoldRun).toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    const mockEditor = createMockEditor();
    render(<EditorToolbar editor={mockEditor as never} className="custom-toolbar" />);

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveClass("custom-toolbar");
  });

  it("should have proper separators between button groups", () => {
    const mockEditor = createMockEditor();
    const { container } = render(<EditorToolbar editor={mockEditor as never} />);

    // Check that separators exist
    const separators = container.querySelectorAll('[data-orientation="vertical"]');
    expect(separators.length).toBe(3); // Between text, headings, lists, and code groups
  });
});
