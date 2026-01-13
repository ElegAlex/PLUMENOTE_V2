/**
 * InternalLinkSuggestion Extension
 *
 * Tiptap extension that triggers the note link suggestion popup when user types [[.
 * Uses @tiptap/suggestion plugin for character detection and popup positioning.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";

export interface InternalLinkSuggestionOptions {
  /** Custom suggestion configuration */
  suggestion: Partial<Omit<SuggestionOptions, "editor">>;
}

export interface SuggestionItem {
  id: string;
  title: string;
}

export type { SuggestionProps };

/**
 * Create the InternalLinkSuggestion extension with custom render function
 */
export const InternalLinkSuggestion = Extension.create<InternalLinkSuggestionOptions>({
  name: "internalLinkSuggestion",

  addOptions() {
    return {
      suggestion: {
        char: "[[",
        startOfLine: false,
        allowSpaces: true,
        // Allow matching after common characters
        allowedPrefixes: [" ", "(", "[", "{", '"', "'", "`", "\n"],
        // Default command to insert the internal link
        command: ({ editor, range, props }) => {
          // Delete the trigger chars and query
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "internalLink",
              attrs: {
                noteId: props.id,
                title: props.title,
              },
            })
            .insertContent(" ") // Add space after link
            .run();
        },
        // Default items fetcher - should be overridden
        items: async () => [],
        // Default render - should be overridden with React component
        render: () => ({
          onStart: () => {},
          onUpdate: () => {},
          onKeyDown: () => false,
          onExit: () => {},
        }),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/**
 * Helper to create suggestion items fetcher
 */
export function createSuggestionItemsFetcher(
  searchFn: (query: string) => Promise<SuggestionItem[]>
) {
  return async ({ query }: { query: string }): Promise<SuggestionItem[]> => {
    if (!query.trim()) {
      return [];
    }
    return searchFn(query);
  };
}

/**
 * Default search function using the notes search API
 */
export async function defaultSearchNotes(query: string): Promise<SuggestionItem[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      pageSize: "8",
    });

    const response = await fetch(`/api/notes/search?${params.toString()}`);

    if (!response.ok) {
      return [];
    }

    const { data } = await response.json();

    return (data || []).map((note: { id: string; title: string }) => ({
      id: note.id,
      title: note.title,
    }));
  } catch {
    return [];
  }
}

export default InternalLinkSuggestion;
