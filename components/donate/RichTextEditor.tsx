"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TipTapImage from "@tiptap/extension-image";
import {
  Bold,
  Check,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink2,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  "aria-label"?: string;
};

export function RichTextEditor({ value, onChange, placeholder, ...ariaProps }: Props) {
  const t = useTranslations("donate");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const linkWrapRef = useRef<HTMLDivElement | null>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const maxImageBytes = 2 * 1024 * 1024;

  const toolbarText = useMemo(
    () => ({
      bold: t("form.richText.toolbar.bold"),
      italic: t("form.richText.toolbar.italic"),
      underline: t("form.richText.toolbar.underline"),
      heading: t("form.richText.toolbar.heading"),
      bulletList: t("form.richText.toolbar.bulletList"),
      orderedList: t("form.richText.toolbar.orderedList"),
      blockquote: t("form.richText.toolbar.blockquote"),
      link: t("form.richText.toolbar.link"),
      unlink: t("form.richText.toolbar.unlink"),
      undo: t("form.richText.toolbar.undo"),
      redo: t("form.richText.toolbar.redo"),
      image: t("form.richText.toolbar.image")
    }),
    [t]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] }
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" }
      }),
      Underline,
      TipTapImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-xl border border-white/10 max-w-full h-auto"
        }
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
        emptyNodeClass:
          "before:content-[attr(data-placeholder)] before:float-left before:text-slate-200/35 before:pointer-events-none before:h-0"
      })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[180px] px-4 py-3 focus:outline-none prose-p:leading-7 prose-a:text-sky-300 prose-strong:text-slate-50 prose-blockquote:border-l-sky-400/50 prose-blockquote:text-slate-200/85 prose-li:marker:text-slate-200/60"
      },
      handlePaste: (view, event) => {
        const clipboard = (event as ClipboardEvent).clipboardData;
        if (!clipboard?.items?.length) return false;
        const fileItem = Array.from(clipboard.items).find((item) => item.type.startsWith("image/"));
        if (!fileItem) return false;
        const file = fileItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        void insertImageFromFile(file);
        return true;
      },
      handleDrop: (view, event) => {
        const data = (event as DragEvent).dataTransfer;
        if (!data?.files?.length) return false;
        const file = Array.from(data.files).find((f) => f.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY });
        void insertImageFromFile(file, coords?.pos);
        return true;
      }
    }
  }, [placeholder]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!linkOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!linkWrapRef.current) return;
      if (linkWrapRef.current.contains(e.target as Node)) return;
      setLinkOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [linkOpen]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (!editor) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5" />
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5" />
          <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5" />
        </div>
        <div className="min-h-[180px] w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200/60">
          {placeholder ?? ""}
        </div>
      </div>
    );
  }

  const insertImageFromFile = async (file: File, insertAt?: number) => {
    setNotice(null);

    if (!file.type.startsWith("image/")) {
      setNotice(t("form.richText.image.unsupported"));
      return;
    }

    if (file.size > maxImageBytes) {
      setNotice(t("form.richText.image.tooLarge", { max: Math.floor(maxImageBytes / 1024 / 1024) }));
      return;
    }

    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!src) {
      setNotice(t("form.richText.image.readFailed"));
      return;
    }

    if (typeof insertAt === "number") {
      editor.chain().focus().insertContentAt(insertAt, { type: "image", attrs: { src } }).run();
      return;
    }

    editor.chain().focus().setImage({ src }).run();
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onUploadChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    void insertImageFromFile(files[0]);
    e.target.value = "";
  };

  const openLinkEditor = () => {
    const current = (editor.getAttributes("link")?.href as string | undefined) ?? "";
    setLinkUrl(current);
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const isLinkActive = editor.isActive("link");
  const canUndo = editor.can().chain().undo().run();
  const canRedo = editor.can().chain().redo().run();

  const ToolbarButton = ({
    title,
    active,
    disabled,
    onClick,
    icon: Icon
  }: {
    title: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-9 w-9 rounded-lg border transition-colors",
        active
          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
          : "border-white/10 bg-white/5 text-slate-200/75 hover:bg-white/10 hover:text-slate-50",
        disabled ? "cursor-not-allowed opacity-40 hover:bg-white/5 hover:text-slate-200/75" : ""
      ].join(" ")}
    >
      <Icon className="mx-auto h-4 w-4" />
    </button>
  );

  const Separator = () => <div className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
        <ToolbarButton
          title={toolbarText.undo}
          icon={Undo2}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!canUndo}
        />
        <ToolbarButton
          title={toolbarText.redo}
          icon={Redo2}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!canRedo}
        />

        <Separator />

        <ToolbarButton
          title={toolbarText.bold}
          icon={Bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        />
        <ToolbarButton
          title={toolbarText.italic}
          icon={Italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        />
        <ToolbarButton
          title={toolbarText.underline}
          icon={UnderlineIcon}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        />

        <Separator />

        <ToolbarButton
          title={toolbarText.heading}
          icon={Heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        />
        <ToolbarButton
          title={toolbarText.bulletList}
          icon={List}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        />
        <ToolbarButton
          title={toolbarText.orderedList}
          icon={ListOrdered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        />
        <ToolbarButton
          title={toolbarText.blockquote}
          icon={Quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        />

        <Separator />

        <div ref={linkWrapRef} className="relative">
          <ToolbarButton
            title={toolbarText.link}
            icon={Link2}
            onClick={openLinkEditor}
            active={isLinkActive && !linkOpen}
          />
          {linkOpen ? (
            <div className="absolute left-0 top-full z-10 mt-2 w-[280px] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <div className="text-xs font-semibold tracking-[0.12em] text-slate-200/70">
                {toolbarText.link}
              </div>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={t("form.richText.link.placeholder")}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={applyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                    disabled={!linkUrl.trim()}
                  >
                    <Check className="h-4 w-4" />
                    {t("form.richText.link.apply")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkOpen(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200/80 hover:bg-white/10 hover:text-slate-50"
                  >
                    <X className="h-4 w-4" />
                    {t("form.richText.link.cancel")}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={removeLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200/70 hover:bg-white/10 hover:text-slate-50"
                  disabled={!isLinkActive}
                  title={toolbarText.unlink}
                >
                  <Unlink2 className="h-4 w-4" />
                  {t("form.richText.link.remove")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <Separator />

        <ToolbarButton title={toolbarText.image} icon={ImagePlus} onClick={onUploadClick} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUploadChange}
        />
      </div>

      {notice ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100/85">
          {notice}
        </div>
      ) : null}

      <div className="relative rounded-xl border border-white/10 bg-black/20 focus-within:border-cyan-400/40 focus-within:ring-2 focus-within:ring-cyan-400/15">
        <EditorContent editor={editor} {...ariaProps} />
      </div>
    </div>
  );
}
