"use client";

/**
 * NoteLinkSuggestion Component
 *
 * Popup component for selecting notes when creating internal links with [[.
 * Uses cmdk for keyboard navigation and integrates with useSearchNotes hook.
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchNotes, type SearchResultNote } from "@/features/search/hooks/useSearchNotes";
import { FileText, Plus, Folder, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoteLinkSuggestionProps {
  /** Current search query */
  query: string;
  /** Callback when a note is selected */
  onSelect: (note: { id: string; title: string }) => void;
  /** Callback to create a new note with given title */
  onCreateNote?: (title: string) => void;
  /** Callback when popup should close */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface NoteLinkSuggestionRef {
  /** Handle keyboard events from parent */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Suggestion popup for internal link autocomplete
 */
export const NoteLinkSuggestion = forwardRef<
  NoteLinkSuggestionRef,
  NoteLinkSuggestionProps
>(function NoteLinkSuggestion(
  { query, onSelect, onCreateNote, onClose, className },
  ref
) {
  const { data, isLoading } = useSearchNotes(query, { pageSize: 8 });
  const notes = data?.data ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commandRef = useRef<HTMLDivElement>(null);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [notes.length]);

  // Calculate total items (notes + create option if query exists)
  const hasCreateOption = query.trim().length > 0 && onCreateNote;
  const totalItems = notes.length + (hasCreateOption ? 1 : 0);

  // Handle selection
  const handleSelect = useCallback(
    (note: SearchResultNote) => {
      onSelect({ id: note.id, title: note.title });
    },
    [onSelect]
  );

  // Handle create new note
  const handleCreateNote = useCallback(() => {
    if (onCreateNote && query.trim()) {
      onCreateNote(query.trim());
    }
  }, [onCreateNote, query]);

  // Keyboard navigation handler
  const onKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      const key = event.key;

      // Handle Escape
      if (key === "Escape") {
        onClose?.();
        return true;
      }

      // Handle arrow navigation
      if (key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        return true;
      }

      if (key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        return true;
      }

      // Handle Enter selection
      if (key === "Enter") {
        event.preventDefault();
        if (selectedIndex < notes.length) {
          handleSelect(notes[selectedIndex]);
        } else if (hasCreateOption) {
          handleCreateNote();
        }
        return true;
      }

      return false;
    },
    [totalItems, notes, selectedIndex, hasCreateOption, handleSelect, handleCreateNote, onClose]
  );

  // Expose keyboard handler to parent
  useImperativeHandle(ref, () => ({
    onKeyDown,
  }));

  // Get folder path for display
  const getFolderPath = (note: SearchResultNote): string | null => {
    if (!note.folder) return null;
    return note.folder.name;
  };

  return (
    <div
      ref={commandRef}
      className={cn(
        "z-50 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg",
        className
      )}
    >
      <Command shouldFilter={false} className="border-none">
        <div className="flex items-center border-b px-3">
          <CommandInput
            placeholder="Rechercher une note..."
            value={query}
            className="h-9 border-none focus:ring-0"
            autoFocus={false}
            // Disabled as input is controlled by Tiptap
            disabled
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <CommandList className="max-h-64 overflow-y-auto">
          {!isLoading && notes.length === 0 && query.trim() && (
            <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
              Aucune note trouvée
            </CommandEmpty>
          )}

          {notes.length > 0 && (
            <CommandGroup heading="Notes">
              {notes.map((note, index) => (
                <CommandItem
                  key={note.id}
                  value={note.id}
                  onSelect={() => handleSelect(note)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{note.title}</span>
                      {note.isFavorite && (
                        <Star className="h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {getFolderPath(note) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        <span className="truncate">{getFolderPath(note)}</span>
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasCreateOption && (
            <CommandGroup heading="Actions">
              <CommandItem
                value="create-new"
                onSelect={handleCreateNote}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer",
                  selectedIndex === notes.length && "bg-accent"
                )}
              >
                <Plus className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-primary">
                  Créer &quot;{query.trim()}&quot;
                </span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
});

export default NoteLinkSuggestion;
