/**
 * Tests for VersionDayGroup component
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #3 - Groupement par jour
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  VersionDayGroup,
  groupVersionsByDay,
  formatDayLabel,
} from "./VersionDayGroup";
import type { NoteVersionSummary } from "../types";

/**
 * Mock version data factory
 */
function createMockVersion(
  overrides: Partial<NoteVersionSummary> = {}
): NoteVersionSummary {
  return {
    id: "version-1",
    version: 1,
    title: "Test Note",
    createdAt: new Date("2026-01-16T10:00:00Z"),
    noteId: "note-1",
    createdById: "user-1",
    createdBy: { name: "Test User", image: null },
    ...overrides,
  };
}

describe("formatDayLabel", () => {
  it("should return 'Aujourd'hui' for today's date", () => {
    const today = new Date();
    expect(formatDayLabel(today)).toBe("Aujourd'hui");
  });

  it("should return 'Hier' for yesterday's date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDayLabel(yesterday)).toBe("Hier");
  });

  it("should return formatted date for older dates", () => {
    const oldDate = new Date("2026-01-10T10:00:00Z");
    const label = formatDayLabel(oldDate);
    expect(label).toContain("10");
    expect(label).toContain("janvier");
    expect(label).toContain("2026");
  });
});

describe("groupVersionsByDay", () => {
  it("should group versions by day", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const versions = [
      createMockVersion({ id: "v1", createdAt: today }),
      createMockVersion({
        id: "v2",
        createdAt: new Date(today.getTime() - 3600000),
      }), // 1 hour ago
      createMockVersion({ id: "v3", createdAt: yesterday }),
    ];

    const groups = groupVersionsByDay(versions);

    expect(groups).toHaveLength(2);
    expect(groups[0].versions).toHaveLength(2); // Today's versions
    expect(groups[1].versions).toHaveLength(1); // Yesterday's version
  });

  it("should sort groups by date (newest first)", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Add versions in random order
    const versions = [
      createMockVersion({ id: "v1", createdAt: yesterday }),
      createMockVersion({ id: "v2", createdAt: today }),
    ];

    const groups = groupVersionsByDay(versions);

    expect(groups[0].label).toBe("Aujourd'hui");
    expect(groups[1].label).toBe("Hier");
  });

  it("should handle empty array", () => {
    const groups = groupVersionsByDay([]);
    expect(groups).toHaveLength(0);
  });

  it("should handle string dates", () => {
    const versions = [
      createMockVersion({
        id: "v1",
        createdAt: "2026-01-16T10:00:00Z" as unknown as Date,
      }),
      createMockVersion({
        id: "v2",
        createdAt: "2026-01-15T10:00:00Z" as unknown as Date,
      }),
    ];

    const groups = groupVersionsByDay(versions);

    expect(groups).toHaveLength(2);
  });
});

describe("VersionDayGroup", () => {
  describe("rendering", () => {
    it("should render day labels", () => {
      const today = new Date();

      const versions = [createMockVersion({ id: "v1", createdAt: today })];

      render(<VersionDayGroup versions={versions} />);

      expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    });

    it("should render multiple day groups", () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const versions = [
        createMockVersion({ id: "v1", createdAt: today }),
        createMockVersion({ id: "v2", createdAt: yesterday }),
      ];

      render(<VersionDayGroup versions={versions} />);

      expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
      expect(screen.getByText("Hier")).toBeInTheDocument();
    });

    it("should render version items within groups", () => {
      const today = new Date();

      const versions = [
        createMockVersion({ id: "v1", version: 2, createdAt: today }),
        createMockVersion({
          id: "v2",
          version: 1,
          createdAt: new Date(today.getTime() - 3600000),
        }),
      ];

      render(<VersionDayGroup versions={versions} />);

      expect(screen.getByText("v2")).toBeInTheDocument();
      expect(screen.getByText("v1")).toBeInTheDocument();
    });

    it("should render nothing when versions is empty", () => {
      const { container } = render(<VersionDayGroup versions={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("selection", () => {
    it("should highlight selected version", () => {
      const today = new Date();

      const versions = [
        createMockVersion({ id: "v1", version: 1, createdAt: today }),
        createMockVersion({ id: "v2", version: 2, createdAt: today }),
      ];

      render(
        <VersionDayGroup versions={versions} selectedVersionId="v1" />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute("aria-current", "true");
      expect(buttons[1]).not.toHaveAttribute("aria-current");
    });
  });

  describe("interaction", () => {
    it("should call onVersionSelect when version is clicked", () => {
      const onVersionSelect = vi.fn();
      const today = new Date();

      const version = createMockVersion({ id: "v1", createdAt: today });

      render(
        <VersionDayGroup
          versions={[version]}
          onVersionSelect={onVersionSelect}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(onVersionSelect).toHaveBeenCalledTimes(1);
      expect(onVersionSelect).toHaveBeenCalledWith(version);
    });
  });

  describe("accessibility", () => {
    it("should have proper list structure", () => {
      const today = new Date();

      const versions = [createMockVersion({ id: "v1", createdAt: today })];

      render(<VersionDayGroup versions={versions} />);

      expect(
        screen.getByRole("list", { name: /Liste des versions/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("listitem")).toBeInTheDocument();
    });

    it("should have proper group structure", () => {
      const today = new Date();

      const versions = [createMockVersion({ id: "v1", createdAt: today })];

      render(<VersionDayGroup versions={versions} />);

      expect(
        screen.getByRole("group", { name: "Aujourd'hui" })
      ).toBeInTheDocument();
    });
  });
});
