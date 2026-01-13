/**
 * Tests for Note Links Utility
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { describe, it, expect } from "vitest";
import { extractLinksFromHtml, type ExtractedLink } from "./note-links";

describe("extractLinksFromHtml", () => {
  it("should extract links from HTML content", () => {
    const html = `
      <p>Check out <span data-internal-link data-note-id="note-1" data-title="My Note">[[My Note]]</span></p>
      <p>And also <span data-internal-link data-note-id="note-2" data-title="Another Note">[[Another Note]]</span></p>
    `;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(2);
    expect(links).toContainEqual({ noteId: "note-1", title: "My Note" });
    expect(links).toContainEqual({ noteId: "note-2", title: "Another Note" });
  });

  it("should return empty array for empty content", () => {
    expect(extractLinksFromHtml("")).toEqual([]);
    expect(extractLinksFromHtml(null as unknown as string)).toEqual([]);
  });

  it("should return empty array for content without links", () => {
    const html = "<p>Just some plain text</p>";
    expect(extractLinksFromHtml(html)).toEqual([]);
  });

  it("should deduplicate links to the same note", () => {
    const html = `
      <p><span data-internal-link data-note-id="note-1" data-title="Note">[[Note]]</span></p>
      <p><span data-internal-link data-note-id="note-1" data-title="Note">[[Note]]</span></p>
    `;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ noteId: "note-1", title: "Note" });
  });

  it("should handle attributes in different order", () => {
    const html = `
      <span data-note-id="note-1" data-internal-link data-title="Title">[[Title]]</span>
    `;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ noteId: "note-1", title: "Title" });
  });

  it("should handle empty titles", () => {
    const html = `<span data-internal-link data-note-id="note-1" data-title="">[[]]</span>`;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ noteId: "note-1", title: "" });
  });

  it("should handle special characters in titles", () => {
    const html = `<span data-internal-link data-note-id="note-1" data-title="Note &amp; More">[[Note & More]]</span>`;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ noteId: "note-1", title: "Note &amp; More" });
  });

  it("should extract multiple links from complex content", () => {
    const html = `
      <h1>Project Notes</h1>
      <p>See <span data-internal-link data-note-id="requirements" data-title="Requirements">[[Requirements]]</span> for specs.</p>
      <ul>
        <li><span data-internal-link data-note-id="design" data-title="Design Doc">[[Design Doc]]</span></li>
        <li><span data-internal-link data-note-id="timeline" data-title="Timeline">[[Timeline]]</span></li>
      </ul>
      <p>Review <span data-internal-link data-note-id="budget" data-title="Budget">[[Budget]]</span> when done.</p>
    `;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(4);
    expect(links.map((l) => l.noteId)).toEqual([
      "requirements",
      "design",
      "timeline",
      "budget",
    ]);
  });

  it("should not match regular spans", () => {
    const html = `
      <span class="highlight">Regular span</span>
      <span data-internal-link data-note-id="note-1" data-title="Real Link">[[Real Link]]</span>
    `;

    const links = extractLinksFromHtml(html);

    expect(links).toHaveLength(1);
    expect(links[0].noteId).toBe("note-1");
  });
});
