function formatDate(value) {
  if (!value) return "未知日期";
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function noteTypeLabel(type) {
  if (type === "quote") return "摘录";
  if (type === "thought") return "感想";
  return "随笔";
}

function groupByDate(notes) {
  return notes.reduce((groups, note) => {
    const key = (note.updatedAt || note.createdAt || "").slice(0, 10) || "未知日期";
    if (!groups[key]) groups[key] = [];
    groups[key].push(note);
    return groups;
  }, {});
}

function BookCard({ book, notes, selected, onSelect }) {
  const bookNotes = notes.filter((note) => note.bookId === book.id);
  const latest = bookNotes[0];
  return (
    <button className={`book-card ${selected ? "selected" : ""}`} type="button" onClick={() => onSelect(book.id)}>
      <img className="book-cover" src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
      <span className="card-meta">{book.status === "finished" ? "已读" : book.status === "planned" ? "待读" : "正在读"} · {bookNotes.length} 条记录</span>
      <strong>{book.title}</strong>
      <small>{book.author || "未填写作者"}</small>
      <p>{latest ? (latest.bodyText || latest.quoteText || "还没有正文摘要。") : "还没有摘录或随笔。"}</p>
    </button>
  );
}

function NoteCard({ note, book, selected, onSelect, onOpenEditor }) {
  return (
    <article className={`note-card ${selected ? "selected" : ""}`}>
      <button type="button" onClick={() => onSelect(note.id)}>
        <span className="card-meta">{noteTypeLabel(note.type)} · {formatDate(note.updatedAt)} · {book ? book.title : "未关联书籍"}</span>
        <strong>{note.title}</strong>
        {note.quoteText ? <blockquote>{note.quoteText}</blockquote> : null}
        <p>{note.bodyText || "还没有写下正文。"}</p>
      </button>
      <button className="ghost-button compact" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
    </article>
  );
}

export default function Workbench({
  section,
  books,
  notes,
  themes,
  tags,
  activeBookId,
  activeNoteId,
  onBookSelect,
  onNoteSelect,
  onOpenEditor,
  onCreateBook,
  onCreateNote,
}) {
  const booksById = new Map(books.map((book) => [book.id, book]));
  const visibleNotes = notes.filter((note) => {
    if (section === "quotes") return note.type === "quote";
    if (section === "essays") return note.type === "essay" || note.type === "thought";
    if (section === "favorites") return note.favorite;
    return true;
  });

  return (
    <main className="workbench-main">
      <header className="main-header">
        <div>
          <p className="eyebrow">Reading Knowledge Desk</p>
          <h1>{section === "shelf" ? "我的书架" : section === "tags" ? "标签索引" : section === "timeline" ? "最近阅读" : "阅读记录"}</h1>
        </div>
        <div className="header-actions">
          <button className="secondary-button" type="button" onClick={onCreateBook}>新建书籍</button>
          <button className="primary-button" type="button" onClick={() => onCreateNote(activeBookId)}>新建记录</button>
        </div>
      </header>

      <section className="results" aria-live="polite">
        {section === "shelf" && books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            notes={notes}
            selected={book.id === activeBookId}
            onSelect={onBookSelect}
          />
        ))}

        {["quotes", "essays", "favorites"].includes(section) && visibleNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            book={booksById.get(note.bookId)}
            selected={note.id === activeNoteId}
            onSelect={onNoteSelect}
            onOpenEditor={onOpenEditor}
          />
        ))}

        {section === "tags" && (
          <div className="tag-grid">
            {themes.map((theme) => <span className="tag-chip theme" key={theme.id}>{theme.name}</span>)}
            {tags.map((tag) => <span className="tag-chip" key={tag.id}>#{tag.name}</span>)}
          </div>
        )}

        {section === "timeline" && Object.entries(groupByDate(notes)).map(([date, group]) => (
          <section className="timeline-group" key={date}>
            <h2>{date}</h2>
            {group.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                book={booksById.get(note.bookId)}
                selected={note.id === activeNoteId}
                onSelect={onNoteSelect}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </section>
        ))}

        {section !== "shelf" && visibleNotes.length === 0 && section !== "tags" && section !== "timeline" ? (
          <div className="empty-state">
            <strong>还没有匹配的记录。</strong>
            <span>新建摘录或随笔后，它会出现在这里。</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
