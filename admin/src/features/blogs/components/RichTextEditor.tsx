import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button, Tooltip, message } from "antd";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
  Eraser,
} from "lucide-react";
import { blogsApi } from "../api";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Blog id is needed to upload inline images. Falsy → image button is disabled. */
  blogId?: string;
  placeholder?: string;
}

/**
 * WYSIWYG editor for blog content. Stores HTML.
 *
 * Replaces the markdown TextArea — non-technical authors get visible buttons
 * for every formatting action they need, no syntax to memorize.
 *
 * Image uploads require the blog to exist on the server first (we POST
 * multipart to /admin/blogs/:id/inline-image and insert the returned URL).
 * Until the post is saved at least once, the image button shows a hint.
 */
export default function RichTextEditor({
  value,
  onChange,
  blogId,
  placeholder = "Start writing your post here…",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // TipTap v3 StarterKit already bundles Underline, Link, Gapcursor, etc.
      // Configure the bundled Link instead of importing it separately (which
      // would register the schema/plugin twice and crash on Gapcursor).
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Image.configure({
        // Inline images render with the same styles as the public site (rounded, full width).
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when loading an existing blog) into the
  // editor. We avoid setting content if it already matches to prevent the
  // cursor from jumping during normal typing.
  const isHydrated = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (isHydrated.current) return;
    if (value && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    isHydrated.current = true;
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border border-border-light rounded-lg p-4 text-sm text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="border border-border-light rounded-lg overflow-hidden bg-background-elevated">
      <Toolbar editor={editor} blogId={blogId} />
      <div className="relative">
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose-base max-w-none px-4 py-4 min-h-[420px] text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-blockquote:text-muted prose-blockquote:border-l-primary prose-code:text-primary prose-code:bg-primary-bg prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────

function Toolbar({ editor, blogId }: { editor: Editor; blogId?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL (leave empty to remove link)", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function handleImageFile(file: File) {
    if (!blogId) {
      message.warning("Save the post as a draft first, then you can insert images.");
      return;
    }
    try {
      const { url } = await blogsApi.uploadInlineImage(blogId, file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      message.error((err as Error).message || "Image upload failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-border-light bg-background">
      {/* History */}
      <ToolbarButton
        tip="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={<Undo size={15} />}
      />
      <ToolbarButton
        tip="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={<Redo size={15} />}
      />

      <Divider />

      {/* Text formatting */}
      <ToolbarButton
        tip="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        icon={<Bold size={15} />}
      />
      <ToolbarButton
        tip="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        icon={<Italic size={15} />}
      />
      <ToolbarButton
        tip="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        icon={<UnderlineIcon size={15} />}
      />
      <ToolbarButton
        tip="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        icon={<Strikethrough size={15} />}
      />
      <ToolbarButton
        tip="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        icon={<Code size={15} />}
      />

      <Divider />

      {/* Headings */}
      <ToolbarButton
        tip="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        icon={<Heading1 size={15} />}
      />
      <ToolbarButton
        tip="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        icon={<Heading2 size={15} />}
      />
      <ToolbarButton
        tip="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        icon={<Heading3 size={15} />}
      />

      <Divider />

      {/* Lists & blocks */}
      <ToolbarButton
        tip="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        icon={<List size={15} />}
      />
      <ToolbarButton
        tip="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        icon={<ListOrdered size={15} />}
      />
      <ToolbarButton
        tip="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        icon={<Quote size={15} />}
      />
      <ToolbarButton
        tip="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={<Minus size={15} />}
      />

      <Divider />

      {/* Link & image */}
      <ToolbarButton
        tip="Insert / edit link"
        onClick={setLink}
        active={editor.isActive("link")}
        icon={<LinkIcon size={15} />}
      />
      <ToolbarButton
        tip={blogId ? "Insert image" : "Save the post first to enable image upload"}
        onClick={() => fileInputRef.current?.click()}
        disabled={!blogId}
        icon={<ImageIcon size={15} />}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        // `hidden` Tailwind class fights antd's resets in some versions, so
        // force display:none via inline style — guaranteed to win.
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = ""; // allow re-uploading the same file
        }}
      />

      <Divider />

      {/* Clear formatting */}
      <ToolbarButton
        tip="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        icon={<Eraser size={15} />}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  tip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
}

function ToolbarButton({ tip, onClick, active, disabled, icon }: ToolbarButtonProps) {
  return (
    <Tooltip title={tip} mouseEnterDelay={0.4}>
      <Button
        size="small"
        type={active ? "primary" : "text"}
        onClick={onClick}
        disabled={disabled}
        icon={icon}
        className="!h-7 !w-7 !p-0 !flex !items-center !justify-center"
      />
    </Tooltip>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-border-light mx-1" aria-hidden />;
}
