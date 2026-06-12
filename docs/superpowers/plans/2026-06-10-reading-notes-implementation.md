# Reading Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-first reading notes webpage based on the provided “墨读札记” reference interface, with local saving, book/theme organization, search, and Markdown export.

**Architecture:** Implement a static single-page app that opens directly from `index.html`. Keep the UI shell, styles, browser behavior, and tests in separate files so the app remains understandable without a build step.

**Tech Stack:** HTML, CSS, vanilla JavaScript, browser `localStorage`, Node.js built-in `node:test` for pure logic tests, and a browser smoke check for visual/manual verification.

---

## File Structure

- Create: `C:\Users\TianLutao\Documents\书籍阅读记录可视化\index.html`
  - Owns semantic page structure and connects stylesheet/script assets.
- Create: `C:\Users\TianLutao\Documents\书籍阅读记录可视化\assets\styles.css`
  - Owns the reference visual language, desktop three-column layout, and responsive fallbacks.
- Create: `C:\Users\TianLutao\Documents\书籍阅读记录可视化\assets\app.js`
  - Owns sample data, local persistence, filtering, editing, auto-save, export, and DOM rendering.
- Create: `C:\Users\TianLutao\Documents\书籍阅读记录可视化\tests\app.test.cjs`
  - Tests pure data behavior from `assets/app.js` with Node’s built-in test runner.
- Create: `C:\Users\TianLutao\Documents\书籍阅读记录可视化\.gitignore`
  - Keeps local brainstorm artifacts and temporary files out of version control if the folder later becomes a repository.

## Scope Check

The spec is one coherent local webpage, not multiple independent systems. One implementation plan is enough. Out of scope remains cloud sync, login, ISBN lookup, AI summary, and a full rich-text editor.

## Task 1: Create Static App Shell

**Files:**
- Create: `index.html`
- Create: `assets\styles.css`
- Create: `.gitignore`

- [ ] **Step 1: Add project ignore rules**

Create `.gitignore` with:

```gitignore
.superpowers/
node_modules/
*.log
```

- [ ] **Step 2: Create the HTML shell**

Create `index.html` with the same three-region structure as the reference file:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>墨读札记｜阅读随笔记录</title>
  <link rel="stylesheet" href="assets/styles.css" />
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" aria-label="左侧书籍与主题导航">
      <div class="brand">
        <div class="seal">墨</div>
        <div>
          <h1 class="brand-title">墨读札记</h1>
          <p class="brand-subtitle">Quiet Reading Desk</p>
        </div>
      </div>

      <button class="primary-action" id="newNoteButton" type="button">新建阅读记录</button>

      <div class="search-box">
        <input id="searchInput" type="search" placeholder="搜索书名、摘录、主题" aria-label="搜索书名、摘录、主题" />
      </div>

      <div class="library">
        <section>
          <p class="label">书桌</p>
          <div class="nav-group" id="viewNav"></div>
        </section>

        <section class="stack-section">
          <p class="label">正在阅读</p>
          <div id="bookList"></div>
        </section>

        <section class="stack-section">
          <p class="label">主题索引</p>
          <div id="themeList" class="theme-list"></div>
        </section>
      </div>

      <div class="sidebar-footer" id="sidebarFooter"></div>
    </aside>

    <main class="main-stage" aria-label="阅读随笔主编辑区">
      <header class="topbar">
        <div>
          <p class="crumb" id="crumbText">今日书写</p>
          <h2 class="page-title">阅读随笔编辑台</h2>
        </div>

        <div class="status-strip">
          <span class="saved-dot" aria-hidden="true"></span>
          <span id="saveStatus">已保存</span>
          <button class="ghost-button" id="previewButton" type="button">预览</button>
          <button class="ghost-button" id="exportButton" type="button">导出</button>
          <button class="ghost-button danger" id="deleteButton" type="button">删除</button>
        </div>
      </header>

      <div class="workspace">
        <div class="writing-layout">
          <article class="paper" aria-label="阅读记录稿纸">
            <div class="paper-kicker" id="paperKicker">摘录 · 随笔 · 感想</div>
            <input class="title-input" id="noteTitle" aria-label="记录标题" />
            <textarea class="quote-panel quote-input" id="noteQuote" aria-label="摘录原文"></textarea>
            <textarea class="body-input" id="noteBody" aria-label="随笔正文"></textarea>
            <div class="paper-footer">
              <div class="chips" id="noteChips"></div>
              <span id="wordCount">约 0 字</span>
            </div>
          </article>

          <aside class="inspector" aria-label="阅读记录元信息">
            <section class="mini-card">
              <h3>元信息</h3>
              <label class="field">
                <span>记录类型</span>
                <select id="noteType"></select>
              </label>
              <label class="field">
                <span>关联书籍</span>
                <select id="bookSelect"></select>
              </label>
              <label class="field">
                <span>页码 / 章节</span>
                <input id="notePage" />
              </label>
              <label class="field">
                <span>主题，用中文逗号分隔</span>
                <input id="themeInput" />
              </label>
              <label class="field">
                <span>标签，用中文逗号分隔</span>
                <input id="tagInput" />
              </label>
            </section>

            <section class="mini-card">
              <h3>快速格式</h3>
              <div class="format-row">
                <button class="format" data-insert="**加粗文字**" type="button">B</button>
                <button class="format" data-insert="*斜体文字*" type="button">I</button>
                <button class="format" data-insert="## 小标题" type="button">H</button>
                <button class="format" data-insert="> 引用" type="button">“”</button>
                <button class="format" data-insert="- 条目" type="button">•</button>
                <button class="format" data-insert="# 标签" type="button">#</button>
              </div>
            </section>

            <section class="mini-card">
              <h3>轻提示</h3>
              <p class="hint-text" id="writingPrompt"></p>
            </section>
          </aside>
        </div>
      </div>
    </main>

    <aside class="assistant-panel" aria-label="右侧阅读上下文">
      <section class="overview" id="weeklyOverview"></section>
      <section class="side-section">
        <h3 class="side-title">主题连接</h3>
        <div class="chips" id="contextThemes"></div>
      </section>
      <section class="side-section">
        <h3 class="side-title">当前列表</h3>
        <div class="related" id="noteList"></div>
      </section>
      <section class="side-section">
        <h3 class="side-title">可能相关</h3>
        <div class="related" id="relatedNotes"></div>
      </section>
    </aside>
  </div>

  <dialog class="preview-dialog" id="previewDialog">
    <div class="preview-card">
      <button class="dialog-close" id="closePreviewButton" type="button" aria-label="关闭预览">×</button>
      <pre id="previewContent"></pre>
    </div>
  </dialog>

  <script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Add the first stylesheet pass**

Create `assets\styles.css` by adapting the reference visual system. The stylesheet must include these selectors because `index.html` depends on them:

```css
:root {
  --bg: #f3eee6;
  --bg-deep: #e9dfd2;
  --surface: rgba(255, 251, 244, 0.78);
  --paper: #fffdf7;
  --ink: #29231f;
  --ink-soft: #4c423a;
  --muted: #827669;
  --faint: #a79b8e;
  --line: rgba(139, 119, 98, 0.18);
  --line-strong: rgba(139, 119, 98, 0.28);
  --accent: #795044;
  --accent-dark: #4b332d;
  --accent-soft: #ead8cb;
  --sage: #687767;
  --shadow-float: 0 24px 70px rgba(63, 45, 30, 0.10);
  --shadow-paper: 0 18px 48px rgba(63, 45, 30, 0.075);
  --focus: 0 0 0 4px rgba(121, 80, 68, 0.20);
  --font-ui: "Microsoft YaHei", "PingFang SC", sans-serif;
  --font-serif: "Noto Serif SC", "Songti SC", "STSong", serif;
  --font-kai: "LXGW WenKai", "霞鹜文楷", "KaiTi", serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background: radial-gradient(circle at 15% 12%, rgba(178, 138, 85, 0.12), transparent 28%),
    radial-gradient(circle at 88% 9%, rgba(104, 119, 103, 0.13), transparent 30%),
    linear-gradient(135deg, var(--bg), var(--bg-deep));
  font-family: var(--font-ui);
}

button, input, textarea, select { font: inherit; }
button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { box-shadow: var(--focus); }

.app-shell {
  min-height: 100vh;
  padding: 22px;
  display: grid;
  grid-template-columns: 258px minmax(680px, 1fr) 304px;
  gap: 16px;
}

.sidebar, .assistant-panel, .main-stage {
  min-height: 0;
  border: 1px solid var(--line);
  background: var(--surface);
  backdrop-filter: blur(24px);
  box-shadow: var(--shadow-float);
}
```

Continue the stylesheet by bringing over the reference classes for `.sidebar`, `.brand`, `.primary-action`, `.search-box`, `.nav-row`, `.book`, `.topbar`, `.workspace`, `.paper`, `.title-input`, `.quote-panel`, `.body-input`, `.mini-card`, `.overview`, `.related-card`, `.chip`, and responsive rules. Add project-specific classes `.theme-pill`, `.note-card`, `.preview-dialog`, `.danger`, `.empty-state`, and `.toast`.

- [ ] **Step 4: Open the shell in a browser**

Run:

```powershell
Start-Process (Resolve-Path .\index.html)
```

Expected: the page opens with the three-column shell and no console-blocking missing file errors except that behavior is not wired until Task 2.

## Task 2: Add Data Model, Storage, and Pure Logic Tests

**Files:**
- Create: `assets\app.js`
- Create: `tests\app.test.cjs`

- [ ] **Step 1: Write logic tests first**

Create `tests\app.test.cjs`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const { createInitialState, filterNotes, normalizeList, exportNoteMarkdown } = require("../assets/app.js");

test("createInitialState returns books, themes, notes, and active note", () => {
  const state = createInitialState();
  assert.ok(state.books.length >= 3);
  assert.ok(state.themes.length >= 4);
  assert.ok(state.notes.length >= 3);
  assert.equal(state.activeNoteId, state.notes[0].id);
});

test("normalizeList accepts Chinese and English commas", () => {
  assert.deepEqual(normalizeList("哲学，存在, 学习  ，"), ["哲学", "存在", "学习"]);
});

test("filterNotes matches by book and theme", () => {
  const state = createInitialState();
  const bookId = state.notes[0].bookId;
  const themeId = state.notes[0].themeIds[0];
  const result = filterNotes(state, { bookId, themeId, view: "all", query: "" });
  assert.ok(result.length >= 1);
  assert.ok(result.every(note => note.bookId === bookId));
  assert.ok(result.every(note => note.themeIds.includes(themeId)));
});

test("filterNotes searches title, quote, body, and tags", () => {
  const state = createInitialState();
  assert.ok(filterNotes(state, { view: "all", query: "意义网络" }).length >= 1);
  assert.ok(filterNotes(state, { view: "all", query: "概念澄清" }).length >= 1);
});

test("exportNoteMarkdown includes book, themes, quote, and body", () => {
  const state = createInitialState();
  const markdown = exportNoteMarkdown(state.notes[0], state);
  assert.match(markdown, /^# /);
  assert.match(markdown, /关联书籍/);
  assert.match(markdown, /主题/);
  assert.match(markdown, /> /);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: failure because `assets\app.js` does not export the tested functions yet.

- [ ] **Step 3: Implement app data helpers**

Create the top of `assets\app.js` with this CommonJS/browser-compatible wrapper:

```javascript
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ReadingNotesApp = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "reading-notes-v1";

  function normalizeList(value) {
    return String(value || "")
      .split(/[，,]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function createInitialState() {
    const books = [
      { id: "book-existence", title: "《存在与时间》", author: "马丁·海德格尔", category: "哲学", progress: 68 },
      { id: "book-naval", title: "《纳瓦尔宝典》", author: "埃里克·乔根森", category: "商业", progress: 41 },
      { id: "book-art", title: "《艺术的故事》", author: "贡布里希", category: "艺术史", progress: 27 },
      { id: "book-economics", title: "《经济学原理》", author: "曼昆", category: "经济学", progress: 53 }
    ];

    const themes = [
      { id: "theme-concept", name: "概念澄清", color: "#795044" },
      { id: "theme-learning", name: "学习方法", color: "#687767" },
      { id: "theme-writing", name: "写作", color: "#b28a55" },
      { id: "theme-self", name: "自我理解", color: "#6f667d" },
      { id: "theme-business", name: "判断力", color: "#8a6a4f" }
    ];

    const now = new Date().toISOString();
    const notes = [
      {
        id: "note-world",
        type: "随笔",
        title: "为什么“世界”不是物体的总和？",
        quote: "世界不是一个对象集合，而是此在总已经处身其中的意义关联。",
        body: "今天这一段最值得记录的是：作者并不是在讨论“世界里有什么东西”，而是在讨论我如何已经被抛入一个可理解、可使用、可关切的意义网络中。\n\n可以迁移到学习方法上：知识点也不是孤立条目。真正理解一个公式或概念，是知道它在什么问题中出现、解决什么矛盾、和哪些旧知识形成关联。",
        bookId: "book-existence",
        themeIds: ["theme-concept", "theme-learning"],
        page: "P.127 · 第三章",
        tags: ["概念澄清", "可复习", "待重读"],
        createdAt: now,
        updatedAt: now
      },
      {
        id: "note-compound",
        type: "感想",
        title: "复利不是速度，而是方向的一致性",
        quote: "选择长期游戏，和长期的人一起玩。",
        body: "这一句提醒我，长期主义并不只是把时间拉长，而是让每天的选择彼此不抵消。真正难的是识别那些会让自己反复回到原点的短期冲动。",
        bookId: "book-naval",
        themeIds: ["theme-business", "theme-self"],
        page: "财富章节",
        tags: ["长期主义", "判断力"],
        createdAt: now,
        updatedAt: now
      },
      {
        id: "note-art-eye",
        type: "摘录",
        title: "观看也是一种学习过的能力",
        quote: "没有艺术这回事，只有艺术家而已。",
        body: "这句话把宏大的艺术概念拆回到具体的人和具体的手艺。看画时可以少问一点“这是不是艺术”，多问一点“这个人解决了什么视觉问题”。",
        bookId: "book-art",
        themeIds: ["theme-learning", "theme-writing"],
        page: "导论",
        tags: ["艺术史", "观察"],
        createdAt: now,
        updatedAt: now
      }
    ];

    return {
      books,
      themes,
      notes,
      activeNoteId: notes[0].id,
      activeBookId: "",
      activeThemeId: "",
      activeView: "today",
      query: ""
    };
  }

  function findBook(state, bookId) {
    return state.books.find(book => book.id === bookId);
  }

  function findTheme(state, themeId) {
    return state.themes.find(theme => theme.id === themeId);
  }

  function matchesQuery(note, state, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return true;
    const book = findBook(state, note.bookId);
    const themeNames = note.themeIds.map(id => findTheme(state, id)?.name || "");
    const haystack = [
      note.title,
      note.quote,
      note.body,
      note.page,
      note.type,
      ...(note.tags || []),
      ...(themeNames || []),
      book?.title || "",
      book?.author || "",
      book?.category || ""
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  }

  function isToday(value) {
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function filterNotes(state, filters) {
    const view = filters.view || "all";
    return state.notes.filter(note => {
      if (filters.bookId && note.bookId !== filters.bookId) return false;
      if (filters.themeId && !note.themeIds.includes(filters.themeId)) return false;
      if (view === "quotes" && note.type !== "摘录") return false;
      if (view === "essays" && note.type === "摘录") return false;
      if (view === "today" && !isToday(note.updatedAt)) return false;
      return matchesQuery(note, state, filters.query);
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function exportNoteMarkdown(note, state) {
    const book = findBook(state, note.bookId);
    const themes = note.themeIds.map(id => findTheme(state, id)?.name).filter(Boolean).join("、");
    const tags = (note.tags || []).map(tag => `#${tag}`).join(" ");
    return [
      `# ${note.title || "未命名阅读记录"}`,
      "",
      `- 类型：${note.type}`,
      `- 关联书籍：${book ? book.title : "未关联"}`,
      `- 页码 / 章节：${note.page || "未填写"}`,
      `- 主题：${themes || "未填写"}`,
      `- 标签：${tags || "无"}`,
      "",
      "## 摘录",
      note.quote ? `> ${note.quote.replace(/\n/g, "\n> ")}` : "> ",
      "",
      "## 随笔",
      note.body || ""
    ].join("\n");
  }

  return {
    STORAGE_KEY,
    normalizeList,
    createInitialState,
    filterNotes,
    exportNoteMarkdown,
    findBook,
    findTheme
  };
});
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: all five tests pass.

## Task 3: Wire Rendering, Editing, and Auto-Save

**Files:**
- Modify: `assets\app.js`
- Modify: `assets\styles.css`

- [ ] **Step 1: Add persistence and DOM startup to `assets\app.js`**

Append browser-only code after the wrapper. It must:

- Read `localStorage` from `ReadingNotesApp.STORAGE_KEY`.
- Fall back to `ReadingNotesApp.createInitialState()`.
- Render nav buttons, books, themes, note list, editor fields, chips, and overview.
- Save after input changes with a short debounce.
- Create new notes with title `新的阅读记录`.

Implementation shape:

```javascript
if (typeof window !== "undefined" && window.document && window.ReadingNotesApp) {
  const logic = window.ReadingNotesApp;
  let state = loadState();
  let saveTimer = 0;

  function loadState() {
    try {
      const raw = localStorage.getItem(logic.STORAGE_KEY);
      return raw ? JSON.parse(raw) : logic.createInitialState();
    } catch (error) {
      localStorage.setItem(`${logic.STORAGE_KEY}-backup-${Date.now()}`, localStorage.getItem(logic.STORAGE_KEY) || "");
      return logic.createInitialState();
    }
  }

  function persistNow() {
    localStorage.setItem(logic.STORAGE_KEY, JSON.stringify(state));
    setText("saveStatus", `已保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
  }

  function scheduleSave() {
    setText("saveStatus", "保存中…");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistNow, 250);
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function activeNote() {
    return state.notes.find(note => note.id === state.activeNoteId) || state.notes[0];
  }

  function render() {
    renderViews();
    renderBooks();
    renderThemes();
    renderEditor();
    renderContext();
    persistNow();
  }

  document.addEventListener("DOMContentLoaded", render);
}
```

Fill in the render helpers in the same file. Keep helper names explicit: `renderViews`, `renderBooks`, `renderThemes`, `renderEditor`, `renderContext`, `updateActiveNoteFromEditor`, `createNote`, `deleteActiveNote`, `selectNote`, `insertIntoBody`, `downloadMarkdown`.

- [ ] **Step 2: Add editor input listeners**

Inside the browser startup block, connect:

```javascript
document.getElementById("noteTitle").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("noteQuote").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("noteBody").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("noteType").addEventListener("change", updateActiveNoteFromEditor);
document.getElementById("bookSelect").addEventListener("change", updateActiveNoteFromEditor);
document.getElementById("notePage").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("themeInput").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("tagInput").addEventListener("input", updateActiveNoteFromEditor);
document.getElementById("searchInput").addEventListener("input", event => {
  state.query = event.target.value;
  renderContext();
});
document.getElementById("newNoteButton").addEventListener("click", createNote);
document.getElementById("deleteButton").addEventListener("click", deleteActiveNote);
```

- [ ] **Step 3: Add missing CSS for rendered items**

Add selectors:

```css
.stack-section { margin-top: 20px; }
.theme-list { display: flex; flex-wrap: wrap; gap: 8px; }
.theme-pill { border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; background: rgba(255, 253, 247, .58); color: var(--ink-soft); cursor: pointer; }
.theme-pill.active { color: var(--accent-dark); background: var(--accent-soft); }
.note-card { border-radius: 17px; padding: 13px 14px; background: rgba(255, 253, 247, .56); border: 1px solid transparent; cursor: pointer; }
.note-card.active, .note-card:hover { background: var(--paper); border-color: var(--line); }
.quote-input { width: 100%; border: 0; resize: vertical; min-height: 112px; outline: none; }
.hint-text { margin: 0; color: var(--muted); font-family: var(--font-kai); font-size: 14px; line-height: 1.8; }
.danger { color: #7d382e; }
.empty-state { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
```

- [ ] **Step 4: Manual save check**

Open `index.html`, edit the title, refresh the page, and confirm the edited title remains visible.

## Task 4: Add Filtering, Related Notes, Preview, and Export

**Files:**
- Modify: `assets\app.js`
- Modify: `assets\styles.css`

- [ ] **Step 1: Implement navigation filters**

Use four views:

```javascript
const views = [
  { id: "today", icon: "◌", label: "今日书写" },
  { id: "all", icon: "✎", label: "全部随笔" },
  { id: "quotes", icon: "❝", label: "摘录卡片" },
  { id: "essays", icon: "⌘", label: "随笔与感想" }
];
```

Each view click sets `state.activeView`, clears active book/theme only when the user chooses a global view, then re-renders the list.

- [ ] **Step 2: Implement related note logic in the browser block**

For the active note, show up to three related notes where:

```javascript
const related = state.notes
  .filter(note => note.id !== current.id)
  .filter(note => note.bookId === current.bookId || note.themeIds.some(id => current.themeIds.includes(id)))
  .slice(0, 3);
```

Render each related note with title, type, book title, and first 52 characters of body.

- [ ] **Step 3: Implement preview dialog**

Connect preview buttons:

```javascript
document.getElementById("previewButton").addEventListener("click", () => {
  const note = activeNote();
  document.getElementById("previewContent").textContent = logic.exportNoteMarkdown(note, state);
  document.getElementById("previewDialog").showModal();
});
document.getElementById("closePreviewButton").addEventListener("click", () => {
  document.getElementById("previewDialog").close();
});
```

- [ ] **Step 4: Implement Markdown export**

Create a Blob download:

```javascript
function downloadMarkdown() {
  const note = activeNote();
  const blob = new Blob([logic.exportNoteMarkdown(note, state)], { type: "text/markdown;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${(note.title || "阅读记录").replace(/[\\/:*?"<>|]/g, "_")}.md`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

document.getElementById("exportButton").addEventListener("click", downloadMarkdown);
```

- [ ] **Step 5: Add preview dialog CSS**

Add:

```css
.preview-dialog { border: 0; padding: 0; background: transparent; }
.preview-dialog::backdrop { background: rgba(41, 35, 31, .34); backdrop-filter: blur(6px); }
.preview-card { width: min(760px, calc(100vw - 40px)); max-height: 82vh; overflow: auto; border-radius: 24px; background: var(--paper); border: 1px solid var(--line); box-shadow: var(--shadow-float); padding: 26px; }
.preview-card pre { margin: 0; white-space: pre-wrap; color: var(--ink-soft); font-family: var(--font-kai); font-size: 16px; line-height: 1.9; }
.dialog-close { float: right; width: 34px; height: 34px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255, 253, 247, .8); color: var(--ink-soft); cursor: pointer; }
```

- [ ] **Step 6: Re-run tests**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: all tests pass.

## Task 5: Browser Verification and Polish

**Files:**
- Modify: `assets\styles.css`
- Modify: `assets\app.js`
- Optional modify: `index.html`

- [ ] **Step 1: Serve the static files locally**

Run:

```powershell
python -m http.server 4173
```

Expected: the site is available at `http://localhost:4173`.

- [ ] **Step 2: Verify desktop layout**

Open `http://localhost:4173` in the browser. Check:

- Left sidebar shows nav, books, and themes.
- Middle writing paper is the visual focus.
- Right panel shows stats, current list, and related notes.
- No major text overlaps at a desktop width.

- [ ] **Step 3: Verify core flows**

In the browser:

- Create a new record.
- Add a title, quote, body, page, themes, and tags.
- Refresh and confirm the record persists.
- Click a book and confirm the note list filters.
- Click a theme and confirm the note list filters.
- Search a phrase from the body and confirm it appears.
- Preview Markdown and confirm it contains the edited content.

- [ ] **Step 4: Verify responsive fallback**

Resize to about 900px wide. Expected:

- Right panel hides.
- Left sidebar and main writing panel remain usable.
- Inspector stacks below or beside the paper without overlap.

Resize to about 760px wide. Expected:

- Sidebar hides.
- Main writing panel remains readable.
- Topbar actions wrap without covering the title.

- [ ] **Step 5: Final cleanup**

Run:

```powershell
node --test .\tests\app.test.cjs
```

Expected: all tests pass.

If the local server was started only for verification, stop it before finishing.

## Self-Review

- Spec coverage: The plan covers the reference three-column UI, local creation/edit/save, books and themes, record types, search, related records, Markdown export, desktop-first layout, and responsive fallback.
- Placeholder scan: No unfinished placeholder markers remain. Task 3 names exact helper functions and required behavior for the browser app.
- Type consistency: `bookId`, `themeIds`, `activeNoteId`, `activeBookId`, `activeThemeId`, `activeView`, `query`, and the exported helper names are consistent across tests and implementation tasks.
