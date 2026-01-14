/**
 * IconSelector Component Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconSelector, availableIcons, iconLabels } from "./IconSelector";

describe("IconSelector", () => {
  const defaultProps = {
    value: "file-text",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all available icons", () => {
    render(<IconSelector {...defaultProps} />);

    // Should have buttons for all icons
    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(availableIcons.length);
  });

  it("shows tooltip labels for icons", async () => {
    render(<IconSelector {...defaultProps} />);

    // Check that aria-labels are present
    availableIcons.forEach((iconName) => {
      const label = iconLabels[iconName];
      expect(screen.getByRole("radio", { name: label })).toBeInTheDocument();
    });
  });

  it("highlights the selected icon", () => {
    render(<IconSelector {...defaultProps} value="server" />);

    const serverButton = screen.getByRole("radio", { name: "Serveur" });
    expect(serverButton).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange when icon is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IconSelector {...defaultProps} onChange={onChange} />);

    const serverButton = screen.getByRole("radio", { name: "Serveur" });
    await user.click(serverButton);

    expect(onChange).toHaveBeenCalledWith("server");
  });

  it("disables all buttons when disabled prop is true", () => {
    render(<IconSelector {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole("radio");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <IconSelector {...defaultProps} className="custom-class" />
    );

    const grid = container.querySelector(".custom-class");
    expect(grid).toBeInTheDocument();
  });

  it("has proper radiogroup role and label", () => {
    render(<IconSelector {...defaultProps} />);

    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toHaveAttribute(
      "aria-label",
      "Selectionner une icone"
    );
  });

  // Keyboard accessibility tests
  describe("keyboard accessibility", () => {
    it("can select icon using keyboard Enter", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<IconSelector {...defaultProps} onChange={onChange} />);

      const serverButton = screen.getByRole("radio", { name: "Serveur" });
      serverButton.focus();
      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("server");
    });

    it("can select icon using keyboard Space", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<IconSelector {...defaultProps} onChange={onChange} />);

      const serverButton = screen.getByRole("radio", { name: "Serveur" });
      serverButton.focus();
      await user.keyboard(" ");

      expect(onChange).toHaveBeenCalledWith("server");
    });

    it("buttons are focusable via Tab key", async () => {
      const user = userEvent.setup();
      render(<IconSelector {...defaultProps} />);

      const buttons = screen.getAllByRole("radio");
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);

      await user.tab();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it("selected icon has aria-checked true", () => {
      render(<IconSelector {...defaultProps} value="server" />);

      const serverButton = screen.getByRole("radio", { name: "Serveur" });
      const documentButton = screen.getByRole("radio", { name: "Document" });

      expect(serverButton).toHaveAttribute("aria-checked", "true");
      expect(documentButton).toHaveAttribute("aria-checked", "false");
    });
  });
});
