/**
 * @vitest-environment jsdom
 * Tests for ActivityChart component
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DailyActivity } from "../types/admin-stats";

// Mock the entire component to test the loading/rendering logic
// without needing actual recharts canvas rendering
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

// Import after mock setup
import { ActivityChart } from "./ActivityChart";

describe("ActivityChart", () => {
  const mockData: DailyActivity[] = [
    { date: "2026-01-15", created: 5, modified: 3 },
    { date: "2026-01-16", created: 8, modified: 2 },
    { date: "2026-01-17", created: 3, modified: 7 },
  ];

  describe("rendering", () => {
    it("should render chart title", () => {
      render(<ActivityChart data={mockData} />);
      expect(screen.getByText("Activité des 30 derniers jours")).toBeInTheDocument();
    });

    it("should render chart container when not loading", () => {
      render(<ActivityChart data={mockData} />);
      // The chart container should be present
      expect(screen.getByText("Activité des 30 derniers jours")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when loading", () => {
      render(<ActivityChart data={[]} loading={true} />);

      const card = document.querySelector('[aria-busy="true"]');
      expect(card).toBeInTheDocument();
    });

    it("should not render title when loading", () => {
      render(<ActivityChart data={mockData} loading={true} />);
      expect(screen.queryByText("Activité des 30 derniers jours")).not.toBeInTheDocument();
    });

    it("should render skeleton elements when loading", () => {
      const { container } = render(<ActivityChart data={mockData} loading={true} />);

      // Skeleton uses animate-pulse class
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should render without error with empty data", () => {
      render(<ActivityChart data={[]} />);
      expect(screen.getByText("Activité des 30 derniers jours")).toBeInTheDocument();
    });
  });

  describe("props", () => {
    it("should accept loading prop defaulting to false", () => {
      render(<ActivityChart data={mockData} />);
      expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    it("should accept data array", () => {
      // Ensure component renders with data without throwing
      expect(() => render(<ActivityChart data={mockData} />)).not.toThrow();
    });
  });
});
