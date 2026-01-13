/**
 * Tests for TemplateCard component
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateCard } from "./TemplateCard";
import type { Template } from "../types";

// Sample template for testing
const mockTemplate: Template = {
  id: "tpl-1",
  name: "Fiche Serveur",
  description: "Template pour documenter un serveur informatique",
  content: "# {{nom_serveur}}\n\n## Informations Générales\n\n- **IP:** {{ip}}\n- **OS:** {{os}}",
  icon: "server",
  isSystem: true,
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: null,
};

const templateWithLongContent: Template = {
  ...mockTemplate,
  id: "tpl-2",
  name: "Long Template",
  content: "# Title\n\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10",
};

const templateWithoutDescription: Template = {
  ...mockTemplate,
  id: "tpl-3",
  name: "No Description",
  description: null,
};

describe("TemplateCard", () => {
  describe("rendering", () => {
    it("should render template name", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
    });

    it("should render template description", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      expect(screen.getByText("Template pour documenter un serveur informatique")).toBeInTheDocument();
    });

    it("should render content preview", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      // Preview should show truncated content
      expect(screen.getByText(/{{nom_serveur}}/)).toBeInTheDocument();
    });

    it("should truncate long content preview to max 3 lines", () => {
      render(<TemplateCard template={templateWithLongContent} onSelect={vi.fn()} />);
      const preview = screen.getByTestId("template-preview");
      expect(preview).toHaveClass("line-clamp-3");
    });

    it("should handle template without description", () => {
      render(<TemplateCard template={templateWithoutDescription} onSelect={vi.fn()} />);
      expect(screen.getByText("No Description")).toBeInTheDocument();
      // Should not throw or show undefined
      expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    });

    it("should render the correct icon based on template.icon", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      const icon = screen.getByTestId("template-icon");
      expect(icon).toBeInTheDocument();
    });

    it("should show system badge for system templates", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      expect(screen.getByText("Système")).toBeInTheDocument();
    });

    it("should not show system badge for non-system templates", () => {
      const nonSystemTemplate = { ...mockTemplate, isSystem: false };
      render(<TemplateCard template={nonSystemTemplate} onSelect={vi.fn()} />);
      expect(screen.queryByText("Système")).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onSelect with template when clicked", () => {
      const onSelect = vi.fn();
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(mockTemplate);
    });

    it("should be focusable via keyboard", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      const card = screen.getByRole("button");
      card.focus();
      expect(card).toHaveFocus();
    });

    it("should trigger onSelect on Enter key", () => {
      const onSelect = vi.fn();
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />);

      const card = screen.getByRole("button");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("should trigger onSelect on Space key", () => {
      const onSelect = vi.fn();
      render(<TemplateCard template={mockTemplate} onSelect={onSelect} />);

      const card = screen.getByRole("button");
      fireEvent.keyDown(card, { key: " " });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("styling", () => {
    it("should have hover state styling", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      const card = screen.getByRole("button");
      expect(card).toHaveClass("hover:bg-accent");
    });

    it("should have focus-visible styling for accessibility", () => {
      render(<TemplateCard template={mockTemplate} onSelect={vi.fn()} />);
      const card = screen.getByRole("button");
      expect(card).toHaveClass("focus-visible:ring-2");
    });
  });
});
