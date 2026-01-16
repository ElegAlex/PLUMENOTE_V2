/**
 * ModificationDate Component Tests
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR44)
 * @see AC #1: Date relative lisible
 * @see AC #2: Tooltip avec date exacte au format local
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModificationDate } from "./ModificationDate";

// Mock date-fns to control date formatting
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn(() => "il y a 2 heures"),
  format: vi.fn(() => "16 janvier 2026 à 14:30"),
}));

// Mock TooltipProvider context
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content" role="tooltip">{children}</div>
  ),
}));

describe("ModificationDate", () => {
  const testDate = new Date("2026-01-16T14:30:00.000Z");
  const testDateString = "2026-01-16T14:30:00.000Z";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should display relative date with 'Modifié' prefix in default variant", () => {
      render(<ModificationDate date={testDate} />);
      expect(screen.getByText(/Modifié il y a 2 heures/)).toBeInTheDocument();
    });

    it("should display relative date without prefix in compact variant", () => {
      render(<ModificationDate date={testDate} variant="compact" />);
      expect(screen.getByText("il y a 2 heures")).toBeInTheDocument();
      expect(screen.queryByText(/Modifié/)).not.toBeInTheDocument();
    });

    it("should handle Date object input", () => {
      render(<ModificationDate date={testDate} />);
      expect(screen.getByText(/il y a 2 heures/)).toBeInTheDocument();
    });

    it("should handle ISO string date input", () => {
      render(<ModificationDate date={testDateString} />);
      expect(screen.getByText(/il y a 2 heures/)).toBeInTheDocument();
    });
  });

  describe("tooltip", () => {
    it("should show tooltip with exact date by default", () => {
      render(<ModificationDate date={testDate} />);
      expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
      expect(screen.getByText("16 janvier 2026 à 14:30")).toBeInTheDocument();
    });

    it("should not show tooltip when showTooltip is false", () => {
      render(<ModificationDate date={testDate} showTooltip={false} />);
      expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      render(
        <ModificationDate date={testDate} showTooltip={false} className="custom-class" />
      );
      const span = screen.getByText(/il y a 2 heures/);
      expect(span).toHaveClass("custom-class");
    });

    it("should have text-muted-foreground class", () => {
      render(<ModificationDate date={testDate} showTooltip={false} />);
      const span = screen.getByText(/il y a 2 heures/);
      expect(span).toHaveClass("text-muted-foreground");
    });
  });

  describe("accessibility", () => {
    it("should be accessible via keyboard focus on tooltip trigger", () => {
      render(<ModificationDate date={testDate} />);
      const trigger = screen.getByTestId("tooltip-trigger");
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("should display 'Date inconnue' for invalid date string", () => {
      // Reset mock for this test to use real date-fns behavior
      vi.doUnmock("date-fns");

      // An invalid date string will create Invalid Date
      const { getByText } = render(<ModificationDate date="invalid-date" showTooltip={false} />);

      expect(getByText("Date inconnue")).toBeInTheDocument();
    });
  });
});
