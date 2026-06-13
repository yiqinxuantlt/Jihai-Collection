const test = require("node:test");
const assert = require("node:assert/strict");

test("editor helpers normalize tags and derive display copy", async () => {
  const {
    createEmptyDoc,
    splitTerms,
    getSaveStateText,
    getEditorTypeLabel,
    getBodyLabel,
    getPaperKicker,
    showQuoteSection,
  } = await import("../src/view-models/editorViewModel.mjs");

  assert.deepEqual(createEmptyDoc(), { type: "doc", content: [{ type: "paragraph" }] });
  assert.deepEqual(splitTerms("方法论，问题意识, 复盘"), ["方法论", "问题意识", "复盘"]);
  assert.equal(getSaveStateText("saving"), "保存中");
  assert.equal(getSaveStateText("dirty"), "待保存");
  assert.equal(getSaveStateText("error"), "保存失败");
  assert.equal(getSaveStateText("saved"), "已保存");
  assert.equal(getEditorTypeLabel("quote"), "摘录");
  assert.equal(getEditorTypeLabel("thought"), "感想");
  assert.equal(getEditorTypeLabel("essay"), "随笔");
  assert.equal(getBodyLabel("thought"), "感想正文");
  assert.equal(getBodyLabel("essay"), "随笔正文");
  assert.equal(
    getPaperKicker({ type: "quote", page: "第 23 页", bookTitle: "如何阅读一本书" }),
    "摘录 · 第 23 页 · 如何阅读一本书",
  );
  assert.equal(
    getPaperKicker({ type: "thought", page: "", bookTitle: "" }),
    "感想 · 未填写页码 · 未关联书籍",
  );
  assert.equal(showQuoteSection("thought"), false);
  assert.equal(showQuoteSection("quote"), true);
});
