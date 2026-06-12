const test = require("node:test");
const assert = require("node:assert/strict");

const {
  STORAGE_KEY,
  normalizeList,
  createInitialState,
  filterNotes,
  exportNoteMarkdown,
  findBook,
  findTheme,
  getBookNotes,
  migrateState,
  getNoteTitle,
  getNoteType,
  getNoteBookId,
  getNoteThemeIds,
  getNotePage,
  getNoteTags,
  getNoteFavorite,
  getNoteHtml,
  getNoteText,
  setNoteHtml,
  setNoteFavorite,
  getNoteWordCount,
  getNoteSummaryText,
  filterFavoriteNotes,
  groupNotesByLocalDate,
  noteMatchesTag,
  normalizeImportedState,
  textToHtml,
  stripHtml,
  richTextToMarkdown,
} = require("../assets/app.js");

test("migrateState converts flat v1 state to schemaVersion 2 and keeps records", () => {
  const v1State = {
    schemaVersion: 1,
    books: [{ id: "book-a", title: "Book A", author: "Author A" }],
    themes: [{ id: "theme-a", name: "Theme A", color: "#123456" }],
    notes: [
      {
        id: "note-a",
        type: "quote",
        title: "Note A",
        quote: "Quote A",
        body: "Body A",
        bookId: "book-a",
        themeIds: ["theme-a"],
        page: "p. 12",
        tags: ["tag-a"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ],
    activeView: "book",
    activeBookId: "book-a",
    activeNoteId: "note-a",
    bookFilter: "quote",
    query: "focus",
  };

  const migrated = migrateState(v1State);

  assert.equal(migrated.schemaVersion, 2);
  assert.strictEqual(migrated.books, migrated.data.books);
  assert.strictEqual(migrated.themes, migrated.data.themes);
  assert.strictEqual(migrated.notes, migrated.data.notes);
  assert.deepEqual(
    migrated.books.map((book) => ({ id: book.id, title: book.title })),
    [{ id: "book-a", title: "Book A" }],
  );
  assert.deepEqual(
    migrated.themes.map((theme) => ({ id: theme.id, name: theme.name })),
    [{ id: "theme-a", name: "Theme A" }],
  );
  assert.equal(migrated.notes.length, 1);
  assert.equal(getNoteTitle(migrated.notes[0]), "Note A");
  assert.equal(getNoteBookId(migrated.notes[0]), "book-a");
  assert.deepEqual(getNoteThemeIds(migrated.notes[0]), ["theme-a"]);
  assert.equal(getNoteText(migrated.notes[0], "quote"), "Quote A");
  assert.equal(getNoteText(migrated.notes[0], "body"), "Body A");
  assert.equal(migrated.ui.activeView, "book");
  assert.equal(migrated.activeBookId, "book-a");
  assert.equal(migrated.activeNoteId, "note-a");
  assert.equal(migrated.bookFilter, "quote");
  assert.equal(migrated.query, "focus");
});

test("migrateState preserves legacy plain and html note content verbatim", () => {
  const quote = "Legacy quote <plain>";
  const body = "Legacy body\nsecond line";
  const quoteHtml = "<blockquote><strong>HTML quote</strong></blockquote>";
  const bodyHtml = "<p><em>HTML body</em></p>";

  const migrated = migrateState({
    books: [],
    themes: [],
    notes: [
      {
        id: "note-content",
        title: "Content",
        quote,
        body,
        quoteHtml,
        bodyHtml,
      },
    ],
  });
  const note = migrated.notes[0];

  assert.equal(note.quote, quote);
  assert.equal(note.body, body);
  assert.equal(note.quoteHtml, quoteHtml);
  assert.equal(note.bodyHtml, bodyHtml);
  assert.equal(getNoteText(note, "quote"), quote);
  assert.equal(getNoteText(note, "body"), body);
  assert.equal(getNoteHtml(note, "quote"), quoteHtml);
  assert.equal(getNoteHtml(note, "body"), bodyHtml);
});

test("migrateState preserves custom book cover images", () => {
  const coverImage = "data:image/jpeg;base64,custom-cover";
  const migrated = migrateState({
    books: [{ id: "book-cover", title: "Cover Book", coverImage }],
    themes: [],
    notes: [],
  });

  assert.equal(migrated.books[0].coverImage, coverImage);
});

test("migrateState backfills book timestamps and note favorite metadata", () => {
  const migrated = migrateState({
    books: [{ id: "book-a", title: "Book A", author: "Author A" }],
    themes: [],
    notes: [
      {
        id: "note-favorite",
        title: "Favorite Note",
        favorite: true,
        metadata: { tags: ["keep"] },
      },
    ],
  });

  assert.ok(migrated.books[0].createdAt);
  assert.ok(migrated.books[0].updatedAt);
  assert.equal(getNoteFavorite(migrated.notes[0]), true);
  assert.equal(migrated.notes[0].metadata.favorite, true);
  assert.equal(migrated.notes[0].favorite, true);
});

test("migrateState backfills html from text and text from html", () => {
  const textOnly = {
    id: "note-text-only",
    title: "Text only",
    quote: "Plain quote & details",
    body: "Body line\nsecond line",
  };
  const htmlOnly = {
    id: "note-html-only",
    title: "HTML only",
    quoteHtml: "<p>HTML quote <strong>kept</strong></p>",
    bodyHtml: "<p>HTML body<br>line</p>",
  };

  const migrated = migrateState({ books: [], themes: [], notes: [textOnly, htmlOnly] });
  const [textNote, htmlNote] = migrated.notes;

  assert.equal(getNoteHtml(textNote, "quote"), textToHtml(textOnly.quote));
  assert.equal(getNoteHtml(textNote, "body"), textToHtml(textOnly.body));
  assert.equal(textNote.quoteHtml, textToHtml(textOnly.quote));
  assert.equal(textNote.bodyHtml, textToHtml(textOnly.body));

  assert.equal(getNoteText(htmlNote, "quote"), stripHtml(htmlOnly.quoteHtml));
  assert.equal(getNoteText(htmlNote, "body"), stripHtml(htmlOnly.bodyHtml));
  assert.equal(htmlNote.quote, stripHtml(htmlOnly.quoteHtml));
  assert.equal(htmlNote.body, stripHtml(htmlOnly.bodyHtml));
});

function noteGetterSnapshot(note) {
  return {
    title: getNoteTitle(note),
    type: getNoteType(note),
    bookId: getNoteBookId(note),
    themeIds: getNoteThemeIds(note),
    page: getNotePage(note),
    tags: getNoteTags(note),
    quoteHtml: getNoteHtml(note, "quote"),
    bodyHtml: getNoteHtml(note, "body"),
    quoteText: getNoteText(note, "quote"),
    bodyText: getNoteText(note, "body"),
  };
}

test("note getters read v1 and v2 note shapes consistently", () => {
  const v1Note = {
    title: "Shared title",
    type: "thought",
    bookId: "book-a",
    themeIds: ["theme-a", "theme-b"],
    page: "p. 42",
    tags: ["tag-a", "tag-b"],
    quote: "Shared quote",
    body: "Shared body",
    quoteHtml: "<p>Shared quote</p>",
    bodyHtml: "<p>Shared body</p>",
  };
  const v2Note = {
    title: "Shared title",
    kind: "thought",
    links: {
      bookId: "book-a",
      themeIds: ["theme-a", "theme-b"],
    },
    metadata: {
      page: "p. 42",
      tags: ["tag-a", "tag-b"],
    },
    content: {
      quote: {
        text: "Shared quote",
        html: "<p>Shared quote</p>",
      },
      body: {
        text: "Shared body",
        html: "<p>Shared body</p>",
      },
    },
  };

  assert.deepEqual(noteGetterSnapshot(v2Note), noteGetterSnapshot(v1Note));
});

test("setNoteHtml syncs body html, body text, legacy body, and word count", () => {
  const note = {
    quote: "",
    quoteHtml: "",
    body: "",
    bodyHtml: "",
    content: {
      quote: { text: "", html: "" },
      body: { text: "", html: "" },
    },
  };
  const bodyHtml = "<p>Alpha beta</p><p>Gamma</p>";

  setNoteHtml(note, "body", bodyHtml);

  assert.equal(getNoteHtml(note, "body"), bodyHtml);
  assert.equal(note.bodyHtml, bodyHtml);
  assert.equal(getNoteText(note, "body"), "Alpha beta\nGamma");
  assert.equal(note.content.body.text, "Alpha beta\nGamma");
  assert.equal(note.body, "Alpha beta\nGamma");
  assert.equal(getNoteWordCount(note), 14);
});

test("thought notes count and export body without quote section", () => {
  const note = {
    type: "thought",
    title: "Thinking note",
    quote: "Quote should stay hidden",
    body: "Body only",
    quoteHtml: "<p>Quote should stay hidden</p>",
    bodyHtml: "<p>Body only</p>",
  };
  const markdown = exportNoteMarkdown(note, { books: [], themes: [] });

  assert.equal(getNoteWordCount(note), 8);
  assert.match(markdown, /Body only/);
  assert.doesNotMatch(markdown, /Quote should stay hidden/);
  assert.doesNotMatch(markdown, /## 摘录/);
});

test("getNoteSummaryText prefers body text and falls back to quote text", () => {
  assert.equal(
    getNoteSummaryText({
      content: {
        quote: { text: "Quote summary", html: "" },
        body: { text: "Body summary", html: "" },
      },
    }),
    "Body summary",
  );

  assert.equal(
    getNoteSummaryText({
      content: {
        quote: { text: "Quote fallback", html: "" },
        body: { text: "", html: "" },
      },
    }),
    "Quote fallback",
  );
});

test("favorite, timeline, tag, and import helpers support workbench views", () => {
  const state = createInitialState();

  setNoteFavorite(state.notes[0], true);

  assert.equal(getNoteFavorite(state.notes[0]), true);
  assert.deepEqual(filterFavoriteNotes(state).map((note) => note.id), [state.notes[0].id]);
  assert.equal(groupNotesByLocalDate(state.notes)[0].date, "2026-06-10");
  assert.equal(noteMatchesTag(state.notes[0], { kind: "theme", id: "theme-method", name: "阅读方法" }), true);
  assert.equal(noteMatchesTag(state.notes[0], { kind: "tag", id: "主动阅读", name: "主动阅读" }), true);
  assert.equal(normalizeImportedState(JSON.stringify(state)).schemaVersion, 2);
});

test("createInitialState returns starter books, themes, and complete notes", () => {
  const state = createInitialState();

  assert.equal(STORAGE_KEY, "reading-notes-app:v1");
  assert.ok(state.books.length >= 4);
  assert.ok(state.themes.length >= 5);
  assert.ok(state.notes.length >= 3);

  for (const note of state.notes) {
    assert.ok(note.id);
    assert.ok(note.type);
    assert.ok(note.title);
    assert.ok(Object.hasOwn(note, "quote"));
    assert.ok(Object.hasOwn(note, "body"));
    assert.ok(note.bookId);
    assert.ok(Array.isArray(note.themeIds));
    assert.ok(Object.hasOwn(note, "page"));
    assert.ok(Array.isArray(note.tags));
    assert.ok(note.createdAt);
    assert.ok(note.updatedAt);
  }

  for (const book of state.books) {
    assert.ok(book.coverImage);
  }
});

test("normalizeList removes invalid and duplicate entries while normalizing ids", () => {
  const normalized = normalizeList([
    null,
    { id: 42, title: "  有效标题  " },
    { id: 42, title: "重复标题" },
    { name: "  无 ID 项  " },
    "bad",
  ]);

  assert.deepEqual(
    normalized.map((item) => item.id),
    ["42", "item-2"],
  );
  assert.equal(normalized[0].title, "有效标题");
  assert.equal(normalized[1].name, "无 ID 项");
});

test("findBook and findTheme resolve related records", () => {
  const state = createInitialState();

  assert.equal(findBook(state, "book-design-everyday").title, "设计心理学");
  assert.equal(findTheme(state, "theme-writing").name, "写作结构");
  assert.equal(findBook(state, "missing"), null);
  assert.equal(findTheme(state, "missing"), null);
});

test("filterNotes filters by book and theme", () => {
  const state = createInitialState();

  const designNotes = filterNotes(state, { view: "all", bookId: "book-design-everyday" });
  assert.equal(designNotes.length, 1);
  assert.equal(designNotes[0].id, "note-002");

  const selfNotes = filterNotes(state, { view: "all", themeId: "theme-self" });
  assert.deepEqual(
    selfNotes.map((note) => note.id),
    ["note-001", "note-003"],
  );
});

test("filterNotes supports view filters and text search", () => {
  const state = createInitialState();

  assert.deepEqual(
    filterNotes(state, { view: "quotes" }).map((note) => note.id),
    ["note-001", "note-003"],
  );
  assert.deepEqual(
    filterNotes(state, { view: "essays" }).map((note) => note.id),
    ["note-002"],
  );

  const result = filterNotes(state, { view: "all", query: "压力" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "note-003");

  const themeResult = filterNotes(state, { view: "all", query: "设计与体验" });
  assert.equal(themeResult.length, 1);
  assert.equal(themeResult[0].id, "note-002");
});

test("exportNoteMarkdown includes note metadata and content", () => {
  const state = createInitialState();
  const note = state.notes.find((item) => item.id === "note-001");
  const markdown = exportNoteMarkdown(note, state);

  assert.match(markdown, /^# 主动阅读是一种提问/);
  assert.match(markdown, /类型：摘录/);
  assert.match(markdown, /关联书籍：如何阅读一本书/);
  assert.match(markdown, /页码\/章节：第 23 页/);
  assert.match(markdown, /主题：阅读方法、自我整理/);
  assert.match(markdown, /标签：主动阅读、问题意识/);
  assert.match(markdown, /## 摘录/);
  assert.match(markdown, /读者越主动，阅读效果越好。/);
  assert.match(markdown, /## 随笔正文/);
});

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
