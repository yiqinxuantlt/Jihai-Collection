const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { getLegacyDataset, getNoteDocs, slugForTag, legacy, emptyDoc } = require("./legacy.cjs");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "reading-notes.sqlite");

function ensureParent(filePath) {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
}

function openDatabase(filePath = DEFAULT_DB_PATH, options = {}) {
  ensureParent(filePath);
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  initializeSchema(db);
  if (options.seed !== false) {
    seedIfEmpty(db);
  }
  return db;
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      authors_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'reading',
      cover_color TEXT NOT NULL DEFAULT '#687767',
      cover_image TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#687767',
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'essay',
      title TEXT NOT NULL,
      book_id TEXT,
      quote_doc_json TEXT NOT NULL,
      body_doc_json TEXT NOT NULL,
      quote_text TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      legacy_quote_html TEXT NOT NULL DEFAULT '',
      legacy_body_html TEXT NOT NULL DEFAULT '',
      page TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0,
      sort_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS note_themes (
      note_id TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      PRIMARY KEY (note_id, theme_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(name);
  `);
}

function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;
  if (count > 0) return;
  replaceAllData(db, getLegacyDataset());
}

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function runTransaction(db, fn) {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function clearData(db) {
  db.exec(`
    DELETE FROM note_tags;
    DELETE FROM note_themes;
    DELETE FROM notes;
    DELETE FROM tags;
    DELETE FROM themes;
    DELETE FROM books;
  `);
}

function hasUserData(db) {
  const books = db.prepare("SELECT COUNT(*) AS count FROM books").get().count;
  const notes = db.prepare("SELECT COUNT(*) AS count FROM notes").get().count;
  return books > 0 || notes > 0;
}

function replaceAllData(db, input) {
  const dataset = getLegacyDataset(input);
  runTransaction(db, () => {
    clearData(db);
    const insertBook = db.prepare(`
      INSERT INTO books (id, title, author, authors_json, status, cover_color, cover_image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTheme = db.prepare(`
      INSERT INTO themes (id, name, color, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertTag = db.prepare(`
      INSERT INTO tags (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, type, title, book_id, quote_doc_json, body_doc_json, quote_text, body_text,
        legacy_quote_html, legacy_body_html, page, favorite, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNoteTheme = db.prepare("INSERT OR IGNORE INTO note_themes (note_id, theme_id) VALUES (?, ?)");
    const insertNoteTag = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");

    dataset.books.forEach((book) => {
      insertBook.run(
        String(book.id),
        String(book.title || "未命名书籍"),
        String(book.author || ""),
        JSON.stringify(book.authors || (book.author ? [book.author] : [])),
        String(book.status || "reading"),
        String(book.coverColor || book.cover_color || "#687767"),
        String(book.coverImage || book.cover_image || ""),
        String(book.createdAt || book.created_at || nowIso()),
        String(book.updatedAt || book.updated_at || book.createdAt || nowIso()),
      );
    });

    dataset.themes.forEach((theme) => {
      insertTheme.run(
        String(theme.id),
        String(theme.name || "未命名主题"),
        String(theme.color || "#687767"),
        String(theme.source || "manual"),
        String(theme.createdAt || nowIso()),
        String(theme.updatedAt || theme.createdAt || nowIso()),
      );
    });

    const knownTags = new Map();
    dataset.notes.forEach((note) => {
      legacy.getNoteTags(note).forEach((name) => {
        if (!knownTags.has(name)) {
          knownTags.set(name, {
            id: slugForTag(name),
            name,
            createdAt: legacy.getNoteCreatedAt(note) || nowIso(),
            updatedAt: legacy.getNoteUpdatedAt(note) || legacy.getNoteCreatedAt(note) || nowIso(),
          });
        }
      });
    });
    knownTags.forEach((tag) => insertTag.run(tag.id, tag.name, tag.createdAt, tag.updatedAt));

    dataset.notes.forEach((note) => {
      const docs = getNoteDocs(note);
      const createdAt = legacy.getNoteCreatedAt(note) || nowIso();
      const updatedAt = legacy.getNoteUpdatedAt(note) || createdAt;
      insertNote.run(
        String(note.id),
        legacy.getNoteType(note),
        legacy.getNoteTitle(note),
        legacy.getNoteBookId(note) || null,
        JSON.stringify(docs.quoteDoc),
        JSON.stringify(docs.bodyDoc),
        docs.quoteText,
        docs.bodyText,
        docs.quoteHtml,
        docs.bodyHtml,
        legacy.getNotePage(note),
        legacy.getNoteFavorite(note) ? 1 : 0,
        createdAt,
        updatedAt,
      );

      legacy.getNoteThemeIds(note).forEach((themeId) => insertNoteTheme.run(String(note.id), themeId));
      legacy.getNoteTags(note).forEach((name) => {
        const tag = knownTags.get(name);
        if (tag) insertNoteTag.run(String(note.id), tag.id);
      });
    });
  });
}

function rowsToMap(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function getBooks(db) {
  return db.prepare("SELECT * FROM books ORDER BY updated_at DESC, title ASC").all().map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    authors: parseJson(row.authors_json, row.author ? [row.author] : []),
    status: row.status,
    coverColor: row.cover_color,
    coverImage: row.cover_image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getThemes(db) {
  return db.prepare("SELECT * FROM themes ORDER BY name ASC").all().map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getTags(db) {
  return db.prepare("SELECT * FROM tags ORDER BY name ASC").all().map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getNotes(db) {
  const rows = db.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all();
  const themeRows = db.prepare("SELECT note_id, theme_id FROM note_themes").all();
  const tagRows = db.prepare(`
    SELECT note_tags.note_id, tags.id, tags.name
    FROM note_tags
    JOIN tags ON tags.id = note_tags.tag_id
  `).all();
  const noteThemes = new Map();
  const noteTags = new Map();
  themeRows.forEach((row) => {
    if (!noteThemes.has(row.note_id)) noteThemes.set(row.note_id, []);
    noteThemes.get(row.note_id).push(row.theme_id);
  });
  tagRows.forEach((row) => {
    if (!noteTags.has(row.note_id)) noteTags.set(row.note_id, []);
    noteTags.get(row.note_id).push(row.name);
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    bookId: row.book_id || "",
    quoteDoc: parseJson(row.quote_doc_json, emptyDoc()),
    bodyDoc: parseJson(row.body_doc_json, emptyDoc()),
    quoteText: row.quote_text,
    bodyText: row.body_text,
    page: row.page,
    favorite: Boolean(row.favorite),
    themeIds: noteThemes.get(row.id) || [],
    tags: noteTags.get(row.id) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getBootstrap(db) {
  const books = getBooks(db);
  const themes = getThemes(db);
  const tags = getTags(db);
  const notes = getNotes(db);
  return { books, themes, tags, notes };
}

function contextMaps(data) {
  return {
    booksById: rowsToMap(data.books),
    themesById: rowsToMap(data.themes),
  };
}

module.exports = {
  DEFAULT_DB_PATH,
  openDatabase,
  initializeSchema,
  replaceAllData,
  hasUserData,
  getBootstrap,
  getBooks,
  getThemes,
  getTags,
  getNotes,
  contextMaps,
  nowIso,
};
