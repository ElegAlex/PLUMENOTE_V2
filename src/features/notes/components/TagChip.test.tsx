/**
 * Unit tests for TagChip component
 *
 * Tests rendering and remove button interaction.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagChip } from "./TagChip";
import type { Tag } from "../types";

const mockTag: Tag = {
  id: "tag-1",
  name: "work",
  color: "#3b82f6",
};

describe("TagChip", () => {
  it("should render tag name", () => {
    render(<TagChip tag={mockTag} />);

    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("should apply tag color as text and border", () => {
    const { container } = render(<TagChip tag={mockTag} />);

    const chip = container.querySelector("span");
    expect(chip).toHaveStyle({ color: "#3b82f6" });
    expect(chip).toHaveStyle({ borderColor: "#3b82f6" });
  });

  it("should not show remove button when onRemove is not provided", () => {
    render(<TagChip tag={mockTag} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should show remove button when onRemove is provided", () => {
    const onRemove = vi.fn();
    render(<TagChip tag={mockTag} onRemove={onRemove} />);

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByLabelText("Supprimer le tag work")).toBeInTheDocument();
  });

  it("should call onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<TagChip tag={mockTag} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("should stop propagation when remove button is clicked", () => {
    const onRemove = vi.fn();
    const onClick = vi.fn();

    render(
      <div onClick={onClick}>
        <TagChip tag={mockTag} onRemove={onRemove} />
      </div>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onRemove).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should render compact variant with smaller styling", () => {
    const { container } = render(<TagChip tag={mockTag} variant="compact" />);

    const chip = container.querySelector("span");
    expect(chip).toHaveClass("text-[10px]");
  });

  it("should render default variant with normal styling", () => {
    const { container } = render(<TagChip tag={mockTag} variant="default" />);

    const chip = container.querySelector("span");
    expect(chip).toHaveClass("text-xs");
  });

  describe("loading state", () => {
    it("should show loading spinner when isLoading is true", () => {
      const onRemove = vi.fn();
      const { container } = render(
        <TagChip tag={mockTag} onRemove={onRemove} isLoading />
      );

      // Should have animate-spin class on the loader
      const loader = container.querySelector(".animate-spin");
      expect(loader).toBeInTheDocument();
    });

    it("should apply opacity when isLoading is true", () => {
      const onRemove = vi.fn();
      const { container } = render(
        <TagChip tag={mockTag} onRemove={onRemove} isLoading />
      );

      const chip = container.querySelector("span");
      expect(chip).toHaveClass("opacity-50");
    });

    it("should disable remove button when isLoading is true", () => {
      const onRemove = vi.fn();
      render(<TagChip tag={mockTag} onRemove={onRemove} isLoading />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should not call onRemove when clicked while loading", () => {
      const onRemove = vi.fn();
      render(<TagChip tag={mockTag} onRemove={onRemove} isLoading />);

      fireEvent.click(screen.getByRole("button"));

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe("color handling", () => {
    it("should handle 6-char hex colors", () => {
      const { container } = render(<TagChip tag={mockTag} />);

      const chip = container.querySelector("span");
      // Should have backgroundColor with opacity appended
      expect(chip).toHaveStyle({ backgroundColor: "#3b82f620" });
    });

    it("should handle 3-char hex colors", () => {
      const tagWith3CharHex = { ...mockTag, color: "#f00" };
      const { container } = render(<TagChip tag={tagWith3CharHex} />);

      const chip = container.querySelector("span");
      // Should expand to 6-char and append opacity
      expect(chip).toHaveStyle({ backgroundColor: "#ff000020" });
    });

    it("should handle named colors with color-mix fallback", () => {
      const tagWithNamedColor = { ...mockTag, color: "red" };
      const { container } = render(<TagChip tag={tagWithNamedColor} />);

      const chip = container.querySelector("span");
      // Should use color-mix for named colors
      expect(chip).toHaveStyle({ backgroundColor: "color-mix(in srgb, red 12%, transparent)" });
    });
  });
});
