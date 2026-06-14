import { getBookPreview } from "../../view-models/workbenchViewModel.mjs";

export default function BookShelfCard({ book, notes, featured, selected, onSelect }) {
  const preview = getBookPreview(book, notes);
  const className = ["book-card", featured ? "featured" : "", selected ? "selected" : ""].filter(Boolean).join(" ");

  return (
    <button className={className} type="button" onClick={() => onSelect(book.id)}>
      <img className="book-cover" src={book.coverImage || "assets/covers/book-slow-reading.png"} alt={`${book.title} cover`} />
      <span className="card-meta">
        <span>{preview.statusLabel}</span>
        <span>{preview.noteCount} 条记录</span>
      </span>
      <strong>{book.title}</strong>
      <small>{book.author || "未填写作者"}</small>
      <p>{preview.summary}</p>
    </button>
  );
}
