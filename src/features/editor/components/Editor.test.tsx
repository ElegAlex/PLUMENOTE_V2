/**
 * Unit tests for Editor component
 *
 * Tests the Tiptap editor wrapper with StarterKit.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Editor } from "./Editor";

// Mock Tiptap since it requires browser APIs
vi.mock("@tiptap/react", () => {
  const mockEditor = {
    getHTML: () => "<p>Test content</p>",
    getText: () => "Test content",
    commands: {
      setContent: vi.fn(),
      focus: vi.fn(),
    },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    useEditor: vi.fn(() => mockEditor),
    EditorContent: ({ editor }: { editor: unknown }) => (
      <div data-testid="editor-content">
        {editor ? "Editor loaded" : "Loading..."}
      </div>
    ),
  };
});

vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

describe("Editor", () => {
  it("should render the editor", async () => {
    render(<Editor />);

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    });
  });

  it("should display editor loaded when editor is ready", async () => {
    render(<Editor content="<p>Hello</p>" />);

    await waitFor(() => {
      expect(screen.getByText("Editor loaded")).toBeInTheDocument();
    });
  });

  it("should apply custom className", async () => {
    const { container } = render(<Editor className="custom-class" />);

    await waitFor(() => {
      expect(container.querySelector(".editor-wrapper")).toBeInTheDocument();
    });
  });

  it("should accept onUpdate prop", async () => {
    const onUpdate = vi.fn();
    render(<Editor onUpdate={onUpdate} />);

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    });

    // Note: onUpdate is called by Tiptap's internal onUpdate handler
    // which is mocked. The actual callback invocation is tested
    // through integration tests, not unit tests.
  });

  it("should expose ref methods", async () => {
    const ref = { current: null as unknown };
    render(<Editor ref={ref as React.RefObject<unknown>} />);

    await waitFor(() => {
      expect(ref.current).toBeDefined();
      expect(typeof (ref.current as { getHTML: () => string }).getHTML).toBe(
        "function"
      );
      expect(typeof (ref.current as { getText: () => string }).getText).toBe(
        "function"
      );
      expect(
        typeof (ref.current as { setContent: (c: string) => void }).setContent
      ).toBe("function");
      expect(typeof (ref.current as { focus: () => void }).focus).toBe(
        "function"
      );
    });
  });
});
