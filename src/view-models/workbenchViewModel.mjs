const SECTION_COPY = {
  shelf: {
    eyebrow: "书架索引",
    title: "我的书架",
    description: "按书籍整理摘录、随笔和最近形成的想法。",
  },
  tags: {
    eyebrow: "主题索引",
    title: "标签索引",
    description: "把散落的记录收束到可回访的关键词里。",
  },
  timeline: {
    eyebrow: "时间线",
    title: "最近阅读",
    description: "按生成时间回到每一段阅读现场。",
  },
  default: {
    eyebrow: "记录列表",
    title: "阅读记录",
    description: "筛选摘录、随笔和收藏，快速进入写作。",
  },
};

function getDateKey(note) {
  return (note.updatedAt || note.createdAt || "").slice(0, 10) || "未知日期";
}

function getBookStatusLabel(status) {
  if (status === "finished") return "已读";
  if (status === "planned") return "待读";
  return "正在读";
}

export function formatWorkbenchDate(value) {
  if (!value) return "未知日期";
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function getSectionCopy(section) {
  return SECTION_COPY[section] || SECTION_COPY.default;
}

export function getVisibleNotes(section, notes) {
  if (section === "quotes") return notes.filter((note) => note.type === "quote");
  if (section === "essays") return notes.filter((note) => note.type === "essay" || note.type === "thought");
  if (section === "favorites") return notes.filter((note) => note.favorite);
  return notes;
}

export function getNoteTypeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

export function groupNotesByDate(notes) {
  const groups = new Map();

  for (const note of notes) {
    const date = getDateKey(note);
    const existing = groups.get(date) || [];
    existing.push(note);
    groups.set(date, existing);
  }

  return Array.from(groups, ([date, items]) => ({ date, notes: items }));
}

export function getBookPreview(book, notes) {
  const bookNotes = notes.filter((note) => note.bookId === book.id);
  const latest = bookNotes[0];

  return {
    statusLabel: getBookStatusLabel(book.status),
    noteCount: bookNotes.length,
    summary: latest ? (latest.bodyText || latest.quoteText || "还没有正文摘要。") : "还没有摘录或随笔。",
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
