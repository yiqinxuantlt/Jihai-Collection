import { getEditorTypeLabel, splitTerms } from "../../view-models/editorViewModel.mjs";

const editorTypes = ["quote", "essay", "thought"];

export default function EditorAside({ draft, books, themes, onUpdateDraft }) {
  return (
    <aside className="metadata-panel">
      <h2>创作侧栏</h2>
      <label className="field">
        <span>书籍</span>
        <select value={draft.bookId || ""} onChange={(event) => onUpdateDraft({ bookId: event.target.value })}>
          {books.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}
        </select>
      </label>
      <label className="field">
        <span>所属目录</span>
        <select value={draft.type} onChange={(event) => onUpdateDraft({ type: event.target.value })}>
          {editorTypes.map((type) => (
            <option value={type} key={type}>{getEditorTypeLabel(type)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>页码 / 章节</span>
        <input value={draft.page || ""} onChange={(event) => onUpdateDraft({ page: event.target.value })} />
      </label>
      <label className="field">
        <span>标签</span>
        <input value={(draft.tags || []).join("，")} onChange={(event) => onUpdateDraft({ tags: splitTerms(event.target.value) })} />
      </label>
      <label className="field">
        <span>关键词</span>
        <select multiple value={draft.themeIds || []} onChange={(event) => onUpdateDraft({ themeIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
          {themes.map((theme) => <option value={theme.id} key={theme.id}>{theme.name}</option>)}
        </select>
      </label>
      <p className="hint-text">它能和哪本书、哪个主题产生连接？</p>
    </aside>
  );
}
