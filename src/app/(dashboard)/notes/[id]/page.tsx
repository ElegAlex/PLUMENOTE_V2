"use client";

/**
 * Note Edit Page
 *
 * Displays the note editor with toolbar for editing a specific note.
 * Auto-saves changes with debounce.
 *
 * @see Story 3.2: Editeur Tiptap Markdown de Base
 * @see Story 3.3: Creation d'une Nouvelle Note
 * @see Story 3.4: Sauvegarde Automatique des Notes
 * @see Story 3.5: Suppression d'une Note
 * @see FR8: Un utilisateur peut editer une note en Markdown avec previsualisation live
 */

import { use, useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { EditorToolbar } from "@/features/editor";
import { useNote } from "@/features/notes/hooks/useNote";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { useAutoSave } from "@/features/notes/hooks/useAutoSave";
import { NoteHeader, type SaveStatus } from "@/features/notes/components/NoteHeader";
import { TagsPanel } from "@/features/notes/components/TagsPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UpdateNoteInput } from "@/features/notes/types";

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: NotePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { note, isLoading, error, updateNoteAsync } = useNote(id);
  const { deleteNoteAsync, restoreNoteAsync } = useNotes({ enabled: false });
  const isOnline = useOnlineStatus();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track user edits separately from the loaded note
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const contentInitializedRef = useRef(false);
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  // Check if this is a newly created note (title is default "Sans titre" and no content)
  const isNewNote = useMemo(() => {
    if (!note) return false;
    return note.title === "Sans titre" && (!note.content || note.content === "");
  }, [note]);

  // Derive displayed values: use edited value if user has made changes, otherwise use note data
  const title = useMemo(
    () => editedTitle ?? note?.title ?? "",
    [editedTitle, note?.title]
  );

  // Auto-save handler with status tracking
  const handleSave = useCallback(
    async (data: UpdateNoteInput) => {
      setSaveStatus("saving");
      // Clear any pending timeout
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      try {
        await updateNoteAsync(data);
        setSaveStatus("saved");
        // Reset to idle after 2 seconds (with cleanup ref)
        saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to save note:", err);
        setSaveStatus("error");
        toast.error("Echec de la sauvegarde", {
          description: "Vos modifications n'ont pas pu etre enregistrees.",
          action: {
            label: "Reessayer",
            onClick: () => flushRef.current?.(),
          },
        });
      }
    },
    [updateNoteAsync]
  );

  const { save: autoSave, flush } = useAutoSave(handleSave, { delay: 2000 });

  // Store flush in ref for toast retry button
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Compute display save status (offline takes precedence)
  const displaySaveStatus: SaveStatus = useMemo(() => {
    if (!isOnline) return "offline";
    return saveStatus;
  }, [isOnline, saveStatus]);

  // Keyboard shortcut: Ctrl+S to force save
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const wasSaved = await flush();
        if (wasSaved) {
          toast.success("Note sauvegardee");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flush]);

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

  // Handle tags change (Story 3.6)
  const handleTagsChange = useCallback(
    (tagIds: string[]) => {
      // Tags are saved immediately (not debounced)
      updateNoteAsync({ tagIds }).catch((err) => {
        console.error("Failed to update tags:", err);
        toast.error("Echec de la mise a jour des tags");
      });
    },
    [updateNoteAsync]
  );

  // Handle delete confirmation (Story 3.5)
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);

    try {
      await deleteNoteAsync(id);
      // Redirect to dashboard first
      router.push("/dashboard");
      // Then show toast with undo option
      toast.success("Note supprimee", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreNoteAsync(id);
              toast.success("Note restauree");
              // Optionally navigate back to the note
              router.push(`/notes/${id}`);
            } catch {
              toast.error("Echec de la restauration");
            }
          },
        },
        duration: 30000, // 30 seconds for undo
      });
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Echec de la suppression", {
        description: "Impossible de supprimer la note.",
      });
      setIsDeleting(false);
    }
  }, [id, deleteNoteAsync, restoreNoteAsync, router]);

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
      {/* Note Header with Title, Save Status, and Delete Button */}
      <div className="mb-4 flex items-start gap-4">
        <div className="flex-1">
          <NoteHeader
            title={title}
            onTitleChange={handleTitleChange}
            saveStatus={displaySaveStatus}
            isNewNote={isNewNote}
          />
        </div>
        {/* Delete button (Story 3.5) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Supprimer la note"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Tags Panel (Story 3.6) */}
      <TagsPanel
        tags={note.tags ?? []}
        onTagsChange={handleTagsChange}
        className="mb-4"
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

      {/* Delete confirmation dialog (Story 3.5) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note?</AlertDialogTitle>
            <AlertDialogDescription>
              La note sera supprimee. Vous aurez 30 secondes pour annuler cette action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
