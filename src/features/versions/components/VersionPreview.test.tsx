/**
 * Tests for VersionPreview component
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #4 - Prévisualisation du contenu en lecture seule
 * @see AC: #5 - Contenu Markdown rendu
 * @see AC: #6 - Diff visuel entre version sélectionnée et actuelle
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VersionPreview } from "./VersionPreview";
import type { NoteVersion } from "../types";

/**
 * Mock version data factory
 */
function createMockVersion(overrides: Partial<NoteVersion> = {}): NoteVersion {
  return {
    id: "version-1",
    version: 1,
    title: "Test Note",
    content: "This is test content",
    ydoc: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    noteId: "note-1",
    createdById: "user-1",
    ...overrides,
  };
}

describe("VersionPreview", () => {
  describe("rendering", () => {
    it("should render version badge", () => {
      const version = createMockVersion({ version: 5 });

      render(<VersionPreview version={version} />);

      expect(screen.getByText("v5")).toBeInTheDocument();
    });

    it("should render formatted date", () => {
      const version = createMockVersion({
        createdAt: new Date("2026-01-16T14:30:00Z"),
      });

      render(<VersionPreview version={version} />);

      // Should show formatted date in French
      expect(screen.getByText(/16 janvier 2026/i)).toBeInTheDocument();
    });

    it("should render version title", () => {
      const version = createMockVersion({ title: "My Note Title" });

      render(<VersionPreview version={version} />);

      expect(screen.getByText("My Note Title")).toBeInTheDocument();
    });

    it("should render content", () => {
      const version = createMockVersion({
        content: "Hello World",
      });

      render(<VersionPreview version={version} />);

      expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    });

    it("should show empty content message when no content", () => {
      const version = createMockVersion({
        content: null,
      });

      render(<VersionPreview version={version} />);

      expect(screen.getByText("Contenu non disponible")).toBeInTheDocument();
    });

    it("should show read-only notice", () => {
      const version = createMockVersion();

      render(<VersionPreview version={version} />);

      expect(
        screen.getByText("Cette version est en lecture seule")
      ).toBeInTheDocument();
    });
  });

  describe("markdown rendering", () => {
    it("should render headers", () => {
      const version = createMockVersion({
        content: "# Header 1\n## Header 2\n### Header 3",
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("h1")).toBeInTheDocument();
      expect(container.querySelector("h2")).toBeInTheDocument();
      expect(container.querySelector("h3")).toBeInTheDocument();
    });

    it("should render bold text", () => {
      const version = createMockVersion({
        content: "This is **bold** text",
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("strong")).toBeInTheDocument();
      expect(container.querySelector("strong")?.textContent).toBe("bold");
    });

    it("should render italic text", () => {
      const version = createMockVersion({
        content: "This is *italic* text",
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("em")).toBeInTheDocument();
      expect(container.querySelector("em")?.textContent).toBe("italic");
    });

    it("should render inline code", () => {
      const version = createMockVersion({
        content: "Use `code` here",
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("code")).toBeInTheDocument();
      expect(container.querySelector("code")?.textContent).toBe("code");
    });

    it("should render code blocks", () => {
      const version = createMockVersion({
        content: "```js\nconst x = 1;\n```",
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("pre")).toBeInTheDocument();
      expect(container.querySelector("pre code")).toBeInTheDocument();
    });

    it("should render links", () => {
      const version = createMockVersion({
        content: "Visit [Google](https://google.com)",
      });

      const { container } = render(<VersionPreview version={version} />);

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute("href")).toBe("https://google.com");
      expect(link?.textContent).toBe("Google");
    });
  });

  describe("XSS protection", () => {
    it("should sanitize script tags", () => {
      const version = createMockVersion({
        content: '<script>alert("xss")</script>',
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.querySelector("script")).not.toBeInTheDocument();
      expect(container.innerHTML).not.toContain("alert");
    });

    it("should sanitize onclick handlers", () => {
      const version = createMockVersion({
        content: '<div onclick="alert(1)">Click me</div>',
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.innerHTML).not.toContain("onclick");
    });

    it("should sanitize img onerror", () => {
      const version = createMockVersion({
        content: '<img src=x onerror="alert(1)">',
      });

      const { container } = render(<VersionPreview version={version} />);

      expect(container.innerHTML).not.toContain("onerror");
    });

    it("should sanitize javascript: URLs", () => {
      const version = createMockVersion({
        content: '[click](javascript:alert(1))',
      });

      const { container } = render(<VersionPreview version={version} />);

      // DOMPurify removes javascript: URLs - link should either not exist or have safe href
      const link = container.querySelector("a");
      if (link) {
        const href = link.getAttribute("href");
        // href should either be null or not contain javascript:
        if (href !== null) {
          expect(href).not.toContain("javascript:");
        }
      }
      // Either way, no javascript: should be in the rendered output
      expect(container.innerHTML).not.toContain("javascript:");
    });
  });

  describe("view mode toggle", () => {
    it("should show toggle buttons when currentContent is provided", () => {
      const version = createMockVersion({
        content: "Version content",
      });

      render(
        <VersionPreview version={version} currentContent="Current content" />
      );

      expect(screen.getByText("Contenu")).toBeInTheDocument();
      expect(screen.getByText("Diff")).toBeInTheDocument();
    });

    it("should not show toggle buttons when no currentContent", () => {
      const version = createMockVersion({
        content: "Version content",
      });

      render(<VersionPreview version={version} />);

      expect(screen.queryByText("Diff")).not.toBeInTheDocument();
    });

    it("should not show toggle buttons when version has no content", () => {
      const version = createMockVersion({
        content: null,
      });

      render(
        <VersionPreview version={version} currentContent="Current content" />
      );

      expect(screen.queryByText("Diff")).not.toBeInTheDocument();
    });

    it("should switch to diff view when Diff button clicked", () => {
      const version = createMockVersion({
        content: "Old content",
      });

      render(
        <VersionPreview version={version} currentContent="New content" />
      );

      // Click Diff button
      fireEvent.click(screen.getByText("Diff"));

      // Should show diff region
      expect(
        screen.getByRole("region", { name: /Différences/i })
      ).toBeInTheDocument();
    });

    it("should switch back to content view when Contenu button clicked", () => {
      const version = createMockVersion({
        content: "Version content",
      });

      render(
        <VersionPreview version={version} currentContent="Current content" />
      );

      // Switch to diff
      fireEvent.click(screen.getByText("Diff"));

      // Switch back to content
      fireEvent.click(screen.getByText("Contenu"));

      // Should show content
      expect(screen.getByText(/Version content/)).toBeInTheDocument();
    });
  });

  describe("diff view", () => {
    it("should show additions and deletions in diff view", () => {
      const version = createMockVersion({
        content: "Old text",
      });

      render(
        <VersionPreview version={version} currentContent="New text" />
      );

      // Switch to diff view
      fireEvent.click(screen.getByText("Diff"));

      // Should show diff stats
      expect(screen.getAllByText(/ajout/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/suppression/i).length).toBeGreaterThan(0);
    });
  });

  describe("accessibility", () => {
    it("should have accessible content region", () => {
      const version = createMockVersion({ version: 3 });

      render(<VersionPreview version={version} />);

      expect(
        screen.getByRole("article", { name: /Contenu de la version 3/i })
      ).toBeInTheDocument();
    });
  });
});
