/**
 * Tests for InternalLink Extension
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { describe, it, expect, vi } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { InternalLink } from "./InternalLink";

describe("InternalLink Extension", () => {
  const createEditor = (options?: { onNavigate?: (noteId: string) => void }) => {
    return new Editor({
      extensions: [
        StarterKit,
        InternalLink.configure({
          onNavigate: options?.onNavigate,
        }),
      ],
      content: "",
    });
  };

  describe("Extension Configuration", () => {
    it("should have correct name", () => {
      const editor = createEditor();
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "internalLink"
      );
      expect(extension).toBeDefined();
      expect(extension?.name).toBe("internalLink");
      editor.destroy();
    });

    it("should be an inline atom node", () => {
      const editor = createEditor();
      const schema = editor.schema.nodes.internalLink;
      expect(schema).toBeDefined();
      expect(schema.isInline).toBe(true);
      expect(schema.isAtom).toBe(true);
      editor.destroy();
    });

    it("should have noteId and title attributes", () => {
      const editor = createEditor();
      const schema = editor.schema.nodes.internalLink;
      expect(schema.spec.attrs).toHaveProperty("noteId");
      expect(schema.spec.attrs).toHaveProperty("title");
      editor.destroy();
    });
  });

  describe("setInternalLink Command", () => {
    it("should insert an internal link node", () => {
      const editor = createEditor();

      editor.commands.setInternalLink({
        noteId: "test-note-123",
        title: "Test Note",
      });

      const json = editor.getJSON();
      const linkNode = json.content?.[0]?.content?.find(
        (node: { type?: string }) => node.type === "internalLink"
      );

      expect(linkNode).toBeDefined();
      expect(linkNode?.attrs?.noteId).toBe("test-note-123");
      expect(linkNode?.attrs?.title).toBe("Test Note");
      editor.destroy();
    });

    it("should insert link at cursor position", () => {
      const editor = createEditor();

      // Insert some text first
      editor.commands.setContent("<p>Before cursor</p>");
      editor.commands.focus("end");

      // Insert link
      editor.commands.setInternalLink({
        noteId: "note-id",
        title: "Linked Note",
      });

      const html = editor.getHTML();
      expect(html).toContain("data-internal-link");
      expect(html).toContain("data-note-id");
      editor.destroy();
    });

    it("should render with correct HTML structure", () => {
      const editor = createEditor();

      editor.commands.setInternalLink({
        noteId: "abc123",
        title: "My Note",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-internal-link=""');
      expect(html).toContain('data-note-id="abc123"');
      expect(html).toContain('data-title="My Note"');
      expect(html).toContain("[[My Note]]");
      editor.destroy();
    });
  });

  describe("HTML Parsing", () => {
    it("should parse internal link from HTML", () => {
      const editor = createEditor();

      editor.commands.setContent(
        '<p>Check this <span data-internal-link="" data-note-id="note-123" data-title="Linked Doc">[[Linked Doc]]</span></p>'
      );

      const json = editor.getJSON();
      const linkNode = json.content?.[0]?.content?.find(
        (node: { type?: string }) => node.type === "internalLink"
      );

      expect(linkNode).toBeDefined();
      expect(linkNode?.attrs?.noteId).toBe("note-123");
      expect(linkNode?.attrs?.title).toBe("Linked Doc");
      editor.destroy();
    });
  });

  describe("Options", () => {
    it("should accept onNavigate callback", () => {
      const onNavigate = vi.fn();
      const editor = createEditor({ onNavigate });

      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "internalLink"
      );

      expect(extension?.options?.onNavigate).toBe(onNavigate);
      editor.destroy();
    });

    it("should accept custom HTML attributes", () => {
      const editor = new Editor({
        extensions: [
          StarterKit,
          InternalLink.configure({
            HTMLAttributes: {
              "data-custom": "value",
            },
          }),
        ],
        content: "",
      });

      editor.commands.setInternalLink({
        noteId: "test",
        title: "Test",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-custom="value"');
      editor.destroy();
    });
  });

  describe("Multiple Links", () => {
    it("should handle multiple internal links in content", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Start</p>");
      editor.commands.focus("end");
      editor.commands.setInternalLink({ noteId: "note-1", title: "First" });
      editor.commands.insertContent(" and ");
      editor.commands.setInternalLink({ noteId: "note-2", title: "Second" });

      const html = editor.getHTML();
      expect(html).toContain('data-note-id="note-1"');
      expect(html).toContain('data-note-id="note-2"');
      expect(html).toContain("[[First]]");
      expect(html).toContain("[[Second]]");
      editor.destroy();
    });
  });
});
