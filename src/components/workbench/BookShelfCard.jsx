import { getBookPreview } from "../../view-models/workbenchViewModel.mjs";

export default function BookShelfCard({ book, notes, selected, onSelect }) {
  const preview = getBookPreview(book, notes);

  return (
    <button className={`book-card ${selected ? "selected" : ""}`} type="button" onClick={() => onSelect(book.id)}>
      <img className="book-cover" src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
      <span className="card-meta">{preview.statusLabel} · {preview.noteCount} 条记录</span>
      <strong>{book.title}</strong>
      <small>{book.author || "未填写作者"}</small>
      <p>{preview.summary}</p>
    </button>
  );
}
