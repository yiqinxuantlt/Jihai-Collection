# Editor Backend Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile hand-written rich-text editor with a Tiptap editor and add a local Express + SQLite backend for durable reading-note data.

**Architecture:** Keep the existing vanilla app files as migration references while adding a new Vite + React frontend and a local Express API. The backend uses Node's built-in `node:sqlite` module, seeds from the existing app helpers, exposes `/api/*`, and stores books, notes, themes, tags, and Tiptap JSON documents in SQLite. The React UI preserves the quiet three-column knowledge-workbench feel and talks only to the API.

**Tech Stack:** Vite, React, Tiptap/ProseMirror, Express, Node built-in SQLite, Node `node:test`.

---

### Task 1: Project Runtime

**Files:**
- Create: `package.json`
- Create: `vite.config.mjs`
- Modify: `index.html`
- Modify: `.gitignore`

- [ ] Add npm scripts for `dev`, `server`, `client`, `build`, `preview`, and `test`.
- [ ] Add dependencies: React, Vite, Express, Tiptap editor packages.
- [ ] Point `index.html` at `/src/main.jsx`.
- [ ] Ignore `node_modules`, `dist`, and the SQLite data directory.
- [ ] Run `npm install`.
- [ ] Commit the runtime scaffold.

### Task 2: Backend Data Layer

**Files:**
- Create: `server/db.cjs`
- Create: `server/legacy.cjs`
- Create: `server/markdown.cjs`

- [ ] Create the SQLite schema for books, notes, themes, note themes, tags, note tags, and settings.
- [ ] Seed the database from `assets/app.js` when empty.
- [ ] Add helpers to convert legacy HTML/text content into simple Tiptap JSON documents.
- [ ] Add helpers to serialize database rows into API objects.
- [ ] Add Markdown export from Tiptap JSON and note metadata.
- [ ] Add focused backend data tests.
- [ ] Commit the data layer.

### Task 3: Backend API

**Files:**
- Create: `server/app.cjs`
- Create: `server/index.cjs`
- Create: `tests/server.test.cjs`

- [ ] Implement `/api/health`.
- [ ] Implement `/api/bootstrap`.
- [ ] Implement books CRUD.
- [ ] Implement notes CRUD and autosave patching.
- [ ] Implement legacy localStorage import and JSON backup export.
- [ ] Implement single-note Markdown export.
- [ ] Add API tests with a temporary SQLite database.
- [ ] Commit the API.

### Task 4: React Workbench Shell

**Files:**
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/api.js`
- Create: `src/styles.css`
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/Workbench.jsx`
- Create: `src/components/MetadataPanel.jsx`

- [ ] Load data from `/api/bootstrap`.
- [ ] Render shelf, notes, favorites, tags, and timeline sections.
- [ ] Preserve the desktop three-column workbench layout.
- [ ] Add localStorage import prompt when old data exists.
- [ ] Commit the shell.

### Task 5: Tiptap Editor

**Files:**
- Create: `src/components/RichEditor.jsx`
- Create: `src/components/EditorToolbar.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Configure Tiptap with StarterKit, Underline, Link, Image, Table, Placeholder, and CharacterCount.
- [ ] Add reliable toolbar buttons for headings, inline formatting, lists, quote, links, images, table, code, undo/redo, and clear format.
- [ ] Save `quoteDoc` and `bodyDoc` through debounced API patches.
- [ ] Show active/disabled toolbar states and save status.
- [ ] Commit the editor.

### Task 6: Verification And Docs

**Files:**
- Modify: `README.md`
- Modify: `tests/app.test.cjs` if legacy helper expectations need compatibility updates.

- [ ] Run the full Node test suite.
- [ ] Run `npm run build`.
- [ ] Start the local app and smoke test editor toolbar actions in the browser.
- [ ] Update README with new run/test commands and migration notes.
- [ ] Commit docs and verification changes.

### Task 7: Integration Review

**Files:**
- Review all changed files.

- [ ] Check git diff for accidental unrelated changes.
- [ ] Verify the old static app files are either still usable as legacy references or clearly superseded.
- [ ] Run final tests and build.
- [ ] Start the app for the user and provide the local URL.
- [ ] Commit final integration fixes if needed.
