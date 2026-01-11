"use client";

/**
 * Main Tiptap Editor Component
 *
 * Provides a WYSIWYG Markdown editor with real-time rendering.
 * Supports: headings (h1-h6), bold, italic, lists, code, code blocks.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface EditorProps {
  /** Initial content (HTML string) */
  content?: string;
  /** Callback when content changes */
  onUpdate?: (content: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Callback when editor is ready with editor instance */
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export interface EditorRef {
  /** Get current HTML content */
  getHTML: () => string;
  /** Get current text content */
  getText: () => string;
  /** Set content programmatically */
  setContent: (content: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Get the editor instance */
  getEditor: () => ReturnType<typeof useEditor>;
}

/**
 * Tiptap Editor with StarterKit extensions
 *
 * @example
 * ```tsx
 * <Editor
 *   content="<p>Hello world</p>"
 *   onUpdate={(html) => console.log(html)}
 * />
 * ```
 */
export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(
  {
    content = "",
    onUpdate,
    placeholder = "Commencez à écrire...",
    editable = true,
    className,
    autoFocus = false,
    onEditorReady,
  },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: "editor-heading",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "editor-bullet-list",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "editor-ordered-list",
          },
        },
        code: {
          HTMLAttributes: {
            class: "editor-code",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "editor-code-block",
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: "editor-paragraph",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate dark:prose-invert max-w-none",
          "min-h-[200px] p-4 focus:outline-none",
          "prose-headings:font-semibold",
          "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
          "prose-h4:text-lg prose-h5:text-base prose-h6:text-sm",
          "prose-p:my-2 prose-p:leading-relaxed",
          "prose-ul:my-2 prose-ol:my-2",
          "prose-li:my-0.5",
          "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
          "prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  // Expose editor methods via ref
  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    getText: () => editor?.getText() ?? "",
    setContent: (newContent: string) => {
      editor?.commands.setContent(newContent);
    },
    focus: () => {
      editor?.commands.focus();
    },
    getEditor: () => editor,
  }));

  // Notify when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[200px] animate-pulse rounded-md bg-muted",
          className
        )}
      />
    );
  }

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
});

Editor.displayName = "Editor";
