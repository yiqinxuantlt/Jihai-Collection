export function createEmptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function splitTerms(value) {
  return String(value || "")
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSaveStateText(saveState) {
  if (saveState === "saving") return "保存中";
  if (saveState === "dirty") return "待保存";
  if (saveState === "error") return "保存失败";
  return "已保存";
}

export function getEditorTypeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

export function getBodyLabel(type) {
  return type === "thought" ? "感想正文" : "随笔正文";
}

export function getPaperKicker({ type, page, bookTitle }) {
  return `${getEditorTypeLabel(type)} · ${page || "未填写页码"} · ${bookTitle || "未关联书籍"}`;
}

export function showQuoteSection(type) {
  return type !== "thought";
}
