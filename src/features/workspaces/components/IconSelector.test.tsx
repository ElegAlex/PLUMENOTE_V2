/**
 * IconSelector Component Tests
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconSelector, availableIcons, iconLabels } from "./IconSelector";

describe("IconSelector", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders icon grid", () => {
    render(<IconSelector value="folder" onChange={mockOnChange} />);

    expect(screen.getByTestId("icon-selector")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("renders all available icons", () => {
    render(<IconSelector value="folder" onChange={mockOnChange} />);

    availableIcons.forEach((iconName) => {
      expect(screen.getByTestId(`icon-${iconName}`)).toBeInTheDocument();
    });
  });

  it("marks selected icon as checked", () => {
    render(<IconSelector value="briefcase" onChange={mockOnChange} />);

    const briefcaseButton = screen.getByTestId("icon-briefcase");
    expect(briefcaseButton).toHaveAttribute("aria-checked", "true");

    const folderButton = screen.getByTestId("icon-folder");
    expect(folderButton).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when icon is clicked", async () => {
    const user = userEvent.setup();
    render(<IconSelector value="folder" onChange={mockOnChange} />);

    await user.click(screen.getByTestId("icon-users"));

    expect(mockOnChange).toHaveBeenCalledWith("users");
  });

  it("disables all icons when disabled prop is true", () => {
    render(
      <IconSelector value="folder" onChange={mockOnChange} disabled={true} />
    );

    availableIcons.forEach((iconName) => {
      expect(screen.getByTestId(`icon-${iconName}`)).toBeDisabled();
    });
  });

  it("has accessible aria labels for icons", () => {
    render(<IconSelector value="folder" onChange={mockOnChange} />);

    availableIcons.forEach((iconName) => {
      const button = screen.getByTestId(`icon-${iconName}`);
      expect(button).toHaveAttribute("aria-label", iconLabels[iconName]);
    });
  });

  it("uses role=radio for icon buttons", () => {
    render(<IconSelector value="folder" onChange={mockOnChange} />);

    availableIcons.forEach((iconName) => {
      const button = screen.getByTestId(`icon-${iconName}`);
      expect(button).toHaveAttribute("role", "radio");
    });
  });
});
