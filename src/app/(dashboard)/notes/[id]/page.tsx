"use client";

/**
 * Note Edit Page
 *
 * Displays the note editor with toolbar for editing a specific note.
 * Auto-saves changes with debounce.
 *
 * @see Story 3.2: Editeur Tiptap Markdown de Base
 * @see FR8: Un utilisateur peut editer une note en Markdown avec previsualisation live
 */

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EditorToolbar } from "@/features/editor";
import { useNote } from "@/features/notes/hooks/useNote";
import { useAutoSave } from "@/features/notes/hooks/useAutoSave";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import type { UpdateNoteInput } from "@/features/notes/types";

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: NotePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { note, isLoading, error, updateNoteAsync } = useNote(id);

  // Track user edits separately from the loaded note
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const contentInitializedRef = useRef(false);

  // Derive displayed values: use edited value if user has made changes, otherwise use note data
  const title = useMemo(
    () => editedTitle ?? note?.title ?? "",
    [editedTitle, note?.title]
  );

  // Auto-save handler
  const handleSave = useCallback(
    async (data: UpdateNoteInput) => {
      try {
        await updateNoteAsync(data);
      } catch (err) {
        console.error("Failed to save note:", err);
        toast.error("Echec de la sauvegarde", {
          description: "Vos modifications n'ont pas pu etre enregistrees.",
        });
      }
    },
    [updateNoteAsync]
  );

  const { save: autoSave } = useAutoSave(handleSave, { delay: 1000 });

  // Initialize editor with Placeholder extension
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder: "Commencez a ecrire...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate dark:prose-invert max-w-none min-h-[calc(100vh-300px)] p-4 focus:outline-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h5:text-base prose-h6:text-sm prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4",
      },
    },
    onCreate: () => {
      setIsEditorReady(true);
    },
    onUpdate: ({ editor: ed }) => {
      autoSave({ content: ed.getHTML() });
    },
  });

  // Update editor content when note loads and editor is ready (only once)
  useEffect(() => {
    if (
      editor &&
      isEditorReady &&
      note?.content !== undefined &&
      !contentInitializedRef.current
    ) {
      // Always mark as initialized, even for empty content (L4 fix)
      contentInitializedRef.current = true;
      const newContent = note.content ?? "";
      if (newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [editor, isEditorReady, note?.content]);

  // Handle title change with auto-save
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditedTitle(newTitle);
      autoSave({ title: newTitle });
    },
    [autoSave]
  );

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    const isNotFound = error.message.includes("not found");
    const isForbidden = error.message.includes("permission");

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">
            {isNotFound
              ? "Note introuvable"
              : isForbidden
                ? "Acces refuse"
                : "Erreur"}
          </h1>
          <p className="mb-4 text-muted-foreground">
            {isNotFound
              ? "Cette note n&apos;existe pas ou a ete supprimee."
              : isForbidden
                ? "Vous n&apos;avez pas la permission d&apos;acceder a cette note."
                : error.message}
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Handle case where note is null after loading
  if (!note) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Note Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Sans titre"
        className="mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground focus:ring-0"
        aria-label="Note title"
      />

      {/* Editor Toolbar */}
      <EditorToolbar editor={editor} className="mb-4" />

      {/* Editor Content */}
      <div className="rounded-lg border bg-card">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>
    </div>
  );
}
