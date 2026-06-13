import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorToolbar from "./EditorToolbar.jsx";
import RichEditor from "./RichEditor.jsx";
import { patchNote } from "../api.js";

function emptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function terms(value) {
  return String(value || "")
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EditorPage({ note, books, themes, onBack, onSaved, onToggleFavorite }) {
  const [draft, setDraft] = useState(note);
  const [activeEditor, setActiveEditor] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const [dialog, setDialog] = useState(null);
  const saveTimer = useRef(null);
  const saveVersion = useRef(0);

  useEffect(() => {
    setDraft(note);
    setSaveState("saved");
  }, [note.id]);

  const scheduleSave = useCallback((next) => {
    setDraft(next);
    setSaveState("dirty");
    window.clearTimeout(saveTimer.current);
    const version = saveVersion.current + 1;
    saveVersion.current = version;
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await patchNote(next.id, {
          title: next.title,
          type: next.type,
          bookId: next.bookId,
          page: next.page,
          quoteDoc: next.quoteDoc,
          bodyDoc: next.bodyDoc,
          themeIds: next.themeIds,
          tags: next.tags,
          favorite: next.favorite,
        });
        if (saveVersion.current === version) {
          setSaveState("saved");
          onSaved(response.note);
        }
      } catch {
        if (saveVersion.current === version) setSaveState("error");
      }
    }, 500);
  }, [onSaved]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const updateDraft = useCallback((patch) => {
    scheduleSave({ ...draft, ...patch });
  }, [draft, scheduleSave]);

  const dialogs = useMemo(() => ({
    openLink(editor) {
      setActiveEditor(editor);
      setDialog({ type: "link", value: editor.getAttributes("link").href || "" });
    },
    openImage(editor) {
      setActiveEditor(editor);
      setDialog({ type: "image", value: "" });
    },
  }), []);

  const confirmDialog = () => {
    if (!activeEditor || !dialog) return;
    const value = String(dialog.value || "").trim();
    if (dialog.type === "link") {
      if (value) activeEditor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
      else activeEditor.chain().focus().unsetLink().run();
    }
    if (dialog.type === "image" && value) {
      activeEditor.chain().focus().setImage({ src: value }).run();
    }
    setDialog(null);
  };

  const currentBook = books.find((book) => book.id === draft.bookId);
  const saveText = saveState === "saving" ? "保存中" : saveState === "dirty" ? "待保存" : saveState === "error" ? "保存失败" : "已保存";

  return (
    <main className="editor-stage">
      <header className="editor-topbar">
        <button className="back-button" type="button" onClick={onBack}>‹ 返回记录列表</button>
        <span className="crumb">{currentBook ? currentBook.title : "未关联书籍"} / {draft.type === "quote" ? "摘录" : draft.type === "thought" ? "感想" : "随笔"}</span>
        <span className={`save-pill ${saveState}`}>{saveText}</span>
        <button className={`secondary-button ${draft.favorite ? "active" : ""}`} type="button" onClick={() => onToggleFavorite(draft.id, !draft.favorite)}>
          {draft.favorite ? "已收藏" : "收藏"}
        </button>
        <a className="secondary-button" href={`/api/notes/${draft.id}/export.md`} target="_blank" rel="noreferrer">导出</a>
      </header>

      <div className="editor-layout">
        <article className="editor-paper">
          <EditorToolbar editor={activeEditor} dialogs={dialogs} />
          <p className="paper-kicker">{draft.type === "quote" ? "摘录" : "随笔"} · {draft.page || "未填写页码"} · {currentBook ? currentBook.title : "未关联"}</p>
          <input className="title-input" aria-label="记录标题" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />

          {draft.type !== "thought" ? (
            <section className="rich-block">
              <p className="block-label">摘录原文</p>
              <RichEditor
                className="quote-editor"
                placeholder="粘贴或写下这本书里击中你的句子"
                value={draft.quoteDoc || emptyDoc()}
                onChange={(doc) => updateDraft({ quoteDoc: doc })}
                onReady={setActiveEditor}
              />
            </section>
          ) : null}

          <section className="rich-block">
            <p className="block-label">{draft.type === "thought" ? "感想正文" : "随笔正文"}</p>
            <RichEditor
              placeholder="写下你的理解、联想、问题或复盘"
              value={draft.bodyDoc || emptyDoc()}
              onChange={(doc) => updateDraft({ bodyDoc: doc })}
              onReady={setActiveEditor}
            />
          </section>
        </article>

        <aside className="metadata-panel">
          <h2>创作侧栏</h2>
          <label className="field">
            <span>书籍</span>
            <select value={draft.bookId || ""} onChange={(event) => updateDraft({ bookId: event.target.value })}>
              {books.map((book) => <option value={book.id} key={book.id}>{book.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>所属目录</span>
            <select value={draft.type} onChange={(event) => updateDraft({ type: event.target.value })}>
              <option value="quote">摘录</option>
              <option value="essay">随笔</option>
              <option value="thought">感想</option>
            </select>
          </label>
          <label className="field">
            <span>页码 / 章节</span>
            <input value={draft.page || ""} onChange={(event) => updateDraft({ page: event.target.value })} />
          </label>
          <label className="field">
            <span>标签</span>
            <input value={(draft.tags || []).join("，")} onChange={(event) => updateDraft({ tags: terms(event.target.value) })} />
          </label>
          <label className="field">
            <span>关键词</span>
            <select multiple value={draft.themeIds || []} onChange={(event) => updateDraft({ themeIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
              {themes.map((theme) => <option value={theme.id} key={theme.id}>{theme.name}</option>)}
            </select>
          </label>
          <p className="hint-text">它能和哪本书、哪个主题产生连接？</p>
        </aside>
      </div>

      {dialog ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="mini-dialog" role="dialog" aria-modal="true">
            <strong>{dialog.type === "link" ? "插入链接" : "插入图片"}</strong>
            <input autoFocus value={dialog.value} onChange={(event) => setDialog({ ...dialog, value: event.target.value })} placeholder="https://" />
            <div>
              <button className="secondary-button" type="button" onClick={() => setDialog(null)}>取消</button>
              <button className="primary-button" type="button" onClick={confirmDialog}>确定</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
