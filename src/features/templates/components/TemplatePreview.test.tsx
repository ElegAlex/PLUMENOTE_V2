/**
 * TemplatePreview Component Tests
 *
 * @see Story 7.3: Gestion des Templates d'Equipe
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatePreview } from "./TemplatePreview";

describe("TemplatePreview", () => {
  it("renders HTML content", () => {
    const content = "<h1>Test Title</h1><p>Test paragraph</p>";
    render(<TemplatePreview content={content} />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test paragraph")).toBeInTheDocument();
  });

  it("shows placeholder when content is empty", () => {
    render(<TemplatePreview content="" />);

    expect(
      screen.getByText("Aucun contenu a previsualiser")
    ).toBeInTheDocument();
  });

  it('shows placeholder when content is just "<p></p>"', () => {
    render(<TemplatePreview content="<p></p>" />);

    expect(
      screen.getByText("Aucun contenu a previsualiser")
    ).toBeInTheDocument();
  });

  it("applies prose classes for styling", () => {
    const content = "<p>Test content</p>";
    const { container } = render(<TemplatePreview content={content} />);

    const previewContainer = container.querySelector(".prose");
    expect(previewContainer).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const content = "<p>Test content</p>";
    const { container } = render(
      <TemplatePreview content={content} className="custom-class" />
    );

    const element = container.querySelector(".custom-class");
    expect(element).toBeInTheDocument();
  });

  it("has aria-label for accessibility", () => {
    const content = "<p>Test content</p>";
    render(<TemplatePreview content={content} />);

    const preview = screen.getByLabelText("Apercu du template");
    expect(preview).toBeInTheDocument();
  });

  it("renders complex HTML structure correctly", () => {
    const content = `
      <h2>Section Header</h2>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <pre><code>const x = 1;</code></pre>
    `;
    render(<TemplatePreview content={content} />);

    expect(screen.getByText("Section Header")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });
});
