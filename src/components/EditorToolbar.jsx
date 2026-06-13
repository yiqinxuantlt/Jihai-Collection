const buttons = [
  { id: "h1", label: "H1", title: "一级标题", active: (editor) => editor.isActive("heading", { level: 1 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "h2", label: "H2", title: "二级标题", active: (editor) => editor.isActive("heading", { level: 2 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "h3", label: "H3", title: "三级标题", active: (editor) => editor.isActive("heading", { level: 3 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { divider: true },
  { id: "bold", label: "B", title: "加粗", active: (editor) => editor.isActive("bold"), run: (editor) => editor.chain().focus().toggleBold().run() },
  { id: "italic", label: "I", title: "斜体", active: (editor) => editor.isActive("italic"), run: (editor) => editor.chain().focus().toggleItalic().run() },
  { id: "underline", label: "U", title: "下划线", active: (editor) => editor.isActive("underline"), run: (editor) => editor.chain().focus().toggleUnderline().run() },
  { id: "strike", label: "S", title: "删除线", active: (editor) => editor.isActive("strike"), run: (editor) => editor.chain().focus().toggleStrike().run() },
  { divider: true },
  { id: "ordered", label: "1.", title: "有序列表", active: (editor) => editor.isActive("orderedList"), run: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { id: "bullet", label: "•", title: "无序列表", active: (editor) => editor.isActive("bulletList"), run: (editor) => editor.chain().focus().toggleBulletList().run() },
  { divider: true },
  { id: "quote", label: "“", title: "引用", active: (editor) => editor.isActive("blockquote"), run: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { id: "link", label: "↗", title: "插入链接", run: (editor, dialogs) => dialogs.openLink(editor) },
  { id: "image", label: "▧", title: "插入图片", run: (editor, dialogs) => dialogs.openImage(editor) },
  { id: "table", label: "▦", title: "插入表格", run: (editor) => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() },
  { id: "code", label: "</>", title: "行内代码", active: (editor) => editor.isActive("code"), run: (editor) => editor.chain().focus().toggleCode().run() },
  { id: "codeBlock", label: "{ }", title: "代码块", active: (editor) => editor.isActive("codeBlock"), run: (editor) => editor.chain().focus().toggleCodeBlock().run() },
  { id: "rule", label: "—", title: "分割线", run: (editor) => editor.chain().focus().setHorizontalRule().run() },
  { spacer: true },
  { id: "undo", label: "↶", title: "撤销", disabled: (editor) => !editor.can().undo(), run: (editor) => editor.chain().focus().undo().run() },
  { id: "redo", label: "↷", title: "重做", disabled: (editor) => !editor.can().redo(), run: (editor) => editor.chain().focus().redo().run() },
  { id: "clear", label: "Tx", title: "清除格式", run: (editor) => editor.chain().focus().clearNodes().unsetAllMarks().run() },
];

export default function EditorToolbar({ editor, dialogs }) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="编辑格式工具">
      {buttons.map((button, index) => {
        if (button.divider) return <span className="tool-divider" key={`divider-${index}`} />;
        if (button.spacer) return <span className="tool-spacer" key="spacer" />;
        const isActive = editor && button.active ? button.active(editor) : false;
        const isDisabled = !editor || (button.disabled ? button.disabled(editor) : false);
        return (
          <button
            className={`tool-button ${isActive ? "active" : ""}`}
            disabled={isDisabled}
            key={button.id}
            title={button.title}
            type="button"
            onClick={() => button.run(editor, dialogs)}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}
