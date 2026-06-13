const legacy = require("../assets/app.js");

function emptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function textToDoc(value) {
  const text = String(value || "").trim();
  if (!text) return emptyDoc();

  return {
    type: "doc",
    content: text.split(/\n{2,}/).map((paragraph) => ({
      type: "paragraph",
      content: paragraph
        .split(/\n/)
        .flatMap((line, index) => {
          const nodes = [];
          if (index > 0) nodes.push({ type: "hardBreak" });
          if (line) nodes.push({ type: "text", text: line });
          return nodes;
        }),
    })),
  };
}

function htmlToDoc(html, fallbackText) {
  const source = String(html || "").trim();
  if (!source) return textToDoc(fallbackText);
  return textToDoc(legacy.stripHtml(source));
}

function normalizeIncomingState(input) {
  if (!input) return legacy.createInitialState();
  return legacy.normalizeImportedState(typeof input === "string" ? input : JSON.stringify(input));
}

function getLegacyDataset(input) {
  const state = normalizeIncomingState(input);
  const serialized = legacy.serializeState ? legacy.serializeState(state) : state;
  return {
    books: serialized.books || state.books || [],
    themes: serialized.themes || state.themes || [],
    notes: serialized.notes || state.notes || [],
  };
}

function getNoteDocs(note) {
  const quoteHtml = legacy.getNoteHtml(note, "quote");
  const bodyHtml = legacy.getNoteHtml(note, "body");
  const quoteText = legacy.getNoteText(note, "quote");
  const bodyText = legacy.getNoteText(note, "body");

  return {
    quoteDoc: htmlToDoc(quoteHtml, quoteText),
    bodyDoc: htmlToDoc(bodyHtml, bodyText),
    quoteText,
    bodyText,
    quoteHtml,
    bodyHtml,
  };
}

function slugForTag(name) {
  return "tag-" + Array.from(String(name || ""))
    .map((char) => char.charCodeAt(0).toString(36))
    .join("-");
}

module.exports = {
  legacy,
  emptyDoc,
  textToDoc,
  htmlToDoc,
  getLegacyDataset,
  getNoteDocs,
  slugForTag,
};
