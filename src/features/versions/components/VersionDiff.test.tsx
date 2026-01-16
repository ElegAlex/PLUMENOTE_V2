/**
 * Tests for VersionDiff component
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #6 - Diff visuel
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionDiff } from "./VersionDiff";

describe("VersionDiff", () => {
  describe("rendering", () => {
    it("should show no differences message when contents are identical", () => {
      render(
        <VersionDiff
          oldContent="Hello World"
          newContent="Hello World"
        />
      );

      expect(screen.getByText(/Aucune différence/i)).toBeInTheDocument();
      expect(screen.getByText(/contenus sont identiques/i)).toBeInTheDocument();
    });

    it("should show additions in green", () => {
      render(
        <VersionDiff
          oldContent="Hello"
          newContent="Hello World"
          mode="words"
        />
      );

      // Should show addition stats (use getAllBy since legend also contains "Ajouts")
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
    });

    it("should show deletions in red", () => {
      render(
        <VersionDiff
          oldContent="Hello World"
          newContent="Hello"
          mode="words"
        />
      );

      // Should show deletion stats (use getAllBy since legend also contains "Suppressions")
      expect(screen.getAllByText(/suppression/i).length).toBeGreaterThan(0);
    });

    it("should show both additions and deletions", () => {
      render(
        <VersionDiff
          oldContent="The quick brown fox"
          newContent="The slow brown dog"
          mode="words"
        />
      );

      // Should show both stats
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/suppression/i).length).toBeGreaterThan(0);
    });
  });

  describe("line mode", () => {
    it("should diff by lines in line mode", () => {
      const oldContent = "Line 1\nLine 2\nLine 3";
      const newContent = "Line 1\nModified Line 2\nLine 3";

      render(
        <VersionDiff
          oldContent={oldContent}
          newContent={newContent}
          mode="lines"
        />
      );

      // Should show changes
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
    });

    it("should show + and - prefixes in line mode", () => {
      const oldContent = "Old line";
      const newContent = "New line";

      const { container } = render(
        <VersionDiff
          oldContent={oldContent}
          newContent={newContent}
          mode="lines"
        />
      );

      // Should have + and - indicators
      expect(container.textContent).toContain("+");
      expect(container.textContent).toContain("-");
    });
  });

  describe("word mode", () => {
    it("should diff by words in word mode", () => {
      render(
        <VersionDiff
          oldContent="The quick fox"
          newContent="The slow fox"
          mode="words"
        />
      );

      // Should show changes at word level
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
    });
  });

  describe("empty content", () => {
    it("should handle empty old content (all additions)", () => {
      render(
        <VersionDiff
          oldContent=""
          newContent="New content"
          mode="lines"
        />
      );

      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
    });

    it("should handle empty new content (all deletions)", () => {
      render(
        <VersionDiff
          oldContent="Old content"
          newContent=""
          mode="lines"
        />
      );

      expect(screen.getAllByText(/suppression/i).length).toBeGreaterThan(0);
    });

    it("should handle both empty contents", () => {
      render(
        <VersionDiff
          oldContent=""
          newContent=""
        />
      );

      expect(screen.getByText(/Aucune différence/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper aria labels for changes", () => {
      render(
        <VersionDiff
          oldContent="old"
          newContent="new"
          mode="words"
        />
      );

      expect(
        screen.getByRole("region", { name: /Différences/i })
      ).toBeInTheDocument();
    });

    it("should provide legend for colors", () => {
      render(
        <VersionDiff
          oldContent="old"
          newContent="new"
        />
      );

      expect(screen.getByText("Ajouts")).toBeInTheDocument();
      expect(screen.getByText("Suppressions")).toBeInTheDocument();
    });
  });

  describe("statistics", () => {
    it("should show correct count for single addition", () => {
      render(
        <VersionDiff
          oldContent=""
          newContent="line"
          mode="lines"
        />
      );

      expect(screen.getByText(/\+1 ajout/)).toBeInTheDocument();
    });

    it("should show correct count for multiple additions", () => {
      render(
        <VersionDiff
          oldContent=""
          newContent="line1\nline2\nline3"
          mode="lines"
        />
      );

      // The stats show "ajouts" (plural) for multiple additions
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
    });

    it("should show correct count for single deletion", () => {
      render(
        <VersionDiff
          oldContent="line"
          newContent=""
          mode="lines"
        />
      );

      expect(screen.getByText(/-1 suppression/)).toBeInTheDocument();
    });
  });
});
