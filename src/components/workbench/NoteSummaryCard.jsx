import { getNotePreview } from "../../view-models/workbenchViewModel.mjs";

export default function NoteSummaryCard({ note, book, selected, onSelect, onOpenEditor }) {
  const preview = getNotePreview(note, book);

  return (
    <article className={`note-card ${selected ? "selected" : ""}`}>
      <button type="button" onClick={() => onSelect(note.id)}>
        <span className="card-meta">{preview.meta}</span>
        <strong>{note.title}</strong>
        {preview.quote ? <blockquote>{preview.quote}</blockquote> : null}
        <p>{preview.summary}</p>
      </button>
      <button className="ghost-button compact" type="button" onClick={() => onOpenEditor(note.id)}>打开编辑器</button>
    </article>
  );
}
