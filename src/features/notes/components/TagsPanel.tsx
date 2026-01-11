"use client";

/**
 * TagsPanel Component
 *
 * Panel for managing tags on a note: displays current tags and allows adding/removing.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TagChip } from "./TagChip";
import { TagInput } from "./TagInput";
import { useTags } from "../hooks/useTags";
import type { Tag } from "../types";

export interface TagsPanelProps {
  /** Current tags on the note */
  tags: Tag[];
  /** Callback when tags change (receives new list of tag IDs) */
  onTagsChange: (tagIds: string[]) => void;
  /** Whether the panel is read-only */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Panel for viewing and managing note tags
 *
 * @example
 * ```tsx
 * <TagsPanel
 *   tags={note.tags ?? []}
 *   onTagsChange={(tagIds) => updateNote({ tagIds })}
 * />
 * ```
 */
export function TagsPanel({
  tags,
  onTagsChange,
  disabled = false,
  className,
}: TagsPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const { tags: allTags, createTagAsync, isCreating } = useTags();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const tagIds = tags.map((t) => t.id);

  // Focus management: focus input when shown, return focus to button when closed
  useEffect(() => {
    if (showInput) {
      // Focus the input inside the container after render
      const input = inputContainerRef.current?.querySelector("input");
      if (input) {
        input.focus();
      }
    }
  }, [showInput]);

  const handleAddTag = (tagId: string) => {
    if (!tagIds.includes(tagId)) {
      onTagsChange([...tagIds, tagId]);
    }
    setShowInput(false);
    // Return focus to add button
    setTimeout(() => addButtonRef.current?.focus(), 0);
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    try {
      const newTag = await createTagAsync({ name });
      return newTag;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Echec de la creation du tag";
      toast.error(message);
      throw error; // Re-throw so TagInput knows creation failed
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setRemovingTagId(tagId);
    try {
      onTagsChange(tagIds.filter((id) => id !== tagId));
    } finally {
      setRemovingTagId(null);
    }
  };

  const handleCloseInput = () => {
    setShowInput(false);
    // Return focus to add button
    setTimeout(() => addButtonRef.current?.focus(), 0);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Current tags */}
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          onRemove={disabled ? undefined : () => handleRemoveTag(tag.id)}
          isLoading={removingTagId === tag.id}
        />
      ))}

      {/* Add tag button or input */}
      {!disabled && (
        <>
          {showInput ? (
            <div className="w-48" ref={inputContainerRef}>
              <TagInput
                existingTags={allTags}
                selectedTagIds={tagIds}
                onTagSelect={handleAddTag}
                onTagCreate={handleCreateTag}
                placeholder="Rechercher ou créer..."
                disabled={isCreating}
              />
            </div>
          ) : (
            <Button
              ref={addButtonRef}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowInput(true)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              Tag
            </Button>
          )}
        </>
      )}

      {/* Empty state */}
      {tags.length === 0 && !showInput && (
        <span className="text-xs text-muted-foreground">
          Aucun tag
        </span>
      )}
    </div>
  );
}
