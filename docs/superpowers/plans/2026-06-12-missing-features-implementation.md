# Missing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the missing local knowledge-workbench features: book management, favorites, timeline, tag details, full data import/export, and stronger search/sort filters.

**Architecture:** Keep the existing vanilla JavaScript DOM-builder architecture. Add compatible data helpers and tests first, then wire them into the current three-column workbench without introducing a framework or build system.

**Tech Stack:** Static HTML, CSS, JavaScript, browser `localStorage`, Node built-in test runner.

---

## File Structure

- Modify `assets/app.js`: add compatible data helpers, favorite metadata, timeline grouping, tag matching, book create/edit/delete helpers, import/export actions, and workbench UI controls.
- Modify `assets/workbench.css`: add restrained styles for dialogs, compact form rows, favorite buttons, timeline groups, tag detail panels, data actions, and enhanced filters.
- Modify `index.html`: add one reusable dialog container and hidden file input for book/data import flows if needed.
- Modify `tests/app.test.cjs`: add tests for migration defaults, favorite filtering, timeline grouping, tag matching, and import normalization.
- Modify `README.md`: update available features and verified flows after implementation.

## Task 1: Data Helpers And Tests

**Files:**
- Modify: `assets/app.js`
- Modify: `tests/app.test.cjs`

- [ ] **Step 1: Write tests for the missing data behavior**

Add tests that import these helpers from `assets/app.js`:

```js
getNoteFavorite,
setNoteFavorite,
filterFavoriteNotes,
groupNotesByLocalDate,
noteMatchesTag,
normalizeImportedState,
```

Test expectations:

```js
const state = createInitialState();
setNoteFavorite(state.notes[0], true);
assert.equal(getNoteFavorite(state.notes[0]), true);
assert.deepEqual(filterFavoriteNotes(state).map((note) => note.id), [state.notes[0].id]);
assert.equal(groupNotesByLocalDate(state.notes)[0].date, "2026-06-10");
assert.equal(noteMatchesTag(state.notes[0], { kind: "theme", id: "theme-method", name: "阅读方法" }), true);
assert.equal(noteMatchesTag(state.notes[0], { kind: "tag", id: "主动阅读", name: "主动阅读" }), true);
assert.equal(normalizeImportedState(JSON.stringify(state)).schemaVersion, 2);
```

- [ ] **Step 2: Run tests to confirm new helpers are missing**

Run:

```bash
node tests/app.test.cjs
```

Expected result: tests fail because the new helpers are not exported yet.

- [ ] **Step 3: Implement the helpers**

Add helper functions near existing note getters:

```js
function getNoteFavorite(note) {
  return Boolean(note && (note.favorite || note.metadata && note.metadata.favorite));
}

function setNoteFavorite(note, value) {
  if (!note || typeof note !== "object") return note;
  note.metadata = note.metadata && typeof note.metadata === "object" ? note.metadata : {};
  note.metadata.favorite = Boolean(value);
  note.favorite = note.metadata.favorite;
  return note;
}

function filterFavoriteNotes(source, query) {
  var state = Array.isArray(source) ? { notes: source, books: [], themes: [] } : source;
  return getNotes(state).filter(function (note) {
    return getNoteFavorite(note) && noteMatchesQuery(note, state, query || "");
  });
}

function groupNotesByLocalDate(notes) {
  var groups = Object.create(null);
  normalizeList(notes).forEach(function (note) {
    var key = getLocalDateKey(getNoteUpdatedAt(note) || getNoteCreatedAt(note));
    if (!key) key = "未知日期";
    groups[key] = groups[key] || [];
    groups[key].push(note);
  });
  return Object.keys(groups).sort().reverse().map(function (date) {
    return { date: date, notes: groups[date].sort(function (a, b) {
      return new Date(getNoteUpdatedAt(b)).getTime() - new Date(getNoteUpdatedAt(a)).getTime();
    }) };
  });
}

function noteMatchesTag(note, tag) {
  if (!tag) return true;
  if (tag.kind === "theme") {
    return getNoteThemeIds(note).indexOf(String(tag.id)) !== -1;
  }
  return getNoteTags(note).some(function (name) {
    return name === tag.name || name === tag.id;
  });
}

function normalizeImportedState(input) {
  var parsed = typeof input === "string" ? JSON.parse(input) : input;
  var normalized = migrateState(parsed);
  if (!normalized || !Array.isArray(normalized.books) || !Array.isArray(normalized.notes)) {
    throw new Error("Invalid reading notes data");
  }
  return normalized;
}
```

Update `normalizeBook`, `normalizeNote`, and `syncNoteAliases` so new/old data always carries `createdAt`, `updatedAt`, and favorite aliases.

- [ ] **Step 4: Export the helpers**

Add the helper names to the returned API object at the bottom of `assets/app.js`.

- [ ] **Step 5: Run checks**

Run:

```bash
node --check assets/app.js
node tests/app.test.cjs
```

Expected result: syntax check passes and all tests pass.

## Task 2: Workbench State And Navigation

**Files:**
- Modify: `assets/app.js`

- [ ] **Step 1: Add workspace sections and filters**

Update `WORKBENCH_SECTIONS` to include:

```js
{ id: "favorites", label: "收藏", meta: "重要摘录与随笔" }
```

Add runtime defaults in state normalization:

```js
state.selectedTag = state.selectedTag || null;
state.sortMode = state.sortMode || "updated-desc";
state.noteTypeFilter = state.noteTypeFilter || "all";
```

- [ ] **Step 2: Route section changes cleanly**

When a user clicks sidebar items, clear `selectedTag` except when already in tag detail. Reset `noteTypeFilter` to `all` for shelf and tags. Preserve `query` so search feels global.

- [ ] **Step 3: Add filter helpers**

Add local UI helpers in the browser-only closure:

```js
function noteTypeFilterMatch(note) {
  return state.noteTypeFilter === "all" || logic.getNoteType(note) === state.noteTypeFilter;
}

function sortNotesForWorkbench(notes) {
  var sorted = notes.slice();
  if (state.sortMode === "created-asc") {
    return sorted.sort(function (a, b) { return new Date(logic.getNoteCreatedAt(a)) - new Date(logic.getNoteCreatedAt(b)); });
  }
  if (state.sortMode === "title") {
    return sorted.sort(function (a, b) { return logic.getNoteTitle(a).localeCompare(logic.getNoteTitle(b), "zh-CN"); });
  }
  return sorted.sort(function (a, b) { return new Date(logic.getNoteUpdatedAt(b)) - new Date(logic.getNoteUpdatedAt(a)); });
}
```

Add a similar `sortBooksForWorkbench` for updated time, title, and note count.

## Task 3: Book Management UI

**Files:**
- Modify: `assets/app.js`
- Modify: `assets/workbench.css`
- Modify: `index.html`

- [ ] **Step 1: Add reusable dialog markup**

Add a dialog after the preview dialog:

```html
<dialog class="form-dialog" id="formDialog">
  <form class="form-card" id="formDialogCard" method="dialog"></form>
</dialog>
<input class="visually-hidden" id="dataImportInput" type="file" accept="application/json" />
```

- [ ] **Step 2: Implement book actions**

Add browser helpers:

```js
function createBook(values) { ... }
function updateBook(bookId, values) { ... }
function deleteBook(bookId) { ... }
function showBookDialog(book) { ... }
```

Use generated ids like `book-` + `Date.now().toString(36)`. `deleteBook` must refuse deletion when `bookNotes(book).length > 0`.

- [ ] **Step 3: Wire book controls**

Add “新建书籍” to the workbench toolbar. Add “编辑书籍” and safe delete action in the right detail panel. Keep cover import available from the existing cover control.

- [ ] **Step 4: Style book forms**

Add compact dialog/form styles with white cards, thin borders, restrained focus rings, and 32-40px controls.

## Task 4: Favorites, Tag Detail, And Timeline

**Files:**
- Modify: `assets/app.js`
- Modify: `assets/workbench.css`

- [ ] **Step 1: Add favorite toggles**

Add favorite buttons to record cards, selected note detail, and editor topbar. Toggle `metadata.favorite`, touch the note, save, and render.

- [ ] **Step 2: Add favorites section behavior**

`notesForWorkbenchSection("favorites")` returns favorite notes filtered by search and type.

- [ ] **Step 3: Add tag detail behavior**

Clicking a tag card sets:

```js
state.workspaceSection = "tag-detail";
state.selectedTag = { kind: tag.kind === "主题" ? "theme" : "tag", id: tag.id, name: tag.name };
```

Render matching notes and related books. Add right-side tag summary.

- [ ] **Step 4: Add timeline groups**

For `recent`, render grouped date sections using `groupNotesByLocalDate`. Keep record cards reusable inside each group.

- [ ] **Step 5: Add empty states**

Favorites empty state: “还没有收藏”。 Tag detail empty state: “这个标签下暂无记录”。 Timeline empty state: “还没有可展示的记录”。

## Task 5: Full Data Import And Export

**Files:**
- Modify: `assets/app.js`
- Modify: `assets/workbench.css`

- [ ] **Step 1: Add export action**

Add a data action in the sidebar footer or detail panel:

```js
function downloadAllData() {
  var blob = new Blob([JSON.stringify(logic.serializeState(state), null, 2)], { type: "application/json" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "modu-notes-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
}
```

- [ ] **Step 2: Add import action**

Read selected JSON with `FileReader`, pass it into `logic.normalizeImportedState`, assign `state`, persist, render, and show success toast. On any error, keep existing state and show failure toast.

- [ ] **Step 3: Add visible backup controls**

Add “导出备份” and “导入备份” buttons in a quiet sidebar footer or data panel. Include short helper text in muted style.

## Task 6: Enhanced Search, Sort, And README

**Files:**
- Modify: `assets/app.js`
- Modify: `assets/workbench.css`
- Modify: `README.md`

- [ ] **Step 1: Add clear search button**

Search field should show a clear button when `state.query` is not empty. Clicking it clears `state.query`, updates the input, and re-renders results.

- [ ] **Step 2: Add sort and type controls**

Add compact selects or segmented buttons for sort and note type. Use existing button styles where possible.

- [ ] **Step 3: Update README**

Move implemented items from “缺失” into “可用功能” and update the verified flow list after browser testing.

## Task 7: Verification And Commit

**Files:**
- Modify: all touched files

- [ ] **Step 1: Run automated checks**

Run:

```bash
node --check assets/app.js
node tests/app.test.cjs
```

Expected result: both pass.

- [ ] **Step 2: Browser smoke test**

Use the local preview page to verify:

- Create a book.
- Edit its status.
- Favorite and unfavorite a note.
- View the favorites section.
- Open a tag detail view.
- View grouped timeline.
- Export JSON backup.
- Attempt invalid JSON import and confirm current data stays intact.

- [ ] **Step 3: Commit**

Run:

```bash
git add index.html assets/app.js assets/workbench.css tests/app.test.cjs README.md docs/superpowers/plans/2026-06-12-missing-features-implementation.md
git commit -m "feat: complete reading workbench management features"
```

Expected result: one focused implementation commit after the plan commit.
