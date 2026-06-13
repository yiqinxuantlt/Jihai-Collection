function typeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

export default function MetadataPanel({ book, note, themes, onOpenEditor, onPatchNote }) {
  if (!book && !note) {
    return (
      <aside className="detail-panel">
        <section className="panel-section detail-empty">
          <p className="panel-label">Workbench Context</p>
          <h2>当前上下文</h2>
          <p className="muted">选中一本书或一条记录后，这里会显示相关信息。</p>
        </section>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      {book ? (
        <section className="panel-section panel-section-book">
          <p className="panel-label">Current Book</p>
          <h2>当前书籍</h2>
          <div className="book-summary">
            <img src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
            <div className="book-summary-copy">
              <strong>{book.title}</strong>
              <span>{book.author || "未填写作者"}</span>
            </div>
          </div>
        </section>
      ) : null}

      {note ? (
        <section className="panel-section panel-section-note">
          <p className="panel-label">Side Note</p>
          <h2>选中记录</h2>
          <span className="record-type">{typeLabel(note.type)}</span>
          <strong>{note.title}</strong>
          <p className="panel-note-body">{note.bodyText || note.quoteText || "还没有正文。"}</p>
          <div className="tag-row">
            {(note.themeIds || []).map((id) => {
              const theme = themes.find((item) => item.id === id);
              return theme ? <span className="tag-chip theme" key={id}>{theme.name}</span> : null;
            })}
            {(note.tags || []).map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}
          </div>
          <div className="panel-actions">
            <button className={`secondary-button ${note.favorite ? "active" : ""}`} type="button" onClick={() => onPatchNote(note.id, { favorite: !note.favorite })}>
              {note.favorite ? "已收藏" : "收藏"}
            </button>
            <button className="primary-button" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
