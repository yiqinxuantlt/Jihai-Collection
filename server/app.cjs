const express = require("express");
const crypto = require("node:crypto");
const {
  openDatabase,
  getBootstrap,
  getBooks,
  getThemes,
  getTags,
  getNotes,
  replaceAllData,
  hasUserData,
  contextMaps,
  nowIso,
} = require("./db.cjs");
const { emptyDoc, slugForTag, textToDoc } = require("./legacy.cjs");
const { recordMarkdown } = require("./markdown.cjs");

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function docText(node) {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(docText).filter(Boolean).join("\n");
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  return docText(node.content || []);
}

function parseDoc(value) {
  if (!value) return emptyDoc();
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return textToDoc(value);
    }
  }
  return value;
}

function noteById(db, noteId) {
  return getNotes(db).find((note) => note.id === noteId) || null;
}

function setNoteThemes(db, noteId, themeIds) {
  db.prepare("DELETE FROM note_themes WHERE note_id = ?").run(noteId);
  const insert = db.prepare("INSERT OR IGNORE INTO note_themes (note_id, theme_id) VALUES (?, ?)");
  (themeIds || []).filter(Boolean).forEach((themeId) => insert.run(noteId, themeId));
}

function ensureTags(db, names) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  return (names || []).map((name) => String(name || "").trim()).filter(Boolean).map((name) => {
    const tagId = slugForTag(name);
    const now = nowIso();
    insert.run(tagId, name, now, now);
    return tagId;
  });
}

function setNoteTags(db, noteId, names) {
  db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(noteId);
  const tagIds = ensureTags(db, names);
  const insert = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");
  tagIds.forEach((tagId) => insert.run(noteId, tagId));
}

function createApp(options = {}) {
  const db = options.db || openDatabase(options.dbPath);
  const app = express();
  app.locals.db = db;
  app.use(express.json({ limit: "12mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, storage: "sqlite" });
  });

  app.get("/api/bootstrap", (req, res) => {
    res.json(getBootstrap(db));
  });

  app.get("/api/books", (req, res) => {
    res.json({ books: getBooks(db) });
  });

  app.post("/api/books", (req, res) => {
    const now = nowIso();
    const book = {
      id: id("book"),
      title: String(req.body.title || "未命名书籍").trim(),
      author: String(req.body.author || "").trim(),
      status: String(req.body.status || "reading"),
      coverColor: String(req.body.coverColor || "#687767"),
      coverImage: String(req.body.coverImage || "assets/covers/book-slow-reading.png"),
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(`
      INSERT INTO books (id, title, author, authors_json, status, cover_color, cover_image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(book.id, book.title, book.author, JSON.stringify(book.author ? [book.author] : []), book.status, book.coverColor, book.coverImage, now, now);
    res.status(201).json({ book });
  });

  app.patch("/api/books/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Book not found" });
    const next = {
      title: req.body.title == null ? existing.title : String(req.body.title),
      author: req.body.author == null ? existing.author : String(req.body.author),
      status: req.body.status == null ? existing.status : String(req.body.status),
      coverColor: req.body.coverColor == null ? existing.cover_color : String(req.body.coverColor),
      coverImage: req.body.coverImage == null ? existing.cover_image : String(req.body.coverImage),
      updatedAt: nowIso(),
    };
    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, status = ?, cover_color = ?, cover_image = ?, updated_at = ?
      WHERE id = ?
    `).run(next.title, next.author, next.status, next.coverColor, next.coverImage, next.updatedAt, req.params.id);
    res.json({ book: getBooks(db).find((book) => book.id === req.params.id) });
  });

  app.delete("/api/books/:id", (req, res) => {
    const noteCount = db.prepare("SELECT COUNT(*) AS count FROM notes WHERE book_id = ?").get(req.params.id).count;
    if (noteCount > 0) return res.status(409).json({ error: "Book has linked notes" });
    db.prepare("DELETE FROM books WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  app.get("/api/notes", (req, res) => {
    res.json({ notes: getNotes(db) });
  });

  app.post("/api/notes", (req, res) => {
    const now = nowIso();
    const quoteDoc = parseDoc(req.body.quoteDoc);
    const bodyDoc = parseDoc(req.body.bodyDoc);
    const note = {
      id: id("note"),
      type: String(req.body.type || "essay"),
      title: String(req.body.title || "新的阅读记录"),
      bookId: String(req.body.bookId || ""),
      quoteDoc,
      bodyDoc,
      quoteText: docText(quoteDoc),
      bodyText: docText(bodyDoc),
      page: String(req.body.page || ""),
      favorite: Boolean(req.body.favorite),
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(`
      INSERT INTO notes (
        id, type, title, book_id, quote_doc_json, body_doc_json, quote_text, body_text,
        legacy_quote_html, legacy_body_html, page, favorite, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?)
    `).run(
      note.id,
      note.type,
      note.title,
      note.bookId || null,
      JSON.stringify(note.quoteDoc),
      JSON.stringify(note.bodyDoc),
      note.quoteText,
      note.bodyText,
      note.page,
      note.favorite ? 1 : 0,
      now,
      now,
    );
    setNoteThemes(db, note.id, req.body.themeIds || []);
    setNoteTags(db, note.id, req.body.tags || []);
    res.status(201).json({ note: noteById(db, note.id) });
  });

  app.patch("/api/notes/:id", (req, res) => {
    const current = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
    if (!current) return res.status(404).json({ error: "Note not found" });

    const quoteDoc = req.body.quoteDoc === undefined ? JSON.parse(current.quote_doc_json) : parseDoc(req.body.quoteDoc);
    const bodyDoc = req.body.bodyDoc === undefined ? JSON.parse(current.body_doc_json) : parseDoc(req.body.bodyDoc);
    const updatedAt = nowIso();
    db.prepare(`
      UPDATE notes
      SET type = ?, title = ?, book_id = ?, quote_doc_json = ?, body_doc_json = ?,
          quote_text = ?, body_text = ?, page = ?, favorite = ?, updated_at = ?
      WHERE id = ?
    `).run(
      req.body.type == null ? current.type : String(req.body.type),
      req.body.title == null ? current.title : String(req.body.title),
      req.body.bookId == null ? current.book_id : String(req.body.bookId || "") || null,
      JSON.stringify(quoteDoc),
      JSON.stringify(bodyDoc),
      docText(quoteDoc),
      docText(bodyDoc),
      req.body.page == null ? current.page : String(req.body.page),
      req.body.favorite == null ? current.favorite : (req.body.favorite ? 1 : 0),
      updatedAt,
      req.params.id,
    );
    if (Array.isArray(req.body.themeIds)) setNoteThemes(db, req.params.id, req.body.themeIds);
    if (Array.isArray(req.body.tags)) setNoteTags(db, req.params.id, req.body.tags);
    res.json({ note: noteById(db, req.params.id) });
  });

  app.delete("/api/notes/:id", (req, res) => {
    db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  app.get("/api/tags", (req, res) => {
    res.json({ tags: getTags(db), themes: getThemes(db) });
  });

  app.post("/api/import/local-storage", (req, res) => {
    try {
      if (hasUserData(db) && req.body.replace !== true) {
        return res.status(409).json({ error: "Database already has data", requiresReplace: true });
      }
      replaceAllData(db, req.body.data || req.body);
      res.json({ ok: true, ...getBootstrap(db) });
    } catch (error) {
      res.status(400).json({ error: "Import failed", detail: error.message });
    }
  });

  app.get("/api/export", (req, res) => {
    res.json({ schemaVersion: 3, exportedAt: nowIso(), data: getBootstrap(db) });
  });

  app.get("/api/notes/:id/export.md", (req, res) => {
    const data = getBootstrap(db);
    const note = data.notes.find((item) => item.id === req.params.id);
    if (!note) return res.status(404).send("Note not found");
    res.type("text/markdown; charset=utf-8").send(recordMarkdown(note, contextMaps(data)));
  });

  return app;
}

module.exports = {
  createApp,
  docText,
};
