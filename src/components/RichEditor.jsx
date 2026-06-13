import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({
    placeholder: ({ editor }) => editor.options.editorProps.attributes["data-placeholder"] || "鍐欎笅鏂囧瓧",
  }),
  CharacterCount,
];

export default function RichEditor({ value, placeholder, className, onChange, onReady }) {
  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class: ["tiptap-surface", className].filter(Boolean).join(" "),
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor: current }) {
      onChange(current.getJSON());
    },
  });

  useEffect(() => {
    if (editor && onReady) onReady(editor);
    return () => {
      if (onReady) onReady(null);
    };
  }, [editor, onReady]);

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next && !editor.isFocused) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return <EditorContent editor={editor} />;
}
