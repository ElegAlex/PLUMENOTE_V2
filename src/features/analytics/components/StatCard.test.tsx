/**
 * @vitest-environment jsdom
 * Tests for StatCard component
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  const defaultProps = {
    title: "Total notes",
    value: 150,
    icon: FileText,
    description: "Notes non-supprimées",
  };

  describe("rendering", () => {
    it("should render title", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText("Total notes")).toBeInTheDocument();
    });

    it("should render formatted value", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText("Notes non-supprimées")).toBeInTheDocument();
    });

    it("should not render description when not provided", () => {
      const { description, ...propsWithoutDesc } = defaultProps;
      render(<StatCard {...propsWithoutDesc} />);
      expect(screen.queryByText("Notes non-supprimées")).not.toBeInTheDocument();
    });

    it("should render icon", () => {
      render(<StatCard {...defaultProps} />);
      // Icon should be aria-hidden
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when loading", () => {
      render(<StatCard {...defaultProps} loading={true} />);

      // Should have aria-busy attribute
      const card = document.querySelector('[aria-busy="true"]');
      expect(card).toBeInTheDocument();
    });

    it("should not show value when loading", () => {
      render(<StatCard {...defaultProps} loading={true} />);
      expect(screen.queryByText("150")).not.toBeInTheDocument();
    });

    it("should not show title text when loading", () => {
      render(<StatCard {...defaultProps} loading={true} />);
      expect(screen.queryByText("Total notes")).not.toBeInTheDocument();
    });
  });

  describe("value formatting", () => {
    it("should format large numbers with k suffix", () => {
      render(<StatCard {...defaultProps} value={1500} />);
      expect(screen.getByText("1.5k")).toBeInTheDocument();
    });

    it("should format very large numbers", () => {
      render(<StatCard {...defaultProps} value={15000} />);
      expect(screen.getByText("15k")).toBeInTheDocument();
    });

    it("should display small numbers as-is", () => {
      render(<StatCard {...defaultProps} value={42} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should handle zero value", () => {
      render(<StatCard {...defaultProps} value={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
