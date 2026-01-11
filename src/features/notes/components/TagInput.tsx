"use client";

/**
 * TagInput Component
 *
 * Autocomplete input for selecting or creating tags.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Tag } from "../types";

export interface TagInputProps {
  /** All available tags for autocomplete */
  existingTags: Tag[];
  /** IDs of tags already selected (to exclude from suggestions) */
  selectedTagIds: string[];
  /** Callback when a tag is selected */
  onTagSelect: (tagId: string) => void;
  /** Callback when a new tag should be created */
  onTagCreate: (name: string) => Promise<Tag>;
  /** Input placeholder */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * TagInput with autocomplete for selecting existing tags or creating new ones
 */
export function TagInput({
  existingTags,
  selectedTagIds,
  onTagSelect,
  onTagCreate,
  placeholder = "Ajouter un tag...",
  className,
  disabled = false,
}: TagInputProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter tags: exclude already selected, match search
  const filteredTags = existingTags
    .filter((t) => !selectedTagIds.includes(t.id))
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  // Check if search matches any existing tag name exactly
  const exactMatch = existingTags.find(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  // Can create if: has search text, no exact match, not already selected
  const canCreate = search.trim().length > 0 && !exactMatch;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (tagId: string) => {
    onTagSelect(tagId);
    setSearch("");
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;

    setIsCreating(true);
    try {
      const newTag = await onTagCreate(search.trim());
      onTagSelect(newTag.id);
      setSearch("");
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Command
        className={cn(
          "border rounded-md",
          isOpen && "rounded-b-none border-b-0"
        )}
        shouldFilter={false}
      >
        <CommandInput
          placeholder={placeholder}
          value={search}
          onValueChange={setSearch}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="h-9"
        />

        {isOpen && (
          <CommandList className="absolute left-0 right-0 top-full z-10 border border-t-0 rounded-b-md bg-popover shadow-md">
            {filteredTags.length === 0 && !canCreate && (
              <CommandEmpty>Aucun tag trouvé</CommandEmpty>
            )}

            {canCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  disabled={isCreating}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>
                    Créer &quot;{search.trim()}&quot;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {filteredTags.length > 0 && (
              <CommandGroup heading="Tags existants">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.id}
                    onSelect={() => handleSelect(tag.id)}
                    className="cursor-pointer"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
