/**
 * InternalLink Extension
 *
 * Tiptap Node extension for internal wiki-style links [[Note Title]].
 * Supports navigation to target notes and hover preview.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InternalLinkView } from "../components/InternalLinkView";

export interface InternalLinkOptions {
  /** Callback when link is clicked */
  onNavigate?: (noteId: string) => void;
  /** Callback to fetch note preview */
  onFetchPreview?: (noteId: string) => Promise<{ title: string; content: string } | null>;
  /** Custom HTML attributes */
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    internalLink: {
      /**
       * Insert an internal link
       */
      setInternalLink: (options: { noteId: string; title: string }) => ReturnType;
    };
  }
}

export const InternalLink = Node.create<InternalLinkOptions>({
  name: "internalLink",

  group: "inline",

  inline: true,

  selectable: true,

  atom: true, // Non-editable, selectable as a whole

  addOptions() {
    return {
      onNavigate: undefined,
      onFetchPreview: undefined,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => {
          if (!attributes.noteId) {
            return {};
          }
          return { "data-note-id": attributes.noteId };
        },
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }
          return { "data-title": attributes.title };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-internal-link]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-internal-link": "",
        class: "internal-link",
      }),
      `[[${HTMLAttributes["data-title"] || ""}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InternalLinkView, {
      attrs: {
        onNavigate: this.options.onNavigate,
        onFetchPreview: this.options.onFetchPreview,
      },
    });
  },

  addCommands() {
    return {
      setInternalLink:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default InternalLink;
