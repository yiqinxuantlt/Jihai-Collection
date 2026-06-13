import WorkbenchHeader from "./workbench/WorkbenchHeader.jsx";
import BookShelfCard from "./workbench/BookShelfCard.jsx";
import NoteSummaryCard from "./workbench/NoteSummaryCard.jsx";
import { getVisibleNotes, groupNotesByDate } from "../view-models/workbenchViewModel.mjs";

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
  const visibleNotes = getVisibleNotes(section, notes);
  const timelineGroups = groupNotesByDate(notes);

  return (
    <main className="workbench-main">
      <WorkbenchHeader
        section={section}
        activeBookId={activeBookId}
        onCreateBook={onCreateBook}
        onCreateNote={onCreateNote}
      />

      <section className="results" aria-live="polite">
        {section === "shelf" && books.map((book) => (
          <BookShelfCard
            key={book.id}
            book={book}
            notes={notes}
            selected={book.id === activeBookId}
            onSelect={onBookSelect}
          />
        ))}

        {["quotes", "essays", "favorites"].includes(section) && visibleNotes.map((note) => (
          <NoteSummaryCard
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

        {section === "timeline" && timelineGroups.map(({ date, notes: group }) => (
          <section className="timeline-group" key={date}>
            <h2>{date}</h2>
            {group.map((note) => (
              <NoteSummaryCard
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
