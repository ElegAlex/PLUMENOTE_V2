/**
 * CommentMark Extension
 *
 * Tiptap Mark extension for highlighting commented text.
 * Supports click events to select associated comments.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 */

import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface CommentMarkOptions {
  /** Callback when a comment highlight is clicked */
  onCommentClick?: (commentId: string) => void;
  /** Custom HTML attributes */
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      /**
       * Add a comment mark to a range
       */
      addCommentMark: (options: {
        from: number;
        to: number;
        commentId: string;
      }) => ReturnType;
      /**
       * Remove a comment mark by ID
       */
      removeCommentMark: (commentId: string) => ReturnType;
      /**
       * Remove all comment marks in a range
       */
      removeCommentMarkInRange: (options: {
        from: number;
        to: number;
      }) => ReturnType;
    };
  }
}

export const commentMarkPluginKey = new PluginKey("commentMark");

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "comment",

  // Allow spanning across other inline marks
  spanning: true,

  // Can be combined with other marks
  inclusive: false,

  // Allow multiple comments on same text (different IDs)
  excludes: "",

  addOptions() {
    return {
      onCommentClick: undefined,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) {
            return {};
          }
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-comment-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      addCommentMark:
        ({ from, to, commentId }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const mark = this.type.create({ commentId });
            tr.addMark(from, to, mark);
          }
          return true;
        },

      removeCommentMark:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            const { doc } = state;
            doc.descendants((node, pos) => {
              if (node.isText) {
                node.marks.forEach((mark) => {
                  if (
                    mark.type.name === this.name &&
                    mark.attrs.commentId === commentId
                  ) {
                    tr.removeMark(pos, pos + node.nodeSize, mark);
                  }
                });
              }
            });
          }
          return true;
        },

      removeCommentMarkInRange:
        ({ from, to }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.removeMark(from, to, this.type);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: commentMarkPluginKey,
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;

            // Check if clicked on a comment highlight
            if (target.classList.contains("comment-highlight")) {
              const commentId = target.getAttribute("data-comment-id");
              if (commentId && extension.options.onCommentClick) {
                extension.options.onCommentClick(commentId);
                return true;
              }
            }

            // Check parent elements (in case of nested marks)
            const parent = target.closest(".comment-highlight");
            if (parent) {
              const commentId = parent.getAttribute("data-comment-id");
              if (commentId && extension.options.onCommentClick) {
                extension.options.onCommentClick(commentId);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

export default CommentMark;
