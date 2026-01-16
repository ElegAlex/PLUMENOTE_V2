/**
 * Tests for CommentMark Extension
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 */

import { describe, it, expect, vi } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CommentMark } from "./CommentMark";

describe("CommentMark Extension", () => {
  const createEditor = (options?: {
    onCommentClick?: (commentId: string) => void;
  }) => {
    return new Editor({
      extensions: [
        StarterKit,
        CommentMark.configure({
          onCommentClick: options?.onCommentClick,
        }),
      ],
      content: "",
    });
  };

  describe("Extension Configuration", () => {
    it("should have correct name", () => {
      const editor = createEditor();
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "comment"
      );
      expect(extension).toBeDefined();
      expect(extension?.name).toBe("comment");
      editor.destroy();
    });

    it("should be a mark type", () => {
      const editor = createEditor();
      const schema = editor.schema.marks.comment;
      expect(schema).toBeDefined();
      editor.destroy();
    });

    it("should have commentId attribute", () => {
      const editor = createEditor();
      const schema = editor.schema.marks.comment;
      expect(schema).toBeDefined();
      expect(schema!.spec.attrs).toHaveProperty("commentId");
      editor.destroy();
    });

    it("should not exclude other marks", () => {
      const editor = createEditor();
      const schema = editor.schema.marks.comment;
      expect(schema).toBeDefined();
      // excludes: "" means it can combine with other marks
      expect(schema!.spec.excludes).toBe("");
      editor.destroy();
    });
  });

  describe("addCommentMark Command", () => {
    it("should add a comment mark to a range", () => {
      const editor = createEditor();

      // Set content with some text
      editor.commands.setContent("<p>Hello world</p>");

      // Add comment mark to "world" (positions 7-12)
      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-123",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-123"');
      expect(html).toContain("comment-highlight");
      editor.destroy();
    });

    it("should add multiple comment marks to different ranges", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello beautiful world</p>");

      // Add first comment to "Hello" (positions 1-6)
      editor.commands.addCommentMark({
        from: 1,
        to: 6,
        commentId: "comment-1",
      });

      // Add second comment to "world" (positions 18-23)
      editor.commands.addCommentMark({
        from: 18,
        to: 23,
        commentId: "comment-2",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-1"');
      expect(html).toContain('data-comment-id="comment-2"');
      editor.destroy();
    });

    it("should allow overlapping comments on same text", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello world</p>");

      // Add first comment to "Hello world"
      editor.commands.addCommentMark({
        from: 1,
        to: 12,
        commentId: "comment-1",
      });

      // Add second comment to "world" only (subset)
      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-2",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-1"');
      expect(html).toContain('data-comment-id="comment-2"');
      editor.destroy();
    });
  });

  describe("removeCommentMark Command", () => {
    it("should remove a comment mark by ID", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello world</p>");

      // Add comment mark
      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-to-remove",
      });

      // Verify it's there
      let html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-to-remove"');

      // Remove it
      editor.commands.removeCommentMark("comment-to-remove");

      html = editor.getHTML();
      expect(html).not.toContain('data-comment-id="comment-to-remove"');
      editor.destroy();
    });

    it("should only remove the specific comment mark", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello world</p>");

      // Add two comment marks
      editor.commands.addCommentMark({
        from: 1,
        to: 6,
        commentId: "comment-1",
      });

      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-2",
      });

      // Remove only comment-1
      editor.commands.removeCommentMark("comment-1");

      const html = editor.getHTML();
      expect(html).not.toContain('data-comment-id="comment-1"');
      expect(html).toContain('data-comment-id="comment-2"');
      editor.destroy();
    });
  });

  describe("removeCommentMarkInRange Command", () => {
    it("should remove all comment marks in a range", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello beautiful world</p>");

      // Add comments
      editor.commands.addCommentMark({
        from: 1,
        to: 6,
        commentId: "comment-1",
      });

      editor.commands.addCommentMark({
        from: 7,
        to: 16,
        commentId: "comment-2",
      });

      // Remove marks in range 1-16 (Hello beautiful)
      editor.commands.removeCommentMarkInRange({ from: 1, to: 16 });

      const html = editor.getHTML();
      expect(html).not.toContain("data-comment-id");
      editor.destroy();
    });
  });

  describe("HTML Parsing", () => {
    it("should parse comment mark from HTML", () => {
      const editor = createEditor();

      editor.commands.setContent(
        '<p>Hello <span data-comment-id="parsed-comment" class="comment-highlight">world</span></p>'
      );

      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      const markedText = paragraph?.content?.find(
        (node: { marks?: Array<{ type: string }> }) =>
          node.marks?.some((mark) => mark.type === "comment")
      );

      expect(markedText).toBeDefined();
      const commentMark = markedText?.marks?.find(
        (mark: { type: string }) => mark.type === "comment"
      );
      expect(commentMark?.attrs?.commentId).toBe("parsed-comment");
      editor.destroy();
    });
  });

  describe("HTML Rendering", () => {
    it("should render with correct HTML structure", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello world</p>");
      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "render-test",
      });

      const html = editor.getHTML();
      expect(html).toContain('<span');
      expect(html).toContain('data-comment-id="render-test"');
      expect(html).toContain('class="comment-highlight"');
      expect(html).toContain("world");
      expect(html).toContain("</span>");
      editor.destroy();
    });

    it("should apply custom HTML attributes", () => {
      const editor = new Editor({
        extensions: [
          StarterKit,
          CommentMark.configure({
            HTMLAttributes: {
              "data-custom": "value",
            },
          }),
        ],
        content: "<p>Hello world</p>",
      });

      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "custom-attrs",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-custom="value"');
      editor.destroy();
    });
  });

  describe("Options", () => {
    it("should accept onCommentClick callback", () => {
      const onCommentClick = vi.fn();
      const editor = createEditor({ onCommentClick });

      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "comment"
      );

      expect(extension?.options?.onCommentClick).toBe(onCommentClick);
      editor.destroy();
    });
  });

  describe("Mark Combination", () => {
    it("should combine with bold mark", () => {
      const editor = createEditor();

      // Set content with bold text
      editor.commands.setContent("<p>Hello <strong>world</strong></p>");

      // Add comment mark to bold text
      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-on-bold",
      });

      const html = editor.getHTML();
      expect(html).toContain("strong");
      expect(html).toContain('data-comment-id="comment-on-bold"');
      editor.destroy();
    });

    it("should combine with italic mark", () => {
      const editor = createEditor();

      editor.commands.setContent("<p>Hello <em>world</em></p>");

      editor.commands.addCommentMark({
        from: 7,
        to: 12,
        commentId: "comment-on-italic",
      });

      const html = editor.getHTML();
      expect(html).toContain("em");
      expect(html).toContain('data-comment-id="comment-on-italic"');
      editor.destroy();
    });
  });
});
