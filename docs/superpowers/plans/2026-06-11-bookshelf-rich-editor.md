# Bookshelf Rich Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the reading notes site into a bookshelf-first app with book detail lists, separate rich-text editing pages, and smoother editing performance.

**Architecture:** Keep the current static app shape: `index.html` owns semantic containers, `assets/styles.css` owns responsive layout and visual polish, `assets/app.js` owns state, rendering, local persistence, rich-text behavior, and pure exported helpers. Replace broad full-page refreshes during typing with view-level rendering and editor-only updates.

**Tech Stack:** HTML, CSS, vanilla JavaScript, browser `localStorage`, `contenteditable`, `document.execCommand` for lightweight rich-text commands, Node.js `node:test`, and local browser smoke verification.

---

## File Structure

- Modify: `index.html`
  - Replace the always-visible editor shell with one main view host and a reusable floating rich-text toolbar.
- Modify: `assets/styles.css`
  - Add bookshelf, book detail, record list, editor page, rich editor, floating toolbar, and responsive styles.
- Modify: `assets/app.js`
  - Add `shelf`, `book`, and `editor` view state; render each view independently; add rich-text storage/export helpers; optimize save/render behavior.
- Modify: `tests/app.test.cjs`
  - Add pure tests for book-scoped filtering and HTML-to-Markdown conversion.

## Task 1: Extend Pure Logic for Book Views and Rich Text

**Files:**
- Modify: `assets/app.js`
- Modify: `tests/app.test.cjs`

- [ ] **Step 1: Add failing tests for book records and rich-text export**

Add these imports to `tests/app.test.cjs`:

```javascript
const {
  getBookNotes,
  richTextToMarkdown,
} = require("../assets/app.js");
```

Add these tests:

```javascript
test("getBookNotes returns notes scoped to one book and optional type", () => {
  const state = createInitialState();

  assert.deepEqual(
    getBookNotes(state, "book-slow-reading", "all").map((note) => note.id),
    ["note-001"],
  );
  assert.deepEqual(
    getBookNotes(state, "book-slow-reading", "quote").map((note) => note.id),
    ["note-001"],
  );
  assert.deepEqual(
    getBookNotes(state, "book-slow-reading", "essay").map((note) => note.id),
    [],
  );
});

test("richTextToMarkdown converts basic editor html into readable markdown", () => {
  const markdown = richTextToMarkdown("<h2>观点</h2><p><strong>主动</strong>阅读</p><blockquote>一句摘录</blockquote><ul><li>问题</li><li>连接</li></ul>");

  assert.match(markdown, /## 观点/);
  assert.match(markdown, /\*\*主动\*\*阅读/);
  assert.match(markdown, /> 一句摘录/);
  assert.match(markdown, /- 问题/);
  assert.match(markdown, /- 连接/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: the new tests fail because `getBookNotes` and `richTextToMarkdown` are not exported yet.

- [ ] **Step 3: Implement helper functions in `assets/app.js`**

Add these functions inside the exported factory, before `exportNoteMarkdown`:

```javascript
function getBookNotes(state, bookId, typeFilter) {
  var filter = typeFilter || "all";
  return normalizeList(state && state.notes)
    .filter(function (note) {
      return note.bookId === String(bookId);
    })
    .filter(function (note) {
      if (filter === "all") return true;
      if (filter === "essay") return note.type === "essay" || note.type === "thought";
      return note.type === filter;
    });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(value) {
  var escaped = escapeHtml(value);
  if (!escaped.trim()) return "";
  return escaped
    .split(/\n{2,}/)
    .map(function (paragraph) {
      return "<p>" + paragraph.replace(/\n/g, "<br>") + "</p>";
    })
    .join("");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|blockquote|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function richTextToMarkdown(html) {
  var source = String(html || "");
  if (!source.trim()) return "";
  return source
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, function (_, text) {
      return "\n# " + stripHtml(text) + "\n";
    })
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, function (_, text) {
      return "\n## " + stripHtml(text) + "\n";
    })
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, function (_, text) {
      return "\n### " + stripHtml(text) + "\n";
    })
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function (_, text) {
      return "\n> " + stripHtml(text).replace(/\n/g, "\n> ") + "\n";
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function (_, text) {
      return "\n- " + stripHtml(text);
    })
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```

Export `getBookNotes`, `escapeHtml`, `textToHtml`, `stripHtml`, and `richTextToMarkdown`.

- [ ] **Step 4: Update Markdown export**

Inside `exportNoteMarkdown`, compute rich content before building the result:

```javascript
var quoteMarkdown = safeNote.quoteHtml ? richTextToMarkdown(safeNote.quoteHtml) : safeNote.quote;
var bodyMarkdown = safeNote.bodyHtml ? richTextToMarkdown(safeNote.bodyHtml) : safeNote.body;
```

Then use `quoteMarkdown || "未填写"` and `bodyMarkdown || "未填写"` in the exported array.

- [ ] **Step 5: Run tests and verify pass**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: all tests pass.

## Task 2: Replace HTML Shell with View Host and Toolbar

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Simplify the body structure**

Replace the current `<body>` contents with:

```html
<body>
  <div class="app-shell" id="appShell">
    <main class="view-stage" id="viewStage" aria-live="polite"></main>
  </div>

  <div class="floating-toolbar" id="floatingToolbar" role="toolbar" aria-label="富文本编辑工具">
    <button class="tool-button" data-command="bold" type="button" title="加粗"><b>B</b></button>
    <button class="tool-button" data-command="italic" type="button" title="斜体"><i>I</i></button>
    <button class="tool-button" data-command="formatBlock" data-value="h2" type="button" title="标题">H</button>
    <button class="tool-button" data-command="formatBlock" data-value="blockquote" type="button" title="引用">“”</button>
    <button class="tool-button" data-command="insertUnorderedList" type="button" title="列表">•</button>
    <button class="tool-button" data-command="removeFormat" type="button" title="清除格式">Tx</button>
  </div>

  <dialog class="preview-dialog" id="previewDialog">
    <div class="preview-card">
      <button class="dialog-close" id="closePreviewButton" type="button" aria-label="关闭预览">&times;</button>
      <pre id="previewContent"></pre>
    </div>
  </dialog>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script src="assets/app.js"></script>
</body>
```

- [ ] **Step 2: Keep theme bootstrap**

Keep the existing `<head>` script that applies the saved dark theme before paint.

## Task 3: Implement Three View Renderers

**Files:**
- Modify: `assets/app.js`

- [ ] **Step 1: Normalize view state**

In `normalizeState`, replace the old default view setup with:

```javascript
safeState.activeView = ["shelf", "book", "editor"].indexOf(safeState.activeView) === -1 ? "shelf" : safeState.activeView;
safeState.activeBookId = safeState.activeBookId || "";
safeState.activeNoteId = safeState.activeNoteId || safeState.notes[0].id;
safeState.bookFilter = safeState.bookFilter || "all";
safeState.query = safeState.query || "";
safeState.notes.forEach(function (note) {
  note.quoteHtml = typeof note.quoteHtml === "string" ? note.quoteHtml : logic.textToHtml(note.quote || "");
  note.bodyHtml = typeof note.bodyHtml === "string" ? note.bodyHtml : logic.textToHtml(note.body || "");
});
```

- [ ] **Step 2: Replace `render()` with view routing**

Use:

```javascript
function render() {
  hideToolbar();
  if (state.activeView === "book") {
    renderBookView();
  } else if (state.activeView === "editor") {
    renderEditorView();
  } else {
    renderShelfView();
  }
  persistNow();
}
```

- [ ] **Step 3: Implement `renderShelfView`**

Render a full bookshelf page into `viewStage` with:

```javascript
function renderShelfView() {
  var stage = byId("viewStage");
  clearElement(stage);
  stage.className = "view-stage shelf-stage";
  stage.appendChild(createShelfHeader());
  stage.appendChild(createShelfGrid());
}
```

`createShelfHeader` must include brand text, search input, stats, and theme toggle. `createShelfGrid` must render book cards with `DocumentFragment`; each card click sets `state.activeBookId`, `state.activeView = "book"`, `state.bookFilter = "all"`, then calls `render()`.

- [ ] **Step 4: Implement `renderBookView`**

Render a book detail page with:

```javascript
function renderBookView() {
  var stage = byId("viewStage");
  var book = activeBook();
  if (!book) {
    state.activeView = "shelf";
    renderShelfView();
    return;
  }
  clearElement(stage);
  stage.className = "view-stage book-stage";
  stage.appendChild(createBookHeader(book));
  stage.appendChild(createBookFilters());
  stage.appendChild(createRecordList(book));
}
```

`createRecordList` must call `logic.getBookNotes(state, book.id, state.bookFilter)` and render one button/article per note. Clicking a note sets `state.activeNoteId = note.id`, `state.activeView = "editor"`, then calls `render()`.

- [ ] **Step 5: Implement `renderEditorView`**

Render a separate editor page:

```javascript
function renderEditorView() {
  var stage = byId("viewStage");
  var note = activeNote();
  if (!note) {
    state.activeView = "shelf";
    renderShelfView();
    return;
  }
  clearElement(stage);
  stage.className = "view-stage editor-stage";
  stage.appendChild(createEditorTopbar(note));
  stage.appendChild(createEditorLayout(note));
  bindEditorFields(note);
}
```

`createEditorLayout` must create title input, quote rich editor, body rich editor, and metadata panel. The rich editor elements need:

```javascript
editor.contentEditable = "true";
editor.className = "rich-editor";
editor.dataset.field = "bodyHtml";
editor.innerHTML = note.bodyHtml || "";
```

- [ ] **Step 6: Add navigation functions**

Add:

```javascript
function goShelf() {
  state.activeView = "shelf";
  state.activeBookId = "";
  state.bookFilter = "all";
  render();
}

function goBook(bookId) {
  state.activeBookId = bookId;
  state.activeView = "book";
  state.bookFilter = "all";
  render();
}

function goEditor(noteId) {
  state.activeNoteId = noteId;
  state.activeView = "editor";
  render();
}
```

## Task 4: Add Rich Text Editing and Floating Toolbar

**Files:**
- Modify: `assets/app.js`

- [ ] **Step 1: Track active rich editor**

Add browser-scope variables:

```javascript
var activeRichEditor = null;
var savedSelection = null;
```

- [ ] **Step 2: Bind rich editor input**

In `bindEditorFields`, add:

```javascript
document.querySelectorAll("[data-rich-editor]").forEach(function (editor) {
  editor.addEventListener("focus", function () {
    activeRichEditor = editor;
  });
  editor.addEventListener("input", function () {
    updateRichField(editor);
  });
  editor.addEventListener("mouseup", updateToolbarFromSelection);
  editor.addEventListener("keyup", updateToolbarFromSelection);
});
```

Implement:

```javascript
function updateRichField(editor) {
  var note = activeNote();
  if (!note) return;
  var field = editor.dataset.field;
  note[field] = editor.innerHTML;
  if (field === "quoteHtml") {
    note.quote = logic.stripHtml(editor.innerHTML);
  } else {
    note.body = logic.stripHtml(editor.innerHTML);
  }
  note.updatedAt = new Date().toISOString();
  updateEditorDerived(note);
  scheduleSave();
}
```

- [ ] **Step 3: Position toolbar by selection**

Add:

```javascript
function updateToolbarFromSelection() {
  var selection = window.getSelection();
  var toolbar = byId("floatingToolbar");
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideToolbar();
    return;
  }
  var range = selection.getRangeAt(0);
  var container = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  if (!container || !container.closest("[data-rich-editor]")) {
    hideToolbar();
    return;
  }
  activeRichEditor = container.closest("[data-rich-editor]");
  savedSelection = range.cloneRange();
  var rect = range.getBoundingClientRect();
  toolbar.classList.add("visible");
  toolbar.style.left = Math.max(12, rect.left + rect.width / 2 - toolbar.offsetWidth / 2) + "px";
  toolbar.style.top = Math.max(12, rect.top - toolbar.offsetHeight - 10) + "px";
}

function hideToolbar() {
  var toolbar = byId("floatingToolbar");
  if (toolbar) toolbar.classList.remove("visible");
}
```

- [ ] **Step 4: Bind toolbar commands once at startup**

Add:

```javascript
function bindToolbar() {
  byId("floatingToolbar").addEventListener("mousedown", function (event) {
    event.preventDefault();
  });
  byId("floatingToolbar").querySelectorAll("[data-command]").forEach(function (button) {
    button.addEventListener("click", function () {
      restoreSelection();
      document.execCommand(button.dataset.command, false, button.dataset.value || null);
      if (activeRichEditor) {
        updateRichField(activeRichEditor);
        activeRichEditor.focus();
      }
      updateToolbarFromSelection();
    });
  });
}
```

Add:

```javascript
function restoreSelection() {
  if (!savedSelection) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedSelection);
}
```

- [ ] **Step 5: Hide toolbar in obvious cases**

Add document listeners:

```javascript
document.addEventListener("selectionchange", function () {
  window.requestAnimationFrame(updateToolbarFromSelection);
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") hideToolbar();
});
document.addEventListener("scroll", hideToolbar, true);
```

## Task 5: Optimize Save and Partial Updates

**Files:**
- Modify: `assets/app.js`

- [ ] **Step 1: Stop full context rendering during typing**

Do not call `render()` or broad list renderers from rich text input. `updateRichField` should only update note fields, derived editor metadata, and scheduled save.

- [ ] **Step 2: Add debounced shelf search**

Use:

```javascript
var searchTimer = 0;

function scheduleSearchRender() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(function () {
    if (state.activeView === "shelf") renderShelfView();
    if (state.activeView === "book") renderBookView();
    scheduleSave();
  }, 120);
}
```

- [ ] **Step 3: Only persist on view changes after rendering**

Keep `persistNow()` in `render()` for navigation changes, but use `scheduleSave()` for editor input.

## Task 6: Restyle the App for Bookshelf, Lists, and Editor

**Files:**
- Modify: `assets/styles.css`

- [ ] **Step 1: Replace old three-column layout styles**

Keep root tokens and theme variables. Replace the old `.app-shell`, `.sidebar`, `.main-stage`, `.assistant-panel`, `.paper`, and `.inspector-*` layout rules with new view rules:

```css
body {
  min-height: 100vh;
  overflow: auto;
}

.app-shell {
  min-height: 100vh;
  padding: var(--sp-5);
}

.view-stage {
  min-height: calc(100vh - 48px);
  border: 1px solid var(--line);
  border-radius: var(--r-shell);
  background: var(--surface);
  backdrop-filter: blur(24px);
  box-shadow: var(--shadow-float);
  overflow: hidden;
}
```

- [ ] **Step 2: Add bookshelf styles**

Add `.shelf-hero`, `.shelf-toolbar`, `.book-grid`, `.shelf-book`, `.book-spine`, `.shelf-stat`, and hover/focus states. Use stable grid tracks:

```css
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-4);
}
```

- [ ] **Step 3: Add book detail list styles**

Add `.book-detail-header`, `.back-button`, `.filter-tabs`, `.record-list`, `.record-card`, `.record-type`, and `.empty-state` rules. Record cards should be compact and scannable.

- [ ] **Step 4: Add editor page styles**

Add `.editor-topbar`, `.editor-layout`, `.editor-paper`, `.rich-title`, `.rich-block`, `.rich-editor`, `.metadata-panel`, `.field`, `.chips`, `.chip`, and `.word-count`.

- [ ] **Step 5: Add floating toolbar styles**

Add:

```css
.floating-toolbar {
  position: fixed;
  z-index: 80;
  display: flex;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-ctrl);
  background: var(--surface-solid);
  box-shadow: 0 16px 48px rgba(45, 37, 32, 0.2);
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.floating-toolbar.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
```

- [ ] **Step 6: Add responsive rules**

At `max-width: 900px`, make editor metadata stack below the paper. At `max-width: 640px`, reduce padding and make topbar buttons wrap without overlap.

## Task 7: Browser Verification

**Files:**
- No source edits unless verification finds issues.

- [ ] **Step 1: Run unit tests**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: all tests pass.

- [ ] **Step 2: Start a local static server**

Run:

```powershell
python -m http.server 4173
```

Expected: site is available at `http://localhost:4173`.

- [ ] **Step 3: Check flows in browser**

Verify:

- Opening the site shows the bookshelf.
- Clicking a book shows that book's record list.
- Filters switch between all, quote, essay, and thought records.
- Clicking a record opens the separate editor page.
- Creating a record from a book attaches it to that book.
- Selecting text in quote/body shows the floating toolbar.
- Toolbar commands change the selected content.
- Refresh keeps edits.

- [ ] **Step 4: Check responsive layouts**

Verify desktop, about 900px wide, and about 390px wide. Text and buttons must not overlap.

- [ ] **Step 5: Stop the local server**

Stop the server process used for verification before finishing.

## Self-Review

- Spec coverage: The plan implements the bookshelf-first entry, book detail record list, separate editor page, rich-text selection toolbar, local persistence, Markdown export, and performance improvements.
- Placeholder scan: No task contains TBD/TODO or an unspecified implementation hand wave.
- Type consistency: `activeView`, `activeBookId`, `activeNoteId`, `bookFilter`, `quoteHtml`, and `bodyHtml` are used consistently across the plan.
