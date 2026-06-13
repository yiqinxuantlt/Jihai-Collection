# Paper Study Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the current three-column reading workspace into a quieter paper-study interface with a looser writing page, calmer side columns, and more polished detail states.

**Architecture:** Keep the existing `App -> Sidebar / Workbench / MetadataPanel / EditorPage` flow and the current Tiptap editor. Extract tiny `.mjs` view-model helpers for display copy, summaries, and editor labels so the current Node test runner can cover the new behavior, then split the largest JSX surfaces into a few focused presentation components and apply the visual refresh through `src/styles.css`.

**Tech Stack:** React 19, Vite 8, Tiptap 3, plain CSS variables, Node built-in test runner

---

### Task 1: Add testable workbench view-model helpers

**Files:**
- Create: `src/view-models/workbenchViewModel.mjs`
- Create: `tests/workbench-view-model.test.cjs`
- Modify: `src/components/Workbench.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Write the failing test**

```js
// tests/workbench-view-model.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");

test("workbench helpers expose stable section copy, note filters, and previews", async () => {
  const {
    getSectionCopy,
    getVisibleNotes,
    groupNotesByDate,
    getBookPreview,
    getNotePreview,
    getCountSummary,
  } = await import("../src/view-models/workbenchViewModel.mjs");

  const notes = [
    {
      id: "note-a",
      type: "quote",
      bookId: "book-a",
      title: "摘录 A",
      quoteText: "关键句子",
      bodyText: "",
      updatedAt: "2026-06-12T08:00:00.000Z",
      favorite: true,
    },
    {
      id: "note-b",
      type: "essay",
      bookId: "book-a",
      title: "随笔 B",
      quoteText: "",
      bodyText: "正文摘要",
      updatedAt: "2026-06-11T08:00:00.000Z",
      favorite: false,
    },
  ];

  assert.equal(getSectionCopy("shelf").title, "我的书架");
  assert.equal(getVisibleNotes("favorites", notes).length, 1);
  assert.equal(getVisibleNotes("quotes", notes)[0].id, "note-a");
  assert.equal(groupNotesByDate(notes)[0].date, "2026-06-12");
  assert.deepEqual(
    getBookPreview({ id: "book-a", status: "reading" }, notes),
    {
      statusLabel: "正在读",
      noteCount: 2,
      summary: "关键句子",
    },
  );
  assert.equal(
    getNotePreview(notes[1], { title: "一本书" }).meta,
    "随笔 · 6月11日 · 一本书",
  );
  assert.equal(getCountSummary({ books: 4, notes: 12 }), "4 本书 · 12 条记录");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workbench-view-model.test.cjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/view-models/workbenchViewModel.mjs`

- [ ] **Step 3: Implement the helper module**

```js
// src/view-models/workbenchViewModel.mjs
const SECTION_COPY = {
  shelf: { eyebrow: "Reading Knowledge Desk", title: "我的书架" },
  tags: { eyebrow: "Reading Knowledge Desk", title: "标签索引" },
  timeline: { eyebrow: "Reading Knowledge Desk", title: "最近阅读" },
  default: { eyebrow: "Reading Knowledge Desk", title: "阅读记录" },
};

export function getSectionCopy(section) {
  return SECTION_COPY[section] || SECTION_COPY.default;
}

export function getVisibleNotes(section, notes) {
  if (section === "quotes") return notes.filter((note) => note.type === "quote");
  if (section === "essays") return notes.filter((note) => note.type === "essay" || note.type === "thought");
  if (section === "favorites") return notes.filter((note) => note.favorite);
  return notes;
}

export function groupNotesByDate(notes) {
  const groups = new Map();

  for (const note of notes) {
    const date = (note.updatedAt || note.createdAt || "").slice(0, 10) || "未知日期";
    const bucket = groups.get(date) || [];
    bucket.push(note);
    groups.set(date, bucket);
  }

  return Array.from(groups.entries()).map(([date, items]) => ({ date, notes: items }));
}

export function formatWorkbenchDate(value) {
  if (!value) return "未知日期";
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function getNoteTypeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

export function getBookPreview(book, notes) {
  const bookNotes = notes.filter((note) => note.bookId === book.id);
  const latest = bookNotes[0];

  return {
    statusLabel: book.status === "finished" ? "已读" : book.status === "planned" ? "待读" : "正在读",
    noteCount: bookNotes.length,
    summary: latest ? (latest.quoteText || latest.bodyText || "还没有正文摘要。") : "还没有摘录或随笔。",
  };
}

export function getNotePreview(note, book) {
  return {
    meta: `${getNoteTypeLabel(note.type)} · ${formatWorkbenchDate(note.updatedAt)} · ${book ? book.title : "未关联书籍"}`,
    quote: note.quoteText || "",
    summary: note.bodyText || "还没有写下正文。",
  };
}

export function getCountSummary(counts) {
  return `${counts.books} 本书 · ${counts.notes} 条记录`;
}
```

- [ ] **Step 4: Wire `Workbench.jsx` and `Sidebar.jsx` to the helper exports**

```jsx
// src/components/Workbench.jsx
import {
  formatWorkbenchDate,
  getCountSummary,
  getNoteTypeLabel,
  getSectionCopy,
  getVisibleNotes,
  groupNotesByDate,
} from "../view-models/workbenchViewModel.mjs";

const copy = getSectionCopy(section);
const visibleNotes = getVisibleNotes(section, notes);
const timelineGroups = groupNotesByDate(notes);

<p className="eyebrow">{copy.eyebrow}</p>
<h1>{copy.title}</h1>

{section === "timeline" && timelineGroups.map(({ date, notes: groupedNotes }) => (
  <section className="timeline-group" key={date}>
    <h2>{date}</h2>
    {groupedNotes.map((note) => (
      <article className={`note-card ${note.id === activeNoteId ? "selected" : ""}`} key={note.id}>
        <button type="button" onClick={() => onNoteSelect(note.id)}>
          <span className="card-meta">{getNoteTypeLabel(note.type)} · {formatWorkbenchDate(note.updatedAt)} · {booksById.get(note.bookId)?.title || "未关联书籍"}</span>
          <strong>{note.title}</strong>
          {note.quoteText ? <blockquote>{note.quoteText}</blockquote> : null}
          <p>{note.bodyText || "还没有写下正文。"}</p>
        </button>
        <button className="ghost-button compact" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
      </article>
    ))}
  </section>
))}
```

```jsx
// src/components/Sidebar.jsx
import { getCountSummary } from "../view-models/workbenchViewModel.mjs";

<span>{getCountSummary(counts)}</span>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/workbench-view-model.test.cjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/workbench-view-model.test.cjs src/view-models/workbenchViewModel.mjs src/components/Workbench.jsx src/components/Sidebar.jsx
git commit -m "refactor: add workbench view models"
```

### Task 2: Extract focused workbench presentation components

**Files:**
- Create: `src/components/workbench/WorkbenchHeader.jsx`
- Create: `src/components/workbench/BookShelfCard.jsx`
- Create: `src/components/workbench/NoteSummaryCard.jsx`
- Modify: `src/components/Workbench.jsx`
- Modify: `src/components/MetadataPanel.jsx`

- [ ] **Step 1: Create the focused workbench header**

```jsx
// src/components/workbench/WorkbenchHeader.jsx
import { getSectionCopy } from "../../view-models/workbenchViewModel.mjs";

export default function WorkbenchHeader({ section, activeBookId, onCreateBook, onCreateNote }) {
  const copy = getSectionCopy(section);

  return (
    <header className="main-header workbench-header">
      <div className="header-copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
      </div>
      <div className="header-actions">
        <button className="secondary-button" type="button" onClick={onCreateBook}>新建书籍</button>
        <button className="primary-button" type="button" onClick={() => onCreateNote(activeBookId)}>新建记录</button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create the bookshelf and note summary cards**

```jsx
// src/components/workbench/BookShelfCard.jsx
import { getBookPreview } from "../../view-models/workbenchViewModel.mjs";

export default function BookShelfCard({ book, notes, selected, onSelect }) {
  const preview = getBookPreview(book, notes);

  return (
    <button className={`book-card ${selected ? "selected" : ""}`} type="button" onClick={() => onSelect(book.id)}>
      <img className="book-cover" src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
      <span className="card-meta">{preview.statusLabel} · {preview.noteCount} 条记录</span>
      <strong>{book.title}</strong>
      <small>{book.author || "未填写作者"}</small>
      <p>{preview.summary}</p>
    </button>
  );
}
```

```jsx
// src/components/workbench/NoteSummaryCard.jsx
import { getNotePreview } from "../../view-models/workbenchViewModel.mjs";

export default function NoteSummaryCard({ note, book, selected, onSelect, onOpenEditor }) {
  const preview = getNotePreview(note, book);

  return (
    <article className={`note-card ${selected ? "selected" : ""}`}>
      <button type="button" onClick={() => onSelect(note.id)}>
        <span className="card-meta">{preview.meta}</span>
        <strong>{note.title}</strong>
        {preview.quote ? <blockquote>{preview.quote}</blockquote> : null}
        <p>{preview.summary}</p>
      </button>
      <button className="ghost-button compact" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
    </article>
  );
}
```

- [ ] **Step 3: Replace inline workbench JSX with the extracted components**

```jsx
// src/components/Workbench.jsx
import WorkbenchHeader from "./workbench/WorkbenchHeader.jsx";
import BookShelfCard from "./workbench/BookShelfCard.jsx";
import NoteSummaryCard from "./workbench/NoteSummaryCard.jsx";

<WorkbenchHeader
  section={section}
  activeBookId={activeBookId}
  onCreateBook={onCreateBook}
  onCreateNote={onCreateNote}
/>

{section === "shelf" && books.map((book) => (
  <BookShelfCard
    key={book.id}
    book={book}
    notes={notes}
    selected={book.id === activeBookId}
    onSelect={onBookSelect}
  />
))}

{["quotes", "essays", "favorites"].includes(section) && visibleNotes.map((note) => (
  <NoteSummaryCard
    key={note.id}
    note={note}
    book={booksById.get(note.bookId)}
    selected={note.id === activeNoteId}
    onSelect={onNoteSelect}
    onOpenEditor={onOpenEditor}
  />
))}
```

- [ ] **Step 4: Quiet the right detail panel structure**

```jsx
// src/components/MetadataPanel.jsx
<aside className="detail-panel">
  {book ? (
    <section className="panel-section panel-section-book">
      <p className="panel-label">当前书籍</p>
      <div className="book-summary">
        <img src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
        <div>
          <strong>{book.title}</strong>
          <span>{book.author || "未填写作者"}</span>
        </div>
      </div>
    </section>
  ) : null}

  {note ? (
    <section className="panel-section panel-section-note">
      <p className="panel-label">边注记录</p>
      <span className="record-type">{typeLabel(note.type)}</span>
      <strong>{note.title}</strong>
      <p>{note.bodyText || note.quoteText || "还没有正文。"}</p>
      <div className="tag-row">
        {(note.themeIds || []).map((id) => {
          const theme = themes.find((item) => item.id === id);
          return theme ? <span className="tag-chip theme" key={id}>{theme.name}</span> : null;
        })}
        {(note.tags || []).map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}
      </div>
      <div className="panel-actions">
        <button className={`secondary-button ${note.favorite ? "active" : ""}`} type="button" onClick={() => onPatchNote(note.id, { favorite: !note.favorite })}>
          {note.favorite ? "已收藏" : "收藏"}
        </button>
        <button className="primary-button" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
      </div>
    </section>
  ) : null}
</aside>
```

- [ ] **Step 5: Run build to verify the component split compiles**

Run: `npm run build`
Expected: PASS with a generated Vite production bundle and no unresolved imports

- [ ] **Step 6: Commit**

```bash
git add src/components/workbench/WorkbenchHeader.jsx src/components/workbench/BookShelfCard.jsx src/components/workbench/NoteSummaryCard.jsx src/components/Workbench.jsx src/components/MetadataPanel.jsx
git commit -m "refactor: split workbench presentation components"
```

### Task 3: Add testable editor view-model helpers and extract the side note panel

**Files:**
- Create: `src/view-models/editorViewModel.mjs`
- Create: `src/components/editor/EditorAside.jsx`
- Create: `tests/editor-view-model.test.cjs`
- Modify: `src/components/EditorPage.jsx`
- Modify: `src/components/EditorToolbar.jsx`

- [ ] **Step 1: Write the failing editor helper test**

```js
// tests/editor-view-model.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");

test("editor helpers normalize tags and derive paper copy", async () => {
  const {
    createEmptyDoc,
    splitTerms,
    getSaveStateText,
    getEditorTypeLabel,
    getBodyLabel,
    getPaperKicker,
    showQuoteSection,
  } = await import("../src/view-models/editorViewModel.mjs");

  assert.deepEqual(createEmptyDoc(), { type: "doc", content: [{ type: "paragraph" }] });
  assert.deepEqual(splitTerms("方法论，问题意识, 复盘"), ["方法论", "问题意识", "复盘"]);
  assert.equal(getSaveStateText("saving"), "保存中");
  assert.equal(getEditorTypeLabel("thought"), "感想");
  assert.equal(getBodyLabel("thought"), "感想正文");
  assert.equal(
    getPaperKicker({ type: "quote", page: "第 23 页", bookTitle: "如何阅读一本书" }),
    "摘录 · 第 23 页 · 如何阅读一本书",
  );
  assert.equal(showQuoteSection("thought"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/editor-view-model.test.cjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/view-models/editorViewModel.mjs`

- [ ] **Step 3: Implement the editor helper module**

```js
// src/view-models/editorViewModel.mjs
export function createEmptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function splitTerms(value) {
  return String(value || "")
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSaveStateText(saveState) {
  if (saveState === "saving") return "保存中";
  if (saveState === "dirty") return "待保存";
  if (saveState === "error") return "保存失败";
  return "已保存";
}

export function getEditorTypeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

export function getBodyLabel(type) {
  return type === "thought" ? "感想正文" : "随笔正文";
}

export function getPaperKicker({ type, page, bookTitle }) {
  return `${getEditorTypeLabel(type)} · ${page || "未填写页码"} · ${bookTitle || "未关联书籍"}`;
}

export function showQuoteSection(type) {
  return type !== "thought";
}
```

- [ ] **Step 4: Extract the editor-side annotation panel and simplify `EditorPage.jsx`**

```jsx
// src/components/editor/EditorAside.jsx
import { splitTerms } from "../../view-models/editorViewModel.mjs";

export default function EditorAside({ draft, books, themes, onUpdateDraft }) {
  return (
    <aside className="metadata-panel editor-aside">
      <h2>边注整理</h2>
      <label className="field">
        <span>书籍</span>
        <select value={draft.bookId || ""} onChange={(event) => onUpdateDraft({ bookId: event.target.value })}>
          {books.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}
        </select>
      </label>
      <label className="field">
        <span>所属目录</span>
        <select value={draft.type} onChange={(event) => onUpdateDraft({ type: event.target.value })}>
          <option value="quote">摘录</option>
          <option value="essay">随笔</option>
          <option value="thought">感想</option>
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
      <p className="hint-text">这条记录和哪本书、哪个主题、哪一页形成连接？</p>
    </aside>
  );
}
```

```jsx
// src/components/EditorPage.jsx
import EditorAside from "./editor/EditorAside.jsx";
import {
  createEmptyDoc,
  getBodyLabel,
  getEditorTypeLabel,
  getPaperKicker,
  getSaveStateText,
  showQuoteSection,
} from "../view-models/editorViewModel.mjs";

const currentBook = books.find((book) => book.id === draft.bookId);
const saveText = getSaveStateText(saveState);
const paperKicker = getPaperKicker({ type: draft.type, page: draft.page, bookTitle: currentBook?.title });

<span className="crumb">{currentBook ? currentBook.title : "未关联书籍"} / {getEditorTypeLabel(draft.type)}</span>
<span className={`save-pill ${saveState}`}>{saveText}</span>
<p className="paper-kicker">{paperKicker}</p>

{showQuoteSection(draft.type) ? (
  <section className="rich-block rich-block-quote">
    <p className="block-label">摘录原文</p>
    <RichEditor
      className="quote-editor"
      placeholder="粘贴或写下这本书里击中你的句子"
      value={draft.quoteDoc || createEmptyDoc()}
      onChange={(doc) => updateDraft({ quoteDoc: doc })}
      onReady={setActiveEditor}
    />
  </section>
) : null}

<section className="rich-block">
  <p className="block-label">{getBodyLabel(draft.type)}</p>
  <RichEditor
    placeholder="写下你的理解、联想、问题或复盘"
    value={draft.bodyDoc || createEmptyDoc()}
    onChange={(doc) => updateDraft({ bodyDoc: doc })}
    onReady={setActiveEditor}
  />
</section>

<EditorAside draft={draft} books={books} themes={themes} onUpdateDraft={updateDraft} />
```

- [ ] **Step 5: Make the toolbar labels calmer without changing editor behavior**

```jsx
// src/components/EditorToolbar.jsx
const buttons = [
  { id: "h1", label: "H1", title: "一级标题", active: (editor) => editor.isActive("heading", { level: 1 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "h2", label: "H2", title: "二级标题", active: (editor) => editor.isActive("heading", { level: 2 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "quote", label: "引", title: "引用", active: (editor) => editor.isActive("blockquote"), run: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { id: "link", label: "链", title: "插入链接", run: (editor, dialogs) => dialogs.openLink(editor) },
  { id: "image", label: "图", title: "插入图片", run: (editor, dialogs) => dialogs.openImage(editor) },
  { id: "undo", label: "撤", title: "撤销", disabled: (editor) => !editor.can().undo(), run: (editor) => editor.chain().focus().undo().run() },
  { id: "redo", label: "重", title: "重做", disabled: (editor) => !editor.can().redo(), run: (editor) => editor.chain().focus().redo().run() },
];
```

- [ ] **Step 6: Run tests and build**

Run: `node --test tests/editor-view-model.test.cjs`
Expected: PASS

Run: `npm run build`
Expected: PASS with the editor imports resolved and no JSX compile errors

- [ ] **Step 7: Commit**

```bash
git add tests/editor-view-model.test.cjs src/view-models/editorViewModel.mjs src/components/editor/EditorAside.jsx src/components/EditorPage.jsx src/components/EditorToolbar.jsx
git commit -m "refactor: add editor view models and side annotations"
```

### Task 4: Apply the paper-study visual system across workbench and editor

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/MetadataPanel.jsx`
- Modify: `src/components/RichEditor.jsx`

- [ ] **Step 1: Refresh global tokens and shell surfaces**

```css
/* src/styles.css */
:root {
  --bg-canvas: #f3f0e8;
  --bg-shell: #faf7f0;
  --surface: #fffdfa;
  --surface-muted: #f2ede3;
  --paper: #fffdf8;
  --paper-shadow: 0 18px 42px rgba(36, 33, 28, 0.07);
  --shell-shadow: 0 18px 48px rgba(36, 33, 28, 0.08);
  --font-hand: "LXGW WenKai", "Kaiti SC", KaiTi, serif;
}

.app-shell {
  padding: 18px;
  background:
    radial-gradient(circle at top, rgba(255, 253, 248, 0.88), transparent 38%),
    var(--bg-canvas);
}

.workbench-shell {
  grid-template-columns: 256px minmax(0, 1fr) 324px;
  border-radius: 22px;
  box-shadow: var(--shell-shadow);
}
```

- [ ] **Step 2: Restyle sidebar, workbench cards, and right detail panel**

```css
.sidebar {
  padding: 26px 18px;
  background: color-mix(in srgb, var(--surface-muted) 74%, var(--paper));
}

.nav-item {
  padding: 12px 13px;
  border-radius: 10px;
  transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.nav-item.selected {
  background: color-mix(in srgb, var(--paper) 80%, var(--surface-muted));
  box-shadow: inset 2px 0 0 var(--sage);
}

.book-card,
.note-card,
.panel-section {
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 88%, var(--paper));
}

.book-card strong,
.note-card strong,
.panel-section strong {
  font-size: 19px;
  line-height: 1.35;
}

.panel-label {
  margin: 0;
  color: var(--clay);
  font-family: var(--font-hand);
  font-size: 12px;
}
```

- [ ] **Step 3: Turn the editor into a looser writing page**

```css
.editor-layout {
  grid-template-columns: minmax(720px, 840px) minmax(290px, 340px);
  gap: 36px;
  padding: 40px clamp(24px, 4vw, 72px) 56px;
}

.editor-paper {
  min-height: min(820px, calc(100vh - 170px));
  padding: 42px 56px 52px;
  border-radius: 22px;
  box-shadow: var(--paper-shadow);
}

.title-input {
  max-width: 720px;
  font-size: 38px;
  line-height: 1.28;
  letter-spacing: 0;
}

.rich-block {
  max-width: 720px;
  margin-top: 40px;
}

.tiptap-surface {
  min-height: 280px;
  font-size: 18px;
  line-height: 1.88;
}

.quote-editor {
  min-height: 132px;
  border: 1px solid color-mix(in srgb, var(--blue) 22%, var(--border));
  background: color-mix(in srgb, var(--paper) 82%, var(--surface-muted));
  padding: 18px 20px;
}
```

- [ ] **Step 4: Polish toolbar, rich text details, and responsive behavior**

```css
.editor-toolbar {
  gap: 8px;
  margin-bottom: 44px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
}

.tool-button {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  border-color: transparent;
}

.tool-button.active {
  background: color-mix(in srgb, var(--sage) 10%, var(--paper));
  border-color: color-mix(in srgb, var(--sage) 36%, var(--border));
}

.ProseMirror blockquote {
  border-left: 2px solid var(--clay);
  background: color-mix(in srgb, var(--paper) 70%, var(--surface-muted));
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: color-mix(in srgb, var(--muted) 78%, var(--paper));
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}

@media (max-width: 1180px) {
  .workbench-shell {
    grid-template-columns: 232px minmax(0, 1fr);
  }

  .editor-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 5: Keep the rich editor class wiring simple**

```jsx
// src/components/RichEditor.jsx
editorProps: {
  attributes: {
    class: ["tiptap-surface", className].filter(Boolean).join(" "),
    "data-placeholder": placeholder,
  },
},
```

- [ ] **Step 6: Run full project verification**

Run: `npm test`
Expected: PASS for `tests/app.test.cjs`, `tests/server.test.cjs`, `tests/workbench-view-model.test.cjs`, and `tests/editor-view-model.test.cjs`

Run: `npm run build`
Expected: PASS with a production bundle in `dist/`

Run: `npm run dev`
Expected: Local app starts without console build errors

Manual checklist:
- Open the workbench and confirm the left and right columns visually retreat behind the center column
- Open a note in the editor and confirm the title, quote section, and body feel like a single writing page
- Toggle dark mode and confirm the quieter paper-study contrast still reads cleanly
- Shrink to the tablet and mobile breakpoints and confirm the layout remains readable and editable

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/components/Sidebar.jsx src/components/MetadataPanel.jsx src/components/RichEditor.jsx
git commit -m "feat: polish paper study workbench ui"
```
