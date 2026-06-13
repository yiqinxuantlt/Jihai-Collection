function plainText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function markText(text, marks) {
  return (marks || []).reduce((current, mark) => {
    if (mark.type === "bold") return `**${current}**`;
    if (mark.type === "italic") return `*${current}*`;
    if (mark.type === "strike") return `~~${current}~~`;
    if (mark.type === "code") return `\`${current}\``;
    if (mark.type === "link") return `[${current}](${mark.attrs && mark.attrs.href || ""})`;
    return current;
  }, text);
}

function inlineContent(content) {
  return (content || []).map((node) => {
    if (node.type === "text") return markText(node.text || "", node.marks);
    if (node.type === "hardBreak") return "\n";
    if (node.type === "image") return `![图片](${node.attrs && node.attrs.src || ""})`;
    return docToMarkdown(node);
  }).join("");
}

function tableMarkdown(node) {
  const rows = (node.content || []).map((row) => (row.content || []).map((cell) => {
    return plainText(inlineContent((cell.content || []).flatMap((child) => child.content || [])));
  }));

  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ""));
  const header = normalized[0];
  const divider = header.map(() => "---");
  return [header, divider].concat(normalized.slice(1))
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
}

function docToMarkdown(node) {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(docToMarkdown).filter(Boolean).join("\n\n");

  switch (node.type) {
    case "doc":
      return docToMarkdown(node.content || []);
    case "paragraph":
      return inlineContent(node.content || []);
    case "heading":
      return `${"#".repeat(Math.min(node.attrs && node.attrs.level || 2, 6))} ${inlineContent(node.content || [])}`;
    case "bulletList":
      return (node.content || []).map((item) => `- ${docToMarkdown(item).replace(/\n/g, "\n  ")}`).join("\n");
    case "orderedList":
      return (node.content || []).map((item, index) => `${index + 1}. ${docToMarkdown(item).replace(/\n/g, "\n   ")}`).join("\n");
    case "listItem":
      return docToMarkdown(node.content || []).replace(/\n\n/g, "\n");
    case "blockquote":
      return docToMarkdown(node.content || []).split("\n").map((line) => `> ${line}`).join("\n");
    case "codeBlock":
      return `\`\`\`\n${inlineContent(node.content || [])}\n\`\`\``;
    case "horizontalRule":
      return "---";
    case "table":
      return tableMarkdown(node);
    case "tableRow":
    case "tableCell":
    case "tableHeader":
      return docToMarkdown(node.content || []);
    case "text":
      return markText(node.text || "", node.marks);
    default:
      return inlineContent(node.content || []);
  }
}

function recordMarkdown(note, context) {
  const book = context.booksById.get(note.bookId);
  const themes = (note.themeIds || []).map((id) => context.themesById.get(id)).filter(Boolean);
  const lines = [
    `# ${note.title || "未命名记录"}`,
    "",
    `类型：${note.type === "quote" ? "摘录" : note.type === "thought" ? "感想" : "随笔"}`,
    `关联书籍：${book ? book.title : "未关联"}`,
    `页码/章节：${note.page || "未填写"}`,
    `主题：${themes.length ? themes.map((theme) => theme.name).join("、") : "未填写"}`,
    `标签：${note.tags && note.tags.length ? note.tags.join("、") : "未填写"}`,
  ];

  const quote = docToMarkdown(note.quoteDoc).trim();
  const body = docToMarkdown(note.bodyDoc).trim();
  if (note.type !== "thought" && quote) {
    lines.push("", "## 摘录", "", quote);
  }
  if (body) {
    lines.push("", note.type === "thought" ? "## 感想正文" : "## 随笔正文", "", body);
  }
  return lines.join("\n").trim() + "\n";
}

module.exports = {
  docToMarkdown,
  recordMarkdown,
};
