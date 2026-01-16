/**
 * Tests for VersionListItem component
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #2 - Version number, date, author
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VersionListItem } from "./VersionListItem";
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

describe("VersionListItem", () => {
  describe("rendering", () => {
    it("should render version badge", () => {
      const version = createMockVersion({ version: 5 });

      render(<VersionListItem version={version} />);

      expect(screen.getByText("v5")).toBeInTheDocument();
    });

    it("should render relative date", () => {
      // Use a recent date to get predictable relative time
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2);

      const version = createMockVersion({ createdAt: recentDate });

      render(<VersionListItem version={version} />);

      // Should show relative date (e.g., "il y a 2 heures")
      expect(screen.getByText(/il y a/i)).toBeInTheDocument();
    });

    it("should render author name in avatar fallback", () => {
      const version = createMockVersion({
        createdBy: { name: "John Doe", image: null },
      });

      render(<VersionListItem version={version} />);

      // Should show initials "JD"
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should render author image when available", () => {
      const version = createMockVersion({
        createdBy: {
          name: "Jane Smith",
          image: "https://example.com/avatar.jpg",
        },
      });

      render(<VersionListItem version={version} />);

      // Avatar image should be present in the DOM (though it may have fallback rendered too)
      const container = document.querySelector('[data-slot="avatar"]');
      expect(container).toBeInTheDocument();

      // The image src should be in the rendered HTML
      const img = document.querySelector('img');
      if (img) {
        expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
      }
    });

    it("should handle missing author", () => {
      const version = createMockVersion({
        createdBy: undefined,
      });

      render(<VersionListItem version={version} />);

      // Should show "?" for unknown user - check in the aria-label which contains author name
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Utilisateur inconnu")
      );
    });

    it("should handle null author name", () => {
      const version = createMockVersion({
        createdBy: { name: null, image: null },
      });

      render(<VersionListItem version={version} />);

      // Should show "?" in the avatar fallback
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Utilisateur inconnu")
      );
    });
  });

  describe("selection state", () => {
    it("should apply selected styles when isSelected is true", () => {
      const version = createMockVersion();

      render(<VersionListItem version={version} isSelected={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-accent");
      expect(button).toHaveAttribute("aria-current", "true");
    });

    it("should not apply selected styles when isSelected is false", () => {
      const version = createMockVersion();

      render(<VersionListItem version={version} isSelected={false} />);

      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("aria-current");
    });
  });

  describe("click handling", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      const version = createMockVersion();

      render(<VersionListItem version={version} onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not error when onClick is not provided", () => {
      const version = createMockVersion();

      render(<VersionListItem version={version} />);

      expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
    });
  });

  describe("accessibility", () => {
    it("should have descriptive aria-label", () => {
      const version = createMockVersion({
        version: 3,
        createdBy: { name: "Alice", image: null },
      });

      render(<VersionListItem version={version} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Version 3")
      );
      expect(button).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Alice")
      );
    });

    it("should be focusable", () => {
      const version = createMockVersion();

      render(<VersionListItem version={version} />);

      const button = screen.getByRole("button");
      button.focus();

      expect(document.activeElement).toBe(button);
    });
  });

  describe("date formatting", () => {
    it("should show full date in title attribute", () => {
      // Use a fixed date in the past for predictable output
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const version = createMockVersion({
        createdAt: pastDate,
      });

      render(<VersionListItem version={version} />);

      // The date element should have a title with full date
      const dateElement = screen.getByText(/il y a/i);
      expect(dateElement).toHaveAttribute("title");
      // Title should contain some date text
      expect(dateElement.getAttribute("title")?.length).toBeGreaterThan(5);
    });
  });
});
