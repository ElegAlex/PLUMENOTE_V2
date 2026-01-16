/**
 * Unit tests for ViewCount component
 *
 * Tests cover:
 * - Rendering view count with correct formatting
 * - Singular/plural handling (0 vue, 1 vue, 42 vues)
 * - Compact variant (no label)
 * - Tooltip presence and content
 * - Icon presence
 *
 * @see Story 10.2: Affichage du Nombre de Vues
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewCount } from "./ViewCount";

describe("ViewCount", () => {
  describe("rendering", () => {
    it("should render view count with icon", () => {
      render(<ViewCount count={42} />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("vues")).toBeInTheDocument();
    });

    it("should render Eye icon", () => {
      const { container } = render(<ViewCount count={42} />);

      // Eye icon from lucide-react
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("singular/plural", () => {
    it("should show 'vue' (singular) for count of 0", () => {
      render(<ViewCount count={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("vue")).toBeInTheDocument();
    });

    it("should show 'vue' (singular) for count of 1", () => {
      render(<ViewCount count={1} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("vue")).toBeInTheDocument();
    });

    it("should show 'vues' (plural) for count > 1", () => {
      render(<ViewCount count={42} />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("vues")).toBeInTheDocument();
    });
  });

  describe("formatting", () => {
    it("should format thousands with k suffix", () => {
      render(<ViewCount count={1500} />);

      expect(screen.getByText("1.5k")).toBeInTheDocument();
      expect(screen.getByText("vues")).toBeInTheDocument();
    });

    it("should format millions with M suffix", () => {
      render(<ViewCount count={1234567} />);

      expect(screen.getByText("1.2M")).toBeInTheDocument();
      expect(screen.getByText("vues")).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("should show label in default variant", () => {
      render(<ViewCount count={42} variant="default" />);

      expect(screen.getByText("vues")).toBeInTheDocument();
    });

    it("should not show label in compact variant", () => {
      render(<ViewCount count={42} variant="compact" />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.queryByText("vues")).not.toBeInTheDocument();
      expect(screen.queryByText("vue")).not.toBeInTheDocument();
    });

    it("should use smaller text size in compact variant", () => {
      const { container } = render(<ViewCount count={42} variant="compact" />);

      // Check for text-xs class in compact mode
      expect(container.querySelector(".text-xs")).toBeInTheDocument();
    });
  });

  describe("tooltip", () => {
    it("should show tooltip on hover by default", async () => {
      const user = userEvent.setup();
      render(<ViewCount count={42} />);

      const trigger = screen.getByText("42").closest("div");
      expect(trigger).toBeInTheDocument();

      await user.hover(trigger!);

      // Wait for tooltip to appear (may render multiple due to animation)
      const tooltips = await screen.findAllByText(
        "Vues uniques des 30 derniers jours"
      );
      expect(tooltips.length).toBeGreaterThan(0);
    });

    it("should not show tooltip when showTooltip is false", async () => {
      const user = userEvent.setup();
      render(<ViewCount count={42} showTooltip={false} />);

      const trigger = screen.getByText("42").closest("div");
      await user.hover(trigger!);

      // Tooltip should not appear (give it a moment to potentially render)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(
        screen.queryByText("Vues uniques des 30 derniers jours")
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper structure for screen readers", () => {
      const { container } = render(<ViewCount count={42} />);

      // Icon should be decorative (aria-hidden)
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("should have aria-label with full view count text", () => {
      render(<ViewCount count={42} />);

      const element = screen.getByRole("status");
      expect(element).toHaveAttribute("aria-label", "42 vues");
    });

    it("should have aria-label in compact variant for screen readers", () => {
      render(<ViewCount count={1500} variant="compact" />);

      // Even in compact mode (no visible label), screen readers get the full text
      const element = screen.getByRole("status");
      expect(element).toHaveAttribute("aria-label", "1.5k vues");
    });

    it("should use singular in aria-label for count of 1", () => {
      render(<ViewCount count={1} />);

      const element = screen.getByRole("status");
      expect(element).toHaveAttribute("aria-label", "1 vue");
    });
  });

  describe("styling", () => {
    it("should accept custom className", () => {
      const { container } = render(
        <ViewCount count={42} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should use muted text color", () => {
      const { container } = render(<ViewCount count={42} />);

      expect(container.querySelector(".text-muted-foreground")).toBeInTheDocument();
    });
  });
});
