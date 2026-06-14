const test = require("node:test");
const assert = require("node:assert/strict");

test("workbench helpers preserve current section copy, filters, previews, and timeline grouping", async () => {
  const {
    getBookPreview,
    getCountSummary,
    getNotePreview,
    getSectionCopy,
    getVisibleNotes,
    groupNotesByDate,
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
      quoteText: "原文 B",
      bodyText: "正文摘要",
      updatedAt: "2026-06-11T08:00:00.000Z",
      favorite: false,
    },
    {
      id: "note-c",
      type: "thought",
      bookId: "book-b",
      title: "感想 C",
      quoteText: "",
      bodyText: "复盘内容",
      updatedAt: "2026-06-12T09:00:00.000Z",
      favorite: false,
    },
  ];

  assert.deepEqual(getSectionCopy("shelf"), {
    eyebrow: "书架索引",
    title: "我的书架",
    description: "按书籍整理摘录、随笔和最近形成的想法。",
  });
  assert.deepEqual(getSectionCopy("quotes"), {
    eyebrow: "记录列表",
    title: "阅读记录",
    description: "筛选摘录、随笔和收藏，快速进入写作。",
  });
  assert.deepEqual(
    getVisibleNotes("quotes", notes).map((note) => note.id),
    ["note-a"],
  );
  assert.deepEqual(
    getVisibleNotes("essays", notes).map((note) => note.id),
    ["note-b", "note-c"],
  );
  assert.deepEqual(
    getVisibleNotes("favorites", notes).map((note) => note.id),
    ["note-a"],
  );
  assert.deepEqual(groupNotesByDate(notes), [
    {
      date: "2026-06-12",
      notes: [notes[0], notes[2]],
    },
    {
      date: "2026-06-11",
      notes: [notes[1]],
    },
  ]);
  assert.deepEqual(
    getBookPreview({ id: "book-a", status: "reading" }, notes),
    {
      statusLabel: "正在读",
      noteCount: 2,
      summary: "关键句子",
    },
  );
  assert.deepEqual(
    getBookPreview({ id: "book-z", status: "planned" }, notes),
    {
      statusLabel: "待读",
      noteCount: 0,
      summary: "还没有摘录或随笔。",
    },
  );
  assert.deepEqual(
    getNotePreview(notes[0], { title: "一本书" }),
    {
      meta: "摘录 · 6月12日 · 一本书",
      quote: "关键句子",
      summary: "还没有写下正文。",
    },
  );
  assert.equal(getCountSummary({ books: 4, notes: 12 }), "4 本书 · 12 条记录");
});
