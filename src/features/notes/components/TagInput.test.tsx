/**
 * Unit tests for TagInput component
 *
 * Tests autocomplete, tag selection, and tag creation.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";
import type { Tag } from "../types";

// Mock ResizeObserver for cmdk Command component
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Mock scrollIntoView for cmdk Command component
Element.prototype.scrollIntoView = vi.fn();

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const mockTags: Tag[] = [
  { id: "tag-1", name: "work", color: "#3b82f6" },
  { id: "tag-2", name: "personal", color: "#22c55e" },
  { id: "tag-3", name: "urgent", color: "#ef4444" },
];

describe("TagInput", () => {
  const defaultProps = {
    existingTags: mockTags,
    selectedTagIds: [] as string[],
    onTagSelect: vi.fn(),
    onTagCreate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render input with placeholder", () => {
      render(<TagInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("Ajouter un tag...")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<TagInput {...defaultProps} placeholder="Search tags..." />);

      expect(screen.getByPlaceholderText("Search tags...")).toBeInTheDocument();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<TagInput {...defaultProps} disabled />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      expect(input).toBeDisabled();
    });
  });

  describe("dropdown behavior", () => {
    it("should show dropdown when input is focused", async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText("Tags existants")).toBeInTheDocument();
      });
    });

    it("should close dropdown when clicking outside", async () => {
      render(
        <div>
          <TagInput {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText("Tags existants")).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByTestId("outside"));

      await waitFor(() => {
        expect(screen.queryByText("Tags existants")).not.toBeInTheDocument();
      });
    });
  });

  describe("filtering", () => {
    it("should filter tags based on search input", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "work");

      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.queryByText("personal")).not.toBeInTheDocument();
      expect(screen.queryByText("urgent")).not.toBeInTheDocument();
    });

    it("should filter case-insensitively", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "WORK");

      expect(screen.getByText("work")).toBeInTheDocument();
    });

    it("should exclude already selected tags", async () => {
      render(<TagInput {...defaultProps} selectedTagIds={["tag-1"]} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.queryByText("work")).not.toBeInTheDocument();
        expect(screen.getByText("personal")).toBeInTheDocument();
        expect(screen.getByText("urgent")).toBeInTheDocument();
      });
    });

    it("should show empty message when no tags match", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "nonexistent");

      // Should show create option instead of empty message
      expect(screen.getByText(/Créer/)).toBeInTheDocument();
    });
  });

  describe("tag selection", () => {
    it("should call onTagSelect when a tag is clicked", async () => {
      const onTagSelect = vi.fn();
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} onTagSelect={onTagSelect} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText("work")).toBeInTheDocument();
      });

      await user.click(screen.getByText("work"));

      expect(onTagSelect).toHaveBeenCalledWith("tag-1");
    });

    it("should clear input and close dropdown after selection", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "wo");

      await user.click(screen.getByText("work"));

      expect(input).toHaveValue("");
      expect(screen.queryByText("Tags existants")).not.toBeInTheDocument();
    });
  });

  describe("tag creation", () => {
    it("should show create option when search does not match existing tag exactly", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "newtag");

      expect(screen.getByText(/Créer "newtag"/)).toBeInTheDocument();
    });

    it("should not show create option when search matches existing tag exactly", async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "work");

      expect(screen.queryByText(/Créer "work"/)).not.toBeInTheDocument();
    });

    it("should call onTagCreate and onTagSelect when create is clicked", async () => {
      const onTagCreate = vi.fn().mockResolvedValue({ id: "new-tag", name: "newtag", color: "#888888" });
      const onTagSelect = vi.fn();
      const user = userEvent.setup();

      render(<TagInput {...defaultProps} onTagCreate={onTagCreate} onTagSelect={onTagSelect} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "newtag");

      await user.click(screen.getByText(/Créer "newtag"/));

      await waitFor(() => {
        expect(onTagCreate).toHaveBeenCalledWith("newtag");
        expect(onTagSelect).toHaveBeenCalledWith("new-tag");
      });
    });

    it("should trim whitespace from tag name when creating", async () => {
      const onTagCreate = vi.fn().mockResolvedValue({ id: "new-tag", name: "newtag", color: "#888888" });
      const user = userEvent.setup();

      render(<TagInput {...defaultProps} onTagCreate={onTagCreate} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "  newtag  ");

      await user.click(screen.getByText(/Créer "newtag"/));

      await waitFor(() => {
        expect(onTagCreate).toHaveBeenCalledWith("newtag");
      });
    });

    it("should not show create option for empty search", async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.queryByText(/Créer/)).not.toBeInTheDocument();
      });
    });

    it("should show loading state while creating tag", async () => {
      let resolveCreate: (value: Tag) => void;
      const createPromise = new Promise<Tag>((resolve) => {
        resolveCreate = resolve;
      });
      const onTagCreate = vi.fn().mockReturnValue(createPromise);
      const user = userEvent.setup();

      render(<TagInput {...defaultProps} onTagCreate={onTagCreate} />);

      const input = screen.getByPlaceholderText("Ajouter un tag...");
      await user.click(input);
      await user.type(input, "newtag");

      const createButton = screen.getByText(/Créer "newtag"/).closest("[cmdk-item]");
      await user.click(createButton!);

      // Button should be disabled while creating
      expect(createButton).toHaveAttribute("data-disabled", "true");

      // Resolve the promise
      resolveCreate!({ id: "new-tag", name: "newtag", color: "#888888" });

      await waitFor(() => {
        expect(screen.queryByText(/Créer/)).not.toBeInTheDocument();
      });
    });
  });

  describe("custom className", () => {
    it("should apply custom className to container", () => {
      const { container } = render(
        <TagInput {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });
});
