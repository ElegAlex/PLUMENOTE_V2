"use client";

/**
 * Suggestion Render Helper
 *
 * Provides React-based rendering for Tiptap suggestion plugin.
 * Uses a portal to render the suggestion popup at the correct position.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { createRoot, type Root } from "react-dom/client";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoteLinkSuggestion, type NoteLinkSuggestionRef } from "../components/NoteLinkSuggestion";

interface SuggestionItem {
  id: string;
  title: string;
}

interface RenderOptions {
  /** Callback when a note is selected */
  onSelect?: (item: SuggestionItem) => void;
  /** Callback to create a new note */
  onCreateNote?: (title: string) => void;
  /** Query client for React Query provider */
  queryClient?: QueryClient;
}

/**
 * Create a render function for the suggestion plugin
 */
export function createSuggestionRender(options: RenderOptions = {}) {
  return () => {
    let popup: HTMLDivElement | null = null;
    let root: Root | null = null;
    let componentRef: NoteLinkSuggestionRef | null = null;
    let currentProps: SuggestionProps<SuggestionItem> | null = null;

    // Get or create query client
    const queryClient = options.queryClient || new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 30_000,
        },
      },
    });

    const renderComponent = (props: SuggestionProps<SuggestionItem>) => {
      if (!popup || !root) return;

      currentProps = props;

      const handleSelect = (item: { id: string; title: string }) => {
        props.command(item);
        options.onSelect?.(item);
      };

      const handleCreateNote = async (title: string) => {
        if (options.onCreateNote) {
          options.onCreateNote(title);
        } else {
          // Default: create note via API and insert link
          try {
            const response = await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });

            if (response.ok) {
              const { data } = await response.json();
              props.command({ id: data.id, title: data.title });
            }
          } catch (error) {
            console.error("Failed to create note:", error);
          }
        }
      };

      const handleClose = () => {
        // Close the suggestion by clearing the popup
        // The user can press Escape or click outside
      };

      root.render(
        <QueryClientProvider client={queryClient}>
          <NoteLinkSuggestion
            ref={(ref) => {
              componentRef = ref;
            }}
            query={props.query}
            onSelect={handleSelect}
            onCreateNote={handleCreateNote}
            onClose={handleClose}
          />
        </QueryClientProvider>
      );
    };

    return {
      onStart: (props: SuggestionProps<SuggestionItem>) => {
        // Create popup container
        popup = document.createElement("div");
        popup.className = "suggestion-popup-container";
        popup.style.position = "absolute";
        popup.style.zIndex = "9999";
        document.body.appendChild(popup);

        // Position popup near the cursor
        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 8}px`; // 8px below cursor
          }
        }

        // Create React root and render
        root = createRoot(popup);
        renderComponent(props);
      },

      onUpdate: (props: SuggestionProps<SuggestionItem>) => {
        if (!popup) return;

        // Update position
        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 8}px`;
          }
        }

        // Re-render with new props
        renderComponent(props);
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        // Delegate to component's keyboard handler
        if (componentRef?.onKeyDown) {
          return componentRef.onKeyDown(props.event);
        }

        // Handle Escape to close
        if (props.event.key === "Escape") {
          return true;
        }

        return false;
      },

      onExit: () => {
        // Cleanup
        if (root) {
          root.unmount();
          root = null;
        }
        if (popup) {
          popup.remove();
          popup = null;
        }
        componentRef = null;
        currentProps = null;
      },
    };
  };
}

export default createSuggestionRender;
