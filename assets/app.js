(function (root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ReadingNotesApp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STORAGE_KEY = "reading-notes-app:v1";
  var SCHEMA_VERSION = 2;

  function normalizeList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    var seen = Object.create(null);

    return list
      .filter(function (item) {
        return item && typeof item === "object";
      })
      .map(function (item, index) {
        var next = Object.assign({}, item);
        var rawId = next.id == null || next.id === "" ? "item-" + index : next.id;
        next.id = String(rawId);

        if (typeof next.title === "string") {
          next.title = next.title.trim();
        }

        if (typeof next.name === "string") {
          next.name = next.name.trim();
        }

        return next;
      })
      .filter(function (item) {
        if (seen[item.id]) {
          return false;
        }
        seen[item.id] = true;
        return true;
      });
  }

  function defaultBookCover(bookId) {
    var knownCovers = {
      "book-slow-reading": "assets/covers/book-slow-reading.png",
      "book-design-everyday": "assets/covers/book-design-everyday.png",
      "book-story": "assets/covers/book-story.png",
      "book-walden": "assets/covers/book-walden.png",
    };
    return knownCovers[String(bookId || "")] || "assets/covers/book-slow-reading.png";
  }

  function createInitialState() {
    var books = normalizeList([
      {
        id: "book-slow-reading",
        title: "如何阅读一本书",
        author: "莫提默·J. 艾德勒 / 查尔斯·范多伦",
        coverColor: "#4f6f52",
      },
      {
        id: "book-design-everyday",
        title: "设计心理学",
        author: "唐纳德·A. 诺曼",
        coverColor: "#d66f42",
      },
      {
        id: "book-story",
        title: "故事",
        author: "罗伯特·麦基",
        coverColor: "#315c8c",
      },
      {
        id: "book-walden",
        title: "瓦尔登湖",
        author: "亨利·戴维·梭罗",
        coverColor: "#7c8f5b",
      },
    ]);

    var themes = normalizeList([
      { id: "theme-method", name: "阅读方法", color: "#4f6f52" },
      { id: "theme-design", name: "设计与体验", color: "#d66f42" },
      { id: "theme-writing", name: "写作结构", color: "#315c8c" },
      { id: "theme-life", name: "生活观察", color: "#7c8f5b" },
      { id: "theme-self", name: "自我整理", color: "#8b5f7c" },
    ]);

    var notes = normalizeList([
      {
        id: "note-001",
        type: "quote",
        title: "主动阅读是一种提问",
        quote: "读者越主动，阅读效果越好。",
        body: "这条提醒适合放在每次开始读新书前：先写下我想解决的问题，再进入正文。",
        bookId: "book-slow-reading",
        themeIds: ["theme-method", "theme-self"],
        page: "第 23 页",
        tags: ["主动阅读", "问题意识"],
        createdAt: "2026-06-10T09:00:00.000+08:00",
        updatedAt: "2026-06-10T09:00:00.000+08:00",
      },
      {
        id: "note-002",
        type: "essay",
        title: "好设计让选择变少",
        quote: "好的概念模型能让用户预测操作结果。",
        body: "真正省力的体验不是隐藏复杂度，而是把复杂度整理成用户可以预期的路径。",
        bookId: "book-design-everyday",
        themeIds: ["theme-design"],
        page: "第 2 章",
        tags: ["可用性", "反馈"],
        createdAt: "2026-05-22T20:15:00.000+08:00",
        updatedAt: "2026-05-23T08:30:00.000+08:00",
      },
      {
        id: "note-003",
        type: "quote",
        title: "故事从压力中显形",
        quote: "人物在压力下做出的选择，揭示其真实本性。",
        body: "可以用来检查随笔里的例子：有没有一个真实的选择时刻，而不只是观点陈述。",
        bookId: "book-story",
        themeIds: ["theme-writing", "theme-self"],
        page: "第 11 章",
        tags: ["人物", "结构"],
        createdAt: "2026-04-18T14:45:00.000+08:00",
        updatedAt: "2026-04-18T15:05:00.000+08:00",
      },
    ]).map(function (note) {
      note.quoteHtml = textToHtml(note.quote);
      note.bodyHtml = textToHtml(note.body);
      return note;
    });

    return migrateState({
      schemaVersion: SCHEMA_VERSION,
      books: books,
      themes: themes,
      notes: notes,
      activeView: "shelf",
      activeBookId: "",
      activeNoteId: notes[0].id,
      bookFilter: "all",
      query: "",
    });
  }

  function getBooks(source) {
    if (Array.isArray(source)) return normalizeList(source);
    return normalizeList(source && source.books || source && source.data && source.data.books);
  }

  function getThemes(source) {
    if (Array.isArray(source)) return normalizeList(source);
    return normalizeList(source && source.themes || source && source.data && source.data.themes);
  }

  function getNotes(source) {
    if (Array.isArray(source)) return normalizeList(source);
    return normalizeList(source && source.notes || source && source.data && source.data.notes);
  }

  function findBook(source, bookId) {
    var books = Array.isArray(source) ? source : getBooks(source);
    return normalizeList(books).find(function (book) {
      return book.id === String(bookId);
    }) || null;
  }

  function findTheme(source, themeId) {
    var themes = Array.isArray(source) ? source : getThemes(source);
    return normalizeList(themes).find(function (theme) {
      return theme.id === String(themeId);
    }) || null;
  }

  function getLocalDateKey(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function noteMatchesQuery(note, state, query) {
    var normalizedQuery = String(query || "").trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    var book = findBook(state, getNoteBookId(note));
    var themeNames = getNoteThemeIds(note)
      .map(function (themeId) {
        var theme = findTheme(state, themeId);
        return theme ? theme.name : "";
      })
      .join(" ");

    var haystack = [
      getNoteSearchText(note, state),
      book && book.title,
      book && book.author,
      themeNames,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.indexOf(normalizedQuery) !== -1;
  }

  function filterNotes(state, filters) {
    var safeState = state || {};
    var notes = getNotes(safeState);
    var currentFilters = filters || {};
    var view = currentFilters.view || "all";
    var todayKey = getLocalDateKey();

    return notes.filter(function (note) {
      if (view === "today" && getLocalDateKey(note.createdAt) !== todayKey) {
        return false;
      }

      if (view === "quotes" && getNoteType(note) !== "quote") {
        return false;
      }

      if (view === "essays" && getNoteType(note) !== "essay" && getNoteType(note) !== "thought") {
        return false;
      }

      if (currentFilters.bookId && getNoteBookId(note) !== currentFilters.bookId) {
        return false;
      }

      if (
        currentFilters.themeId &&
        getNoteThemeIds(note).indexOf(currentFilters.themeId) === -1
      ) {
        return false;
      }

      return noteMatchesQuery(note, safeState, currentFilters.query);
    });
  }

  function getBookNotes(state, bookId, typeFilter, query) {
    var filter = typeFilter || "all";
    return getNotes(state).filter(function (note) {
      if (getNoteBookId(note) !== String(bookId)) {
        return false;
      }
      if (filter !== "all" && getNoteType(note) !== filter) {
        return false;
      }
      return noteMatchesQuery(note, state || {}, query);
    });
  }

  function formatList(items) {
    return items && items.length ? items.join("、") : "未填写";
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
    if (!escaped.trim()) {
      return "";
    }

    return escaped
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return "<p>" + paragraph.replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  function decodeHtml(value) {
    return String(value || "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function stripHtml(value) {
    return decodeHtml(
      String(value || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h1|h2|h3|blockquote|li)>/gi, "\n")
        .replace(/<[^>]*>/g, ""),
    )
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function richTextToMarkdown(html) {
    var source = String(html || "");
    if (!source.trim()) {
      return "";
    }

    var markdown = source
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
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, function (_, text) {
        return "**" + stripHtml(text) + "**";
      })
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, function (_, text) {
        return "**" + stripHtml(text) + "**";
      })
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, function (_, text) {
        return "*" + stripHtml(text) + "*";
      })
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, function (_, text) {
        return "*" + stripHtml(text) + "*";
      })
      .replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, function (_, tag, text) {
        return "~~" + stripHtml(text) + "~~";
      })
      .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, function (_, text) {
        return "==" + stripHtml(text) + "==";
      })
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, function (_, text) {
        return "`" + stripHtml(text) + "`";
      })
      .replace(/<hr\s*\/?>/gi, "\n---\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "");

    return decodeHtml(markdown)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function clonePlain(value) {
    return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  }

  function uniqueStrings(list) {
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null);
    return list
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean)
      .filter(function (item) {
        if (seen[item]) return false;
        seen[item] = true;
        return true;
      });
  }

  function normalizeEntityListKeepDuplicates(list, prefix) {
    if (!Array.isArray(list)) return [];
    var counts = Object.create(null);
    return list
      .filter(function (item) {
        return item && typeof item === "object";
      })
      .map(function (item, index) {
        var next = Object.assign({}, item);
        var baseId = String(next.id == null || next.id === "" ? prefix + "-" + index : next.id);
        if (counts[baseId] == null) {
          counts[baseId] = 0;
          next.id = baseId;
        } else {
          counts[baseId] += 1;
          next.id = baseId + "-" + counts[baseId];
        }
        return next;
      });
  }

  function slugForTag(name) {
    return "tag-" + Array.from(String(name || "")).map(function (char) {
      return char.charCodeAt(0).toString(36);
    }).join("-");
  }

  function ensureContentPart(part, legacyText, legacyHtml) {
    var current = part && typeof part === "object" ? part : {};
    var html = typeof current.html === "string" ? current.html : typeof legacyHtml === "string" ? legacyHtml : "";
    var text = typeof current.text === "string" ? current.text : typeof legacyText === "string" ? legacyText : "";
    if (!html && text) html = textToHtml(text);
    if (!text && html) text = stripHtml(html);
    return {
      text: text,
      html: html,
    };
  }

  function syncNoteAliases(note) {
    note.type = getNoteType(note);
    note.quote = getNoteText(note, "quote");
    note.body = getNoteText(note, "body");
    note.quoteHtml = getNoteHtml(note, "quote");
    note.bodyHtml = getNoteHtml(note, "body");
    note.bookId = getNoteBookId(note);
    note.themeIds = getNoteThemeIds(note);
    note.page = getNotePage(note);
    note.tags = getNoteTags(note);
    note.createdAt = getNoteCreatedAt(note);
    note.updatedAt = getNoteUpdatedAt(note);
    return note;
  }

  function normalizeBook(book, index) {
    var now = new Date().toISOString();
    var authors = Array.isArray(book.authors) ? book.authors : book.author ? [book.author] : [];
    return Object.assign({}, book, {
      id: String(book.id || "book-" + index),
      title: String(book.title || book.name || "未命名书籍").trim(),
      author: String(book.author || authors.join(" / ") || "").trim(),
      authors: uniqueStrings(authors),
      coverColor: book.coverColor || "#687767",
      coverImage: book.coverImage || defaultBookCover(book.id),
      status: book.status || "reading",
      createdAt: book.createdAt || book.updatedAt || now,
      updatedAt: book.updatedAt || book.createdAt || now,
    });
  }

  function normalizeTheme(theme, index) {
    var now = new Date().toISOString();
    return Object.assign({}, theme, {
      id: String(theme.id || "theme-" + index),
      name: String(theme.name || "未命名主题").trim(),
      color: theme.color || "#687767",
      source: theme.source || (theme.auto ? "auto" : "manual"),
      createdAt: theme.createdAt || theme.updatedAt || now,
      updatedAt: theme.updatedAt || theme.createdAt || now,
    });
  }

  function normalizeNote(note, index) {
    var now = new Date().toISOString();
    var source = note && typeof note === "object" ? note : {};
    var content = source.content && typeof source.content === "object" ? source.content : {};
    var links = source.links && typeof source.links === "object" ? source.links : {};
    var metadata = source.metadata && typeof source.metadata === "object" ? source.metadata : {};
    var location = source.location && typeof source.location === "object" ? source.location : metadata.location || {};
    var page = metadata.page || location.label || location.page || source.page || "";
    var normalized = Object.assign({}, source, {
      id: String(source.id || "note-" + index),
      type: source.type || source.kind || metadata.type || "essay",
      kind: source.kind || source.type || metadata.type || "essay",
      title: String(source.title || "未命名记录").trim(),
      content: {
        quote: ensureContentPart(content.quote, source.quote, source.quoteHtml),
        body: ensureContentPart(content.body, source.body, source.bodyHtml),
      },
      links: {
        bookId: String(links.bookId || source.bookId || ""),
        themeIds: uniqueStrings(links.themeIds || source.themeIds),
      },
      location: {
        label: String(location.label || page || ""),
        page: location.page || "",
        chapter: location.chapter || "",
      },
      metadata: {
        page: String(page || ""),
        tags: uniqueStrings(metadata.tags || source.tags),
        createdAt: metadata.createdAt || source.createdAt || now,
        updatedAt: metadata.updatedAt || source.updatedAt || source.createdAt || now,
        sortAt: metadata.sortAt || source.sortAt || source.updatedAt || source.createdAt || now,
      },
    });
    return syncNoteAliases(normalized);
  }

  function deriveTags(notes, existingTags) {
    var byName = Object.create(null);
    normalizeEntityListKeepDuplicates(existingTags, "tag").forEach(function (tag) {
      var name = String(tag.name || "").trim();
      if (!name) return;
      byName[name] = Object.assign({}, tag, {
        id: String(tag.id || slugForTag(name)),
        name: name,
      });
    });
    notes.forEach(function (note) {
      getNoteTags(note).forEach(function (name) {
        if (!byName[name]) {
          byName[name] = {
            id: slugForTag(name),
            name: name,
            createdAt: getNoteCreatedAt(note),
            updatedAt: getNoteUpdatedAt(note),
          };
        }
      });
    });
    return Object.keys(byName).map(function (name) {
      return byName[name];
    });
  }

  function attachRuntimeAliases(state) {
    state.data = state.data || {};
    state.ui = state.ui || {};
    state.books = state.data.books;
    state.themes = state.data.themes;
    state.notes = state.data.notes;
    state.tags = state.data.tags;
    state.activeView = state.ui.activeView;
    state.activeBookId = state.ui.activeBookId;
    state.activeNoteId = state.ui.activeNoteId;
    state.bookFilter = state.ui.filters.bookFilter;
    state.query = state.ui.filters.query;
    state.editorFocusMode = state.ui.editor.focusMode;
    return state;
  }

  function syncUiState(state) {
    state.ui = state.ui || {};
    state.ui.activeView = state.activeView || "shelf";
    state.ui.activeBookId = state.activeBookId || "";
    state.ui.activeNoteId = state.activeNoteId || (state.notes && state.notes[0] && state.notes[0].id) || "";
    state.ui.filters = state.ui.filters || {};
    state.ui.filters.bookFilter = state.bookFilter || "all";
    state.ui.filters.query = state.query || "";
    state.ui.filters.themeId = state.ui.filters.themeId || "";
    state.ui.filters.tagId = state.ui.filters.tagId || "";
    state.ui.editor = state.ui.editor || {};
    state.ui.editor.focusMode = Boolean(state.editorFocusMode);
    return state;
  }

  function migrateState(rawState) {
    var source = clonePlain(rawState) || {};
    var sourceData = source.data && typeof source.data === "object" ? source.data : source;
    var books = normalizeEntityListKeepDuplicates(sourceData.books, "book").map(normalizeBook);
    var themes = normalizeEntityListKeepDuplicates(sourceData.themes, "theme").map(normalizeTheme);
    var notes = normalizeEntityListKeepDuplicates(sourceData.notes, "note").map(normalizeNote);
    var tags = deriveTags(notes, sourceData.tags);
    var sourceUi = source.ui && typeof source.ui === "object" ? source.ui : {};
    var sourceFilters = sourceUi.filters || {};
    var sourceEditor = sourceUi.editor || {};
    var activeNoteId = sourceUi.activeNoteId || source.activeNoteId || (notes[0] && notes[0].id) || "";
    var state = {
      schemaVersion: SCHEMA_VERSION,
      data: {
        books: books,
        themes: themes,
        notes: notes,
        tags: tags,
      },
      ui: {
        activeView: ["shelf", "book", "editor"].indexOf(sourceUi.activeView || source.activeView) === -1 ? "shelf" : (sourceUi.activeView || source.activeView),
        activeBookId: sourceUi.activeBookId || source.activeBookId || "",
        activeNoteId: activeNoteId,
        filters: {
          bookFilter: sourceFilters.bookFilter || source.bookFilter || "all",
          query: sourceFilters.query || source.query || "",
          themeId: sourceFilters.themeId || source.activeThemeId || "",
          tagId: sourceFilters.tagId || "",
        },
        editor: {
          focusMode: Boolean(sourceEditor.focusMode || source.editorFocusMode),
        },
      },
    };
    return attachRuntimeAliases(state);
  }

  function serializeState(state) {
    syncUiState(state);
    return {
      schemaVersion: SCHEMA_VERSION,
      data: {
        books: getBooks(state).map(normalizeBook),
        themes: getThemes(state).map(normalizeTheme),
        notes: getNotes(state).map(normalizeNote),
        tags: deriveTags(getNotes(state), state.data && state.data.tags || state.tags),
      },
      ui: state.ui,
    };
  }

  function getNoteTitle(note) {
    return String(note && note.title || "未命名记录");
  }

  function getNoteType(note) {
    return String(note && (note.type || note.kind || note.metadata && note.metadata.type) || "essay");
  }

  function getNoteBookId(note) {
    return String(note && (note.links && note.links.bookId || note.bookId) || "");
  }

  function getNoteThemeIds(note) {
    return uniqueStrings(note && (note.links && note.links.themeIds || note.themeIds));
  }

  function getNotePage(note) {
    return String(note && (note.metadata && note.metadata.page || note.location && note.location.label || note.page) || "");
  }

  function getNoteTags(note) {
    return uniqueStrings(note && (note.metadata && note.metadata.tags || note.tags));
  }

  function getNoteCreatedAt(note) {
    return String(note && (note.metadata && note.metadata.createdAt || note.createdAt) || new Date().toISOString());
  }

  function getNoteUpdatedAt(note) {
    return String(note && (note.metadata && note.metadata.updatedAt || note.updatedAt || getNoteCreatedAt(note)) || new Date().toISOString());
  }

  function getNoteHtml(note, part) {
    var contentPart = note && note.content && note.content[part];
    var legacy = part === "quote" ? note && note.quoteHtml : note && note.bodyHtml;
    return String(contentPart && contentPart.html || legacy || "");
  }

  function getNoteText(note, part) {
    var contentPart = note && note.content && note.content[part];
    var legacy = part === "quote" ? note && note.quote : note && note.body;
    var html = getNoteHtml(note, part);
    return String(contentPart && contentPart.text || legacy || (html ? stripHtml(html) : ""));
  }

  function setNoteHtml(note, part, html) {
    if (!note) return;
    note.content = note.content || {};
    note.content[part] = note.content[part] || {};
    note.content[part].html = String(html || "");
    note.content[part].text = stripHtml(html);
    if (part === "quote") {
      note.quoteHtml = note.content[part].html;
      note.quote = note.content[part].text;
    } else {
      note.bodyHtml = note.content[part].html;
      note.body = note.content[part].text;
    }
  }

  function setNoteMeta(note, values) {
    if (!note) return;
    note.links = note.links || {};
    note.metadata = note.metadata || {};
    if (Object.hasOwn(values, "type")) {
      note.type = values.type;
      note.kind = values.type;
      note.metadata.type = values.type;
    }
    if (Object.hasOwn(values, "bookId")) {
      note.links.bookId = values.bookId;
      note.bookId = values.bookId;
    }
    if (Object.hasOwn(values, "themeIds")) {
      note.links.themeIds = uniqueStrings(values.themeIds);
      note.themeIds = note.links.themeIds;
    }
    if (Object.hasOwn(values, "page")) {
      note.metadata.page = values.page;
      note.page = values.page;
      note.location = note.location || {};
      note.location.label = values.page;
    }
    if (Object.hasOwn(values, "tags")) {
      note.metadata.tags = uniqueStrings(values.tags);
      note.tags = note.metadata.tags;
    }
  }

  function touchNote(note, date) {
    if (!note) return;
    var stamp = (date || new Date()).toISOString();
    note.metadata = note.metadata || {};
    note.metadata.updatedAt = stamp;
    note.metadata.sortAt = stamp;
    note.updatedAt = stamp;
  }

  function getNoteSearchText(note, state) {
    var book = findBook(state, getNoteBookId(note));
    var themeNames = getNoteThemeIds(note)
      .map(function (themeId) {
        var theme = findTheme(state, themeId);
        return theme ? theme.name : "";
      })
      .join(" ");
    return [
      getNoteTitle(note),
      getNoteText(note, "quote"),
      getNoteText(note, "body"),
      getNotePage(note),
      book && book.title,
      book && book.author,
      themeNames,
      getNoteTags(note).join(" "),
    ].filter(Boolean).join(" ");
  }

  function getNoteWordCount(note) {
    var content = getNoteType(note) === "thought"
      ? getNoteText(note, "body")
      : getNoteText(note, "quote") + getNoteText(note, "body");
    return String(content).replace(/\s/g, "").length;
  }

  function getNoteSummaryText(note) {
    return getNoteText(note, "body") || getNoteText(note, "quote");
  }

  function getNoteMarkdownContent(note, part) {
    var html = getNoteHtml(note, part);
    return html ? richTextToMarkdown(html) : getNoteText(note, part);
  }

  function exportNoteMarkdown(note, state) {
    var safeNote = note || {};
    var safeState = state || {};
    var book = findBook(safeState, getNoteBookId(safeNote));
    var themes = getNoteThemeIds(safeNote)
      .map(function (themeId) {
        return findTheme(safeState, themeId);
      })
      .filter(Boolean)
      .map(function (theme) {
        return theme.name;
      });
    var type = getNoteType(safeNote);
    var typeLabel = type === "essay" ? "随笔" : type === "thought" ? "感想" : "摘录";
    var tags = getNoteTags(safeNote).map(String);
    var quoteMarkdown = type === "thought" ? "" : getNoteMarkdownContent(safeNote, "quote");
    var bodyMarkdown = getNoteMarkdownContent(safeNote, "body");

    var lines = [
      "# " + getNoteTitle(safeNote),
      "",
      "- 类型：" + typeLabel,
      "- 关联书籍：" + (book ? book.title : "未关联"),
      "- 页码/章节：" + (getNotePage(safeNote) || "未填写"),
      "- 主题：" + formatList(themes),
      "- 标签：" + formatList(tags),
      "",
    ];

    if (type !== "thought") {
      lines = lines.concat([
      "## 摘录",
      "",
      quoteMarkdown || "未填写",
      "",
      ]);
    }

    return lines.concat([
      type === "thought" ? "## 感想正文" : "## 随笔正文",
      "",
      bodyMarkdown || "未填写",
    ]).join("\n");
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    normalizeList: normalizeList,
    createInitialState: createInitialState,
    migrateState: migrateState,
    serializeState: serializeState,
    filterNotes: filterNotes,
    exportNoteMarkdown: exportNoteMarkdown,
    findBook: findBook,
    findTheme: findTheme,
    getBookNotes: getBookNotes,
    getNoteTitle: getNoteTitle,
    getNoteType: getNoteType,
    getNoteBookId: getNoteBookId,
    getNoteThemeIds: getNoteThemeIds,
    getNotePage: getNotePage,
    getNoteTags: getNoteTags,
    getNoteCreatedAt: getNoteCreatedAt,
    getNoteUpdatedAt: getNoteUpdatedAt,
    getNoteHtml: getNoteHtml,
    getNoteText: getNoteText,
    setNoteHtml: setNoteHtml,
    setNoteMeta: setNoteMeta,
    touchNote: touchNote,
    getNoteSearchText: getNoteSearchText,
    getNoteWordCount: getNoteWordCount,
    getNoteSummaryText: getNoteSummaryText,
    getNoteMarkdownContent: getNoteMarkdownContent,
    escapeHtml: escapeHtml,
    textToHtml: textToHtml,
    stripHtml: stripHtml,
    richTextToMarkdown: richTextToMarkdown,
  };
});

if (typeof window !== "undefined" && window.document && window.ReadingNotesApp) {
  (function () {
    "use strict";

    var logic = window.ReadingNotesApp;
    var THEME_KEY = "reading-notes-theme";
    var TYPE_OPTIONS = [
      { id: "quote", label: "摘录" },
      { id: "essay", label: "随笔" },
      { id: "thought", label: "感想" },
    ];
    var BOOK_FILTERS = [
      { id: "all", label: "全部" },
      { id: "quote", label: "摘录" },
      { id: "essay", label: "随笔" },
      { id: "thought", label: "感想" },
    ];
    var PROMPTS = [
      "这段文字真正改变了你对哪个概念的理解？",
      "把这条记录压缩成一句可复述的观点。",
      "三个月后重读，哪一句最值得留下？",
      "它能和哪本书、哪个主题产生连接？",
    ];

    var state = normalizeStateV2(loadState());
    var saveTimer = 0;
    var toastTimer = 0;
    var activeRichEditor = null;
    var savedSelection = null;
    var toolbarFrame = 0;

    function loadState() {
      try {
        var raw = window.localStorage.getItem(logic.STORAGE_KEY);
        return raw ? JSON.parse(raw) : logic.createInitialState();
      } catch (error) {
        try {
          var broken = window.localStorage.getItem(logic.STORAGE_KEY);
          window.localStorage.setItem(logic.STORAGE_KEY + ":backup:" + Date.now(), broken || "");
        } catch (backupError) {
          // Local backup can fail in private mode; starter data keeps the app usable.
        }
        return logic.createInitialState();
      }
    }

    function normalizeStateV2(nextState) {
      var starter = logic.createInitialState();
      var source = nextState && typeof nextState === "object" ? nextState : starter;

      if (source.schemaVersion !== logic.SCHEMA_VERSION && source !== starter) {
        try {
          window.localStorage.setItem(
            logic.STORAGE_KEY + ":backup:v1:" + Date.now(),
            JSON.stringify(source),
          );
        } catch (backupError) {
          // The migration can still proceed if local backup storage is unavailable.
        }
      }

      var migrated = logic.migrateState(source);
      if (!migrated.books.length) migrated.books = starter.books.slice();
      if (!migrated.themes.length) migrated.themes = starter.themes.slice();
      if (!migrated.notes.length) migrated.notes = starter.notes.slice();
      migrated.data.books = migrated.books;
      migrated.data.themes = migrated.themes;
      migrated.data.notes = migrated.notes;
      migrated.activeView = "shelf";
      migrated.activeBookId = "";
      migrated.bookFilter = "all";
      migrated.query = migrated.query || "";
      migrated.activeNoteId = migrated.activeNoteId || (migrated.notes[0] && migrated.notes[0].id) || "";
      return logic.migrateState(migrated);
    }

    function normalizeState(nextState) {
      var starter = logic.createInitialState();
      var safeState = nextState && typeof nextState === "object" ? nextState : starter;
      safeState.books = Array.isArray(safeState.books) && safeState.books.length ? safeState.books : starter.books;
      safeState.themes = Array.isArray(safeState.themes) && safeState.themes.length ? safeState.themes : starter.themes;
      safeState.notes = Array.isArray(safeState.notes) && safeState.notes.length ? safeState.notes : starter.notes;
      safeState.activeView = "shelf";
      safeState.activeBookId = "";
      safeState.activeNoteId = safeState.activeNoteId || safeState.notes[0].id;
      safeState.bookFilter = "all";
      safeState.editorFocusMode = Boolean(safeState.editorFocusMode);
      safeState.query = safeState.query || "";
      safeState.notes.forEach(function (note) {
        note.type = note.type || "essay";
        note.quote = note.quote || "";
        note.body = note.body || "";
        note.quoteHtml = typeof note.quoteHtml === "string" ? note.quoteHtml : logic.textToHtml(note.quote);
        note.bodyHtml = typeof note.bodyHtml === "string" ? note.bodyHtml : logic.textToHtml(note.body);
        note.page = note.page || "";
        note.tags = Array.isArray(note.tags) ? note.tags : [];
        note.themeIds = Array.isArray(note.themeIds) ? note.themeIds : [];
        note.createdAt = note.createdAt || new Date().toISOString();
        note.updatedAt = note.updatedAt || note.createdAt;
      });
      return safeState;
    }

    function persistNow() {
      try {
        window.localStorage.setItem(logic.STORAGE_KEY, JSON.stringify(logic.serializeState(state)));
        setText("saveStatus", "已保存 · " + formatClock(new Date()));
      } catch (error) {
        setText("saveStatus", "保存失败");
        showToast("当前浏览器无法保存记录。");
      }
    }

    function scheduleSave() {
      setText("saveStatus", "保存中…");
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistNow, 260);
    }

    function byId(id) {
      return document.getElementById(id);
    }

    function setText(id, text) {
      var element = byId(id);
      if (element) {
        element.textContent = text;
      }
    }

    function clearElement(element) {
      while (element && element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }

    function element(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function createButton(className, text) {
      var button = element("button", className, text);
      button.type = "button";
      return button;
    }

    function formatClock(date) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    }

    function typeLabel(type) {
      var match = TYPE_OPTIONS.find(function (item) {
        return item.id === type;
      });
      return match ? match.label : "随笔";
    }

    function parseTerms(value) {
      return String(value || "")
        .split(/[，,]/)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean)
        .filter(function (item, index, list) {
          return list.indexOf(item) === index;
        });
    }

    function slugForTheme(name) {
      return "theme-" + Array.from(name).map(function (char) {
        return char.charCodeAt(0).toString(36);
      }).join("-");
    }

    function ensureTheme(name) {
      var existing = state.themes.find(function (theme) {
        return theme.name === name;
      });
      if (existing) return existing.id;

      var id = slugForTheme(name);
      state.themes.push({
        id: id,
        name: name,
        color: "#687767",
        auto: true,
        source: "auto",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (state.data) state.data.themes = state.themes;
      return id;
    }

    function pruneUnusedAutoThemes() {
      var usedThemeIds = new Set();
      state.notes.forEach(function (note) {
        logic.getNoteThemeIds(note).forEach(function (themeId) {
          usedThemeIds.add(themeId);
        });
      });
      state.themes = state.themes.filter(function (theme) {
        return !theme.auto || usedThemeIds.has(theme.id);
      });
      if (state.data) state.data.themes = state.themes;
    }

    function noteBook(note) {
      return logic.findBook(state, logic.getNoteBookId(note));
    }

    function noteThemes(note) {
      return logic.getNoteThemeIds(note)
        .map(function (themeId) {
          return logic.findTheme(state, themeId);
        })
        .filter(Boolean);
    }

    function activeNote() {
      var note = state.notes.find(function (item) {
        return item.id === state.activeNoteId;
      });
      if (!note) {
        note = state.notes[0] || null;
        state.activeNoteId = note ? note.id : "";
      }
      return note;
    }

    function activeBook() {
      return state.books.find(function (book) {
        return book.id === state.activeBookId;
      }) || logic.findBook(state, state.activeBookId);
    }

    function countWords(note) {
      return logic.getNoteWordCount(note);
    }

    function noteUpdatedTime(note) {
      var date = new Date(logic.getNoteUpdatedAt(note) || logic.getNoteCreatedAt(note) || Date.now());
      if (Number.isNaN(date.getTime())) return "时间未知";
      return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
    }

    function shortText(value, maxLength) {
      var text = String(value || "").replace(/\s+/g, " ").trim();
      return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
    }

    function bookNotes(book) {
      return logic.getBookNotes(state, book.id, "all", state.query);
    }

    function bookMatchesQuery(book) {
      var query = String(state.query || "").trim().toLowerCase();
      if (!query) return true;
      var notes = logic.getBookNotes(state, book.id, "all", "");
      var noteText = notes.map(function (note) {
        return logic.getNoteSearchText(note, state);
      }).join(" ");
      return [book.title, book.author, noteText].join(" ").toLowerCase().indexOf(query) !== -1;
    }

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

    function renderShelfView() {
      var stage = byId("viewStage");
      clearElement(stage);
      stage.className = "view-stage shelf-stage";
      stage.appendChild(createShelfHeader());
      stage.appendChild(createShelfGrid());
    }

    function createShelfHeader() {
      var header = element("header", "shelf-hero");
      var intro = element("div", "shelf-intro");
      var seal = element("div", "seal", "墨");
      var copy = element("div");
      copy.appendChild(element("p", "eyebrow", "Quiet Reading Desk"));
      copy.appendChild(element("h1", null, "墨读札记"));
      copy.appendChild(element("p", "hero-copy", "先从书架进入，再沉到每本书自己的摘录、随笔和感想里。"));
      intro.appendChild(seal);
      intro.appendChild(copy);

      var tools = element("div", "shelf-toolbar");
      var search = element("input", "search-input");
      search.type = "search";
      search.placeholder = "搜索书名、作者、摘录或主题";
      search.value = state.query || "";
      search.setAttribute("aria-label", "搜索书名、作者、摘录或主题");
      search.addEventListener("input", function (event) {
        state.query = event.target.value;
        renderShelfBooksOnly();
        updateShelfStats();
        scheduleSave();
      });
      tools.appendChild(search);
      tools.appendChild(createThemeButton());

      var stats = element("div", "shelf-stats", null);
      stats.id = "shelfStats";

      header.appendChild(intro);
      header.appendChild(tools);
      header.appendChild(stats);
      window.requestAnimationFrame(updateShelfStats);
      return header;
    }

    function updateShelfStats() {
      var stats = byId("shelfStats");
      if (!stats) return;
      clearElement(stats);
      [
        { label: "书籍", value: state.books.length },
        { label: "记录", value: state.notes.length },
        {
          label: "字数",
          value: state.notes.reduce(function (sum, note) {
            return sum + countWords(note);
          }, 0),
        },
      ].forEach(function (item) {
        var card = element("div", "shelf-stat");
        card.appendChild(element("strong", null, String(item.value)));
        card.appendChild(element("span", null, item.label));
        stats.appendChild(card);
      });
    }

    function createShelfGrid() {
      var section = element("section", "shelf-content");
      var grid = element("div", "book-grid");
      grid.id = "bookGrid";
      section.appendChild(grid);
      renderShelfBooksInto(grid);
      return section;
    }

    function renderShelfBooksOnly() {
      var grid = byId("bookGrid");
      if (!grid) return;
      renderShelfBooksInto(grid);
    }

    function renderShelfBooksInto(grid) {
      clearElement(grid);
      var visibleBooks = state.books.filter(bookMatchesQuery);
      if (!visibleBooks.length) {
        grid.appendChild(element("p", "empty-state", "没有找到匹配的书。"));
        return;
      }

      var fragment = document.createDocumentFragment();
      visibleBooks.forEach(function (book) {
        fragment.appendChild(createBookCard(book));
      });
      grid.appendChild(fragment);
    }

    function createBookCover(book, className) {
      var wrap = element("span", "book-cover-wrap " + className);
      var img = document.createElement("img");
      img.className = "book-cover-img";
      img.src = book.coverImage || "assets/covers/" + book.id + ".png";
      img.alt = book.title + " cover";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 640;
      img.height = 900;
      img.addEventListener("error", function () {
        img.src = "assets/covers/" + book.id + ".png";
      }, { once: true });
      wrap.appendChild(img);
      wrap.appendChild(element("span", "book-cover-glint"));
      return wrap;
    }

    function loadCoverImage(file) {
      return new Promise(function (resolve, reject) {
        var url = window.URL.createObjectURL(file);
        var image = new Image();
        image.onload = function () {
          window.URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = function () {
          window.URL.revokeObjectURL(url);
          reject(new Error("invalid image"));
        };
        image.src = url;
      });
    }

    function canvasToDataUrl(canvas) {
      return new Promise(function (resolve, reject) {
        if (!canvas.toBlob) {
          resolve(canvas.toDataURL("image/jpeg", 0.84));
          return;
        }

        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("image export failed"));
            return;
          }
          var reader = new FileReader();
          reader.onload = function () {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.84);
      });
    }

    function prepareCoverImage(file) {
      if (!file || !/^image\//.test(file.type || "")) {
        return Promise.reject(new Error("not image"));
      }

      return loadCoverImage(file).then(function (image) {
        var targetWidth = 640;
        var targetHeight = 900;
        var targetRatio = targetWidth / targetHeight;
        var sourceRatio = image.naturalWidth / image.naturalHeight;
        var sourceWidth = image.naturalWidth;
        var sourceHeight = image.naturalHeight;
        var sourceX = 0;
        var sourceY = 0;

        if (sourceRatio > targetRatio) {
          sourceWidth = sourceHeight * targetRatio;
          sourceX = (image.naturalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = sourceWidth / targetRatio;
          sourceY = (image.naturalHeight - sourceHeight) / 2;
        }

        var canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        var context = canvas.getContext("2d");
        context.fillStyle = "#f5efe5";
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        return canvasToDataUrl(canvas);
      });
    }

    function createCoverImportControl(book) {
      var control = element("span", "cover-import-control");
      var input = document.createElement("input");
      input.className = "cover-file-input";
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp,image/gif,image/*";
      input.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (file) {
          importBookCover(book, file);
        }
        event.target.value = "";
      });

      var button = createButton("ghost-button cover-import-button", "更换封面");
      button.addEventListener("click", function () {
        input.click();
      });
      control.appendChild(button);
      control.appendChild(input);
      return control;
    }

    function importBookCover(book, file) {
      showToast("正在处理封面...");
      prepareCoverImage(file)
        .then(function (coverImage) {
          book.coverImage = coverImage;
          book.updatedAt = new Date().toISOString();
          if (state.data) state.data.books = state.books;
          renderBookView();
          scheduleSave();
          showToast("封面已更新。");
        })
        .catch(function () {
          showToast("请选择有效的图片文件。");
        });
    }

    function bookThemeTabs(book, limit) {
      var holder = element("span", "book-theme-tabs");
      var seen = Object.create(null);
      logic.getBookNotes(state, book.id, "all", "").some(function (note) {
        return noteThemes(note).some(function (theme) {
          if (seen[theme.id]) return false;
          seen[theme.id] = true;
          var tab = element("span", "book-theme-tab", theme.name);
          tab.style.setProperty("--theme-color", theme.color || book.coverColor || "#687767");
          holder.appendChild(tab);
          return holder.children.length >= limit;
        });
      });
      if (!holder.children.length) {
        var empty = element("span", "book-theme-tab muted", "待记录");
        empty.style.setProperty("--theme-color", book.coverColor || "#687767");
        holder.appendChild(empty);
      }
      return holder;
    }

    function createBookCard(book) {
      var notes = logic.getBookNotes(state, book.id, "all", "");
      var card = createButton("shelf-book", "");
      card.style.setProperty("--book-color", book.coverColor || "#687767");
      card.addEventListener("click", function () {
        goBook(book.id);
      });

      var spine = element("span", "book-spine", null);
      var content = element("span", "book-card-content", null);
      content.appendChild(element("strong", null, book.title));
      content.appendChild(element("span", "book-author", book.author || "未填写作者"));
      content.appendChild(element("span", "book-meta", notes.length + " 条记录 · 最近 " + (notes[0] ? noteUpdatedTime(notes[0]) : "尚未记录")));
      content.appendChild(bookThemeTabs(book, 3));
      card.appendChild(spine);
      card.appendChild(createBookCover(book, "shelf-cover"));
      card.appendChild(content);
      return card;
    }

    function renderBookView() {
      var book = activeBook();
      if (!book) {
        state.activeView = "shelf";
        renderShelfView();
        return;
      }

      var stage = byId("viewStage");
      clearElement(stage);
      stage.className = "view-stage book-stage";
      stage.appendChild(createBookHeader(book));
      stage.appendChild(createBookFilters());
      stage.appendChild(createRecordList(book));
    }

    function createBookHeader(book) {
      var header = element("header", "book-detail-header");
      var top = element("div", "detail-topline");
      var back = createButton("back-button", "返回书架");
      back.addEventListener("click", goShelf);
      top.appendChild(back);
      top.appendChild(createThemeButton());

      var title = element("div", "book-title-block");
      title.appendChild(element("p", "eyebrow", "Book Notes"));
      title.appendChild(element("h1", null, book.title));
      title.appendChild(element("p", null, book.author || "未填写作者"));
      title.appendChild(bookThemeTabs(book, 5));

      var actions = element("div", "book-actions");
      var search = element("input", "search-input");
      search.type = "search";
      search.placeholder = "在这本书里搜索";
      search.value = state.query || "";
      search.addEventListener("input", function (event) {
        state.query = event.target.value;
        renderBookRecordsOnly(book);
        scheduleSave();
      });
      var create = createButton("primary-action compact", "+ 新建记录");
      create.addEventListener("click", function () {
        createNote(book.id);
      });
      actions.appendChild(search);
      actions.appendChild(createCoverImportControl(book));
      actions.appendChild(create);

      var main = element("div", "book-detail-main");
      main.appendChild(createBookCover(book, "detail-cover"));
      main.appendChild(title);

      header.appendChild(top);
      header.appendChild(main);
      header.appendChild(actions);
      return header;
    }

    function createBookFilters() {
      var nav = element("nav", "filter-tabs");
      nav.setAttribute("aria-label", "记录类型筛选");
      BOOK_FILTERS.forEach(function (filter) {
        var button = createButton("filter-tab" + (state.bookFilter === filter.id ? " active" : ""), filter.label);
        button.addEventListener("click", function () {
          state.bookFilter = filter.id;
          renderBookView();
          scheduleSave();
        });
        nav.appendChild(button);
      });
      return nav;
    }

    function createRecordList(book) {
      var section = element("section", "record-list-shell");
      var list = element("div", "record-list");
      list.id = "recordList";
      section.appendChild(list);
      renderBookRecordsInto(list, book);
      return section;
    }

    function renderBookRecordsOnly(book) {
      var list = byId("recordList");
      if (!list) return;
      renderBookRecordsInto(list, book);
    }

    function renderBookRecordsInto(list, book) {
      clearElement(list);
      var notes = logic.getBookNotes(state, book.id, state.bookFilter, state.query);
      if (!notes.length) {
        list.appendChild(element("p", "empty-state", "这本书下还没有匹配的记录。"));
        return;
      }

      var fragment = document.createDocumentFragment();
      notes.forEach(function (note) {
        fragment.appendChild(createRecordCard(note));
      });
      list.appendChild(fragment);
    }

    function createRecordCard(note) {
      var card = createButton("record-card", "");
      card.addEventListener("click", function () {
        goEditor(note.id);
      });
      var head = element("span", "record-card-head");
      head.appendChild(element("span", "record-type", typeLabel(logic.getNoteType(note))));
      head.appendChild(element("span", "record-date", noteUpdatedTime(note)));
      var title = element("strong", null, note.title || "未命名记录");
      var summary = element("span", "record-summary", shortText(note.body || note.quote || logic.stripHtml(note.bodyHtml) || logic.stripHtml(note.quoteHtml), 92));
      title.textContent = logic.getNoteTitle(note);
      summary.textContent = shortText(logic.getNoteSummaryText(note), 92);
      card.appendChild(head);
      card.appendChild(title);
      card.appendChild(summary);
      return card;
    }

    function renderEditorView() {
      var note = activeNote();
      if (!note) {
        state.activeView = "shelf";
        renderShelfView();
        return;
      }
      if (!state.activeBookId) {
        state.activeBookId = logic.getNoteBookId(note);
      }

      var stage = byId("viewStage");
      clearElement(stage);
      stage.className = "view-stage editor-stage" + (state.editorFocusMode ? " focus-mode" : "");
      stage.appendChild(createEditorTopbar(note));
      stage.appendChild(createEditorLayout(note));
      bindEditorFields();
      updateEditorDerived(note);
    }

    function createEditorTopbar(note) {
      var topbar = element("header", "editor-topbar");
      var left = element("div", "editor-nav");
      var back = createButton("back-button", "返回记录列表");
      back.addEventListener("click", function () {
        goBook(logic.getNoteBookId(note));
      });
      left.appendChild(back);
      left.appendChild(element("span", "crumb", (noteBook(note) ? noteBook(note).title : "未关联书籍") + " / " + typeLabel(note.type)));

      var actions = element("div", "editor-actions");
      actions.appendChild(element("span", "save-status", "已保存"));
      actions.lastChild.id = "saveStatus";
      var focusButton = createButton("ghost-button focus-toggle", state.editorFocusMode ? "退出专注" : "专注");
      focusButton.addEventListener("click", function () {
        state.editorFocusMode = !state.editorFocusMode;
        renderEditorView();
        scheduleSave();
      });
      var preview = createButton("ghost-button secondary-action", "预览");
      preview.addEventListener("click", showPreview);
      var exportButton = createButton("ghost-button secondary-action", "导出");
      exportButton.addEventListener("click", downloadMarkdown);
      var deleteButton = createButton("ghost-button danger secondary-action", "删除");
      deleteButton.addEventListener("click", deleteActiveNote);
      actions.appendChild(focusButton);
      actions.appendChild(preview);
      actions.appendChild(exportButton);
      actions.appendChild(deleteButton);
      actions.appendChild(createThemeButton());

      topbar.appendChild(left);
      topbar.appendChild(actions);
      return topbar;
    }

    function createEditorLayout(note) {
      var layout = element("div", "editor-layout");
      var paper = element("article", "editor-paper");
      var isThought = logic.getNoteType(note) === "thought";
      if (isThought) {
        paper.classList.add("thought-paper");
      }
      var kicker = element("div", "paper-kicker");
      kicker.id = "paperKicker";

      var title = element("input", "rich-title");
      title.id = "noteTitle";
      title.value = logic.getNoteTitle(note);
      title.setAttribute("aria-label", "记录标题");

      var quoteBlock = isThought ? null : createRichBlock("摘录原文", "quoteHtml", logic.getNoteHtml(note, "quote"), "粘贴或写下这本书里击中你的句子");
      var bodyBlock = createRichBlock(isThought ? "感想正文" : "随笔正文", "bodyHtml", logic.getNoteHtml(note, "body"), isThought ? "写下此刻的想法、问题、联想或下一步行动" : "写下你的理解、联想、问题或复盘");

      var footer = element("div", "paper-footer");
      var chips = element("div", "chips");
      chips.id = "noteChips";
      var count = element("span", "word-count", "约 0 字");
      count.id = "wordCount";
      footer.appendChild(chips);
      footer.appendChild(count);

      paper.appendChild(kicker);
      paper.appendChild(title);
      if (quoteBlock) {
        paper.appendChild(quoteBlock);
      }
      paper.appendChild(bodyBlock);
      paper.appendChild(footer);

      layout.appendChild(paper);
      layout.appendChild(createMetadataPanel(note));
      return layout;
    }

    function createRichBlock(label, field, html, placeholder) {
      var block = element("section", "rich-block");
      block.appendChild(element("p", "rich-block-label", label));
      var editor = element("div", "rich-editor");
      editor.contentEditable = "true";
      editor.dataset.richEditor = "true";
      editor.dataset.field = field;
      editor.dataset.placeholder = placeholder;
      editor.setAttribute("role", "textbox");
      editor.setAttribute("aria-label", label);
      editor.innerHTML = html || "";
      block.appendChild(editor);
      return block;
    }

    function createMetadataPanel(note) {
      var panel = element("aside", "metadata-panel");
      panel.appendChild(element("p", "eyebrow", "Writing Cabin"));
      panel.appendChild(element("h2", null, "创作侧栏"));
      var status = element("div", "creation-status");
      status.appendChild(createStatusCard("字数", "sideWordCount", "约 " + countWords(note) + " 字"));
      status.appendChild(createStatusCard("更新", "sideUpdatedAt", noteUpdatedTime(note)));
      var bookCard = createStatusCard("书籍", "sideBookTitle", noteBook(note) ? noteBook(note).title : "未关联");
      bookCard.classList.add("creation-card-wide");
      status.appendChild(bookCard);
      panel.appendChild(status);
      panel.appendChild(element("p", "side-section-title", "元信息"));
      panel.appendChild(createSelectField("记录类型", "noteType", TYPE_OPTIONS, note.type));
      panel.appendChild(createSelectField("关联书籍", "bookSelect", state.books.map(function (book) {
        return { id: book.id, label: book.title };
      }), note.bookId));
      panel.appendChild(createInputField("页码 / 章节", "notePage", note.page));
      panel.appendChild(createInputField("主题", "themeInput", noteThemes(note).map(function (theme) { return theme.name; }).join("，")));
      panel.appendChild(createInputField("标签", "tagInput", (note.tags || []).join("，")));
      panel.appendChild(element("p", "side-section-title", "写作提示"));
      panel.appendChild(element("p", "hint-text", PROMPTS[Math.abs(note.id.length + note.title.length) % PROMPTS.length]));
      return panel;
    }

    function createStatusCard(label, id, value) {
      var card = element("div", "creation-card");
      card.appendChild(element("span", null, label));
      var strong = element("strong", null, value);
      strong.id = id;
      card.appendChild(strong);
      return card;
    }

    function createSelectField(label, id, options, value) {
      var field = element("label", "field");
      field.appendChild(element("span", null, label));
      var select = element("select");
      select.id = id;
      options.forEach(function (item) {
        var option = element("option", null, item.label);
        option.value = item.id;
        option.selected = item.id === value;
        select.appendChild(option);
      });
      field.appendChild(select);
      return field;
    }

    function createInputField(label, id, value) {
      var field = element("label", "field");
      field.appendChild(element("span", null, label));
      var input = element("input");
      input.id = id;
      input.value = value || "";
      field.appendChild(input);
      return field;
    }

    function bindEditorFields() {
      byId("noteTitle").addEventListener("input", function (event) {
        var note = activeNote();
        note.title = event.target.value;
        logic.touchNote(note);
        updateEditorDerived(note);
        scheduleSave();
      });

      ["noteType", "bookSelect"].forEach(function (id) {
        byId(id).addEventListener("change", function () {
          updateMetaFromFields(true);
        });
      });

      ["notePage", "themeInput", "tagInput"].forEach(function (id) {
        byId(id).addEventListener("input", function () {
          updateMetaFromFields(false);
        });
        byId(id).addEventListener("blur", function () {
          updateMetaFromFields(true);
        });
      });

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
    }

    function updateMetaFromFields(shouldRefreshDerived) {
      var note = activeNote();
      if (!note) return;
      var oldType = logic.getNoteType(note);
      logic.setNoteMeta(note, {
        type: byId("noteType").value,
        bookId: byId("bookSelect").value,
        page: byId("notePage").value,
        themeIds: parseTerms(byId("themeInput").value).map(ensureTheme),
        tags: parseTerms(byId("tagInput").value),
      });
      logic.touchNote(note);
      state.activeBookId = logic.getNoteBookId(note);
      pruneUnusedAutoThemes();
      if (shouldRefreshDerived && (oldType === "thought") !== (logic.getNoteType(note) === "thought")) {
        renderEditorView();
        scheduleSave();
        return;
      }
      if (shouldRefreshDerived) {
        updateEditorDerived(note);
      }
      scheduleSave();
    }

    function updateRichField(editor) {
      var note = activeNote();
      if (!note) return;
      var field = editor.dataset.field;
      logic.setNoteHtml(note, field === "quoteHtml" ? "quote" : "body", editor.innerHTML);
      logic.touchNote(note);
      updateEditorDerived(note);
      scheduleSave();
    }

    function createNoteChip(item, kind) {
      var chip = element("span", "chip " + kind, item.name);
      if (item.color) {
        chip.style.setProperty("--chip-color", item.color);
      }
      return chip;
    }

    function updateEditorDerived(note) {
      var book = noteBook(note);
      var themes = noteThemes(note);
      setText("paperKicker", [typeLabel(note.type), note.page || "未填写页码", book ? book.title : "未关联书籍"].join(" · "));
      var wcText = "约 " + countWords(note) + " 字";
      setText("wordCount", wcText);
      var wcEl = byId("wordCount");
      if (wcEl) {
        wcEl.classList.add("word-count-anim");
        wcEl.classList.add("wc-pulse");
        setTimeout(function () { wcEl.classList.remove("wc-pulse"); }, 200);
      }
      setText("sideWordCount", wcText);
      setText("sideBookTitle", book ? book.title : "未关联");
      setText("sideUpdatedAt", noteUpdatedTime(note));
      var chipBox = byId("noteChips");
      if (!chipBox) return;
      clearElement(chipBox);
      themes.forEach(function (theme) {
        chipBox.appendChild(createNoteChip(theme, "theme-chip"));
      });
      logic.getNoteTags(note).forEach(function (tag) {
        chipBox.appendChild(createNoteChip({ name: "#" + tag }, "tag-chip"));
      });
    }

    function createThemeButton() {
      var button = createButton("theme-toggle", document.documentElement.getAttribute("data-theme") === "dark" ? "☾" : "☀");
      button.setAttribute("aria-label", "切换暗黑模式");
      button.addEventListener("click", toggleTheme);
      return button;
    }

    function toggleTheme() {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        window.localStorage.setItem(THEME_KEY, "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        window.localStorage.setItem(THEME_KEY, "dark");
      }
      render();
    }

    function goShelf() {
      state.activeView = "shelf";
      state.activeBookId = "";
      state.bookFilter = "all";
      state.query = "";
      render();
    }

    function goBook(bookId) {
      state.activeBookId = bookId;
      state.activeView = "book";
      state.bookFilter = "all";
      state.query = "";
      render();
    }

    function goEditor(noteId) {
      state.activeNoteId = noteId;
      var note = activeNote();
      state.activeBookId = note ? logic.getNoteBookId(note) : state.activeBookId;
      state.activeView = "editor";
      render();
    }

    function createNote(bookId) {
      var now = new Date().toISOString();
      var note = {
        id: "note-" + Date.now().toString(36),
        type: "essay",
        title: "新的阅读记录",
        quote: "",
        quoteHtml: "",
        body: "",
        bodyHtml: "",
        bookId: bookId || state.activeBookId || state.books[0].id,
        themeIds: [],
        page: "",
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      logic.setNoteMeta(note, {
        type: note.type,
        bookId: note.bookId,
        page: note.page,
        themeIds: note.themeIds,
        tags: note.tags,
      });
      logic.setNoteHtml(note, "quote", note.quoteHtml);
      logic.setNoteHtml(note, "body", note.bodyHtml);
      state.notes.unshift(note);
      if (state.data) state.data.notes = state.notes;
      state.activeNoteId = note.id;
      state.activeBookId = logic.getNoteBookId(note);
      state.activeView = "editor";
      render();
      byId("noteTitle").focus();
      byId("noteTitle").select();
      showToast("已创建新的阅读记录。");
    }

    function deleteActiveNote() {
      if (state.notes.length <= 1) {
        showToast("至少保留一条记录。");
        return;
      }
      var note = activeNote();
      if (!note) return;
      var confirmed = window.confirm("确定删除这条记录吗？此操作不能撤销。");
      if (!confirmed) return;
      var bookId = logic.getNoteBookId(note);
      state.notes = state.notes.filter(function (item) {
        return item.id !== note.id;
      });
      if (state.data) state.data.notes = state.notes;
      state.activeNoteId = state.notes[0].id;
      state.activeBookId = bookId;
      state.activeView = "book";
      render();
      showToast("已删除记录。");
    }

    function showPreview() {
      var dialog = byId("previewDialog");
      byId("previewContent").textContent = logic.exportNoteMarkdown(activeNote(), state);
      if (dialog.showModal) {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "open");
      }
    }

    function downloadMarkdown() {
      var note = activeNote();
      var blob = new Blob([logic.exportNoteMarkdown(note, state)], { type: "text/markdown;charset=utf-8" });
      var anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = (note.title || "阅读记录").replace(/[\\/:*?"<>|]/g, "_") + ".md";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);
      showToast("已导出 Markdown。");
    }

    function showToast(message) {
      var toast = byId("toast");
      if (!toast) return;
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add("visible");
      toastTimer = window.setTimeout(function () {
        toast.classList.remove("visible");
      }, 2200);
    }

    function updateToolbarFromSelection() {
      window.cancelAnimationFrame(toolbarFrame);
      toolbarFrame = window.requestAnimationFrame(function () {
        var selection = window.getSelection();
        var toolbar = byId("floatingToolbar");
        if (!toolbar || !selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.toString().trim()) {
          hideToolbar();
          return;
        }

        var range = selection.getRangeAt(0);
        var container = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        var editor = container && container.closest("[data-rich-editor]");
        if (!editor || !document.contains(editor)) {
          hideToolbar();
          return;
        }

        var editorRect = editor.getBoundingClientRect();
        activeRichEditor = editor;
        savedSelection = range.cloneRange();
        var rect = range.getBoundingClientRect();
        if (
          !rect ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.bottom < editorRect.top ||
          rect.top > editorRect.bottom ||
          rect.right < editorRect.left ||
          rect.left > editorRect.right
        ) {
          hideToolbar();
          return;
        }
        var margin = 12;
        var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        var viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        toolbar.style.left = "0px";
        toolbar.style.top = "0px";
        toolbar.classList.add("visible");
        var toolbarWidth = toolbar.offsetWidth;
        var toolbarHeight = toolbar.offsetHeight;
        var left = rect.left + rect.width / 2 - toolbarWidth / 2;
        var top = rect.top - toolbarHeight - 10;
        var minLeft = Math.max(margin, editorRect.left + margin);
        var maxLeft = Math.min(viewportWidth - toolbarWidth - margin, editorRect.right - toolbarWidth - margin);

        left = Math.min(
          Math.max(minLeft, left),
          Math.max(minLeft, maxLeft),
        );

        if (top < Math.max(margin, editorRect.top + margin)) {
          top = rect.bottom + 10;
        }
        var minTop = Math.max(margin, editorRect.top + margin);
        var maxTop = Math.min(viewportHeight - toolbarHeight - margin, editorRect.bottom - toolbarHeight - margin);
        top = Math.min(
          Math.max(minTop, top),
          Math.max(minTop, maxTop),
        );

        toolbar.style.left = left + "px";
        toolbar.style.top = top + "px";
      });
    }

    function hideToolbar() {
      var toolbar = byId("floatingToolbar");
      if (toolbar) {
        toolbar.classList.remove("visible");
        toolbar.style.left = "-9999px";
        toolbar.style.top = "-9999px";
      }
    }

    function restoreSelection() {
      if (!savedSelection) return;
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }

    function isInsideTag(node, tagName) {
      while (node && node !== document.body) {
        if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === tagName) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    }

    function toggleInlineWrapper(tagName) {
      var selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      var range = selection.getRangeAt(0);
      var container = range.commonAncestorContainer;
      var startNode = container.nodeType === 1 ? container : container.parentNode;

      if (isInsideTag(startNode, tagName)) {
        var el = startNode;
        while (el && !(el.nodeType === 1 && el.tagName && el.tagName.toLowerCase() === tagName)) {
          el = el.parentNode;
        }
        if (el) {
          var parent = el.parentNode;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        }
      } else {
        var wrapper = document.createElement(tagName);
        try {
          wrapper.appendChild(range.extractContents());
          range.insertNode(wrapper);
          selection.removeAllRanges();
          var newRange = document.createRange();
          newRange.selectNodeContents(wrapper);
          selection.addRange(newRange);
        } catch (e) {
          // fallback: just wrap text content
        }
      }
    }

    function handleHighlight() {
      var selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      var range = selection.getRangeAt(0);
      var container = range.commonAncestorContainer;
      var startNode = container.nodeType === 1 ? container : container.parentNode;
      var existing = startNode.closest("mark");
      if (existing && existing.closest("[data-rich-editor]")) {
        var parent = existing.parentNode;
        while (existing.firstChild) {
          parent.insertBefore(existing.firstChild, existing);
        }
        parent.removeChild(existing);
        parent.normalize();
      } else {
        document.execCommand("hiliteColor", false, "rgba(178, 138, 85, 0.3)");
      }
    }

    function handleInlineCode() {
      toggleInlineWrapper("code");
    }

    function handleCodeBlock() {
      var selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      var range = selection.getRangeAt(0);
      var editor = (range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement
      ).closest("[data-rich-editor]");
      if (!editor) return;
      var text = selection.toString() || "code here";
      var pre = document.createElement("pre");
      var code = document.createElement("code");
      code.textContent = text;
      pre.appendChild(code);
      range.deleteContents();
      range.insertNode(pre);
      var br = document.createElement("br");
      pre.parentNode.insertBefore(br, pre.nextSibling);
      selection.removeAllRanges();
    }

    function clearAllFormatting(editor) {
      if (!editor) return;

      // 1. Use native removeFormat for standard inline styles (bold, italic, underline, strike)
      document.execCommand("removeFormat", false, null);

      // 2. Remove custom inline elements that removeFormat misses
      var customInlineSelectors = "mark, code, span[style]";
      editor.querySelectorAll(customInlineSelectors).forEach(function (el) {
        if (!editor.contains(el)) return;
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });

      // 3. Unwrap block-level elements to <p>
      var blockSelectors = "h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre";
      var processed = new Set();
      editor.querySelectorAll(blockSelectors).forEach(function (el) {
        if (!editor.contains(el) || processed.has(el)) return;
        processed.add(el);
        if (el.tagName === "UL" || el.tagName === "OL") {
          var items = Array.from(el.children);
          items.forEach(function (li) {
            if (processed.has(li)) return;
            processed.add(li);
            var p = document.createElement("p");
            while (li.firstChild) p.appendChild(li.firstChild);
            el.parentNode.insertBefore(p, el);
          });
          if (el.parentNode) el.parentNode.removeChild(el);
        } else {
          var p = document.createElement("p");
          while (el.firstChild) p.appendChild(el.firstChild);
          el.parentNode.insertBefore(p, el);
          el.parentNode.removeChild(el);
        }
      });

      // 4. Remove any leftover inline style attributes
      editor.querySelectorAll("[style]").forEach(function (el) {
        el.removeAttribute("style");
      });

      // 5. Remove empty paragraphs
      editor.querySelectorAll("p:empty").forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

      // 6. Normalize text nodes
      editor.normalize();
    }

    function triggerFormatFlash(editor) {
      if (!editor) return;
      editor.classList.remove("format-flash");
      void editor.offsetWidth;
      editor.classList.add("format-flash");
      setTimeout(function () { editor.classList.remove("format-flash"); }, 500);
    }

    function addToolRipple(event) {
      var button = event.currentTarget;
      var rect = button.getBoundingClientRect();
      var ripple = document.createElement("span");
      ripple.className = "tool-ripple";
      ripple.style.left = (event.clientX - rect.left - 4) + "px";
      ripple.style.top = (event.clientY - rect.top - 4) + "px";
      button.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 500);
    }

    function bindToolbar() {
      var toolbar = byId("floatingToolbar");
      if (!toolbar) return;
      hideToolbar();
      toolbar.addEventListener("mousedown", function (event) {
        event.preventDefault();
      });
      toolbar.querySelectorAll("[data-command]").forEach(function (button) {
        button.addEventListener("mousedown", addToolRipple);
        button.addEventListener("click", function () {
          restoreSelection();
          var command = button.dataset.command;

          // Resolve the correct editor: prefer selection context, then saved reference, then DOM fallback
          var editor = null;
          var sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            var container = sel.getRangeAt(0).commonAncestorContainer;
            var el = container.nodeType === 1 ? container : container.parentElement;
            if (el) editor = el.closest("[data-rich-editor]");
          }
          if (!editor) editor = activeRichEditor;
          if (!editor) {
            var focusEl = document.activeElement;
            if (focusEl && focusEl.closest) editor = focusEl.closest("[data-rich-editor]");
          }
          if (!editor) editor = document.querySelector("[data-rich-editor]");
          if (editor) activeRichEditor = editor;

          if (command === "inlineCode") {
            handleInlineCode();
          } else if (command === "codeBlock") {
            handleCodeBlock();
          } else if (command === "hiliteColor") {
            handleHighlight();
          } else if (command === "removeFormat") {
            clearAllFormatting(editor);
          } else {
            document.execCommand(command, false, button.dataset.value || null);
          }

          if (editor) {
            triggerFormatFlash(editor);
            updateRichField(editor);
            editor.focus();
          }
          updateToolbarFromSelection();
        });
      });
    }

    function bindGlobalEvents() {
      byId("closePreviewButton").addEventListener("click", function () {
        byId("previewDialog").close();
      });
      document.addEventListener("selectionchange", updateToolbarFromSelection);
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") hideToolbar();

        if (!(event.ctrlKey || event.metaKey)) return;
        var focusEl = document.activeElement;
        if (focusEl && (focusEl.tagName === "INPUT" || focusEl.tagName === "TEXTAREA" || focusEl.tagName === "SELECT")) return;
        if (!focusEl || !focusEl.closest("[data-rich-editor]")) return;

        var key = event.key.toLowerCase();
        var commandMap = { b: "bold", i: "italic", u: "underline" };
        var command = commandMap[key];
        if (command) {
          event.preventDefault();
          document.execCommand(command, false, null);
          if (activeRichEditor) {
            triggerFormatFlash(activeRichEditor);
            updateRichField(activeRichEditor);
          }
          updateToolbarFromSelection();
        }
      });
      document.addEventListener("scroll", hideToolbar, true);
    }

    document.addEventListener("DOMContentLoaded", function () {
      bindToolbar();
      bindGlobalEvents();
      render();
    });
  })();
}
