import { useCallback, useEffect, useMemo, useState } from "react";
import { createBook, createNote, getBootstrap, importLegacyData, patchNote } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import Workbench from "./components/Workbench.jsx";
import MetadataPanel from "./components/MetadataPanel.jsx";
import EditorPage from "./components/EditorPage.jsx";

function defaultBookId(books) {
  return books[0] ? books[0].id : "";
}

function defaultNoteId(notes) {
  return notes[0] ? notes[0].id : "";
}

export default function App() {
  const [data, setData] = useState({ books: [], notes: [], themes: [], tags: [] });
  const [activeSection, setActiveSection] = useState("shelf");
  const [activeBookId, setActiveBookId] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [mode, setMode] = useState("workbench");
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [theme, setTheme] = useState(() => localStorage.getItem("reading-notes-theme") || "light");
  const [legacyImport, setLegacyImport] = useState(null);

  const refresh = useCallback(async () => {
    setStatus({ loading: true, error: "" });
    try {
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      const firstNoteId = defaultNoteId(bootstrap.notes);
      const firstNote = bootstrap.notes.find((note) => note.id === firstNoteId);
      setActiveNoteId((current) => current || firstNoteId);
      setActiveBookId((current) => current || (firstNote && firstNote.bookId) || defaultBookId(bootstrap.books));
      setStatus({ loading: false, error: "" });
    } catch {
      setStatus({ loading: false, error: "本地数据服务未启动。" });
    }
  }, []);

  useEffect(() => {
    refresh();
    try {
      const raw = localStorage.getItem("reading-notes-app:v1");
      if (raw) setLegacyImport(raw);
    } catch {
      setLegacyImport(null);
    }
  }, [refresh]);

  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("reading-notes-theme", theme);
  }, [theme]);

  const activeBook = useMemo(() => data.books.find((book) => book.id === activeBookId) || data.books[0] || null, [data.books, activeBookId]);
  const activeNote = useMemo(() => data.notes.find((note) => note.id === activeNoteId) || data.notes[0] || null, [data.notes, activeNoteId]);

  const updateNoteInState = useCallback((note) => {
    setData((current) => ({
      ...current,
      notes: current.notes.map((item) => item.id === note.id ? note : item).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      tags: Array.from(new Map([...(current.tags || []), ...(note.tags || []).map((name) => ({ id: `tag-${name}`, name }))].map((tag) => [tag.name, tag])).values()),
    }));
    setActiveNoteId(note.id);
  }, []);

  const handleCreateBook = async () => {
    const response = await createBook({ title: "未命名书籍", author: "" });
    setData((current) => ({ ...current, books: [response.book, ...current.books] }));
    setActiveBookId(response.book.id);
    setActiveSection("shelf");
  };

  const handleBookSelect = (bookId) => {
    setActiveBookId(bookId);
    const firstBookNote = data.notes.find((note) => note.bookId === bookId);
    if (firstBookNote) setActiveNoteId(firstBookNote.id);
  };

  const handleCreateNote = async (bookId) => {
    const response = await createNote({
      title: "新的阅读记录",
      type: "essay",
      bookId: bookId || activeBookId || defaultBookId(data.books),
    });
    setData((current) => ({ ...current, notes: [response.note, ...current.notes] }));
    setActiveNoteId(response.note.id);
    setActiveBookId(response.note.bookId);
    setMode("editor");
  };

  const handlePatchNote = async (noteId, patch) => {
    const response = await patchNote(noteId, patch);
    updateNoteInState(response.note);
  };

  const handleImportLegacy = async () => {
    if (!legacyImport) return;
    const parsed = JSON.parse(legacyImport);
    const imported = await importLegacyData(parsed);
    setData(imported);
    setActiveBookId(defaultBookId(imported.books));
    setActiveNoteId(defaultNoteId(imported.notes));
    setLegacyImport(null);
  };

  if (status.loading) {
    return <div className="boot-state">正在打开本地知识库...</div>;
  }

  if (status.error) {
    return (
      <div className="boot-state">
        <strong>{status.error}</strong>
        <span>请通过新的本地服务启动应用。</span>
      </div>
    );
  }

  if (mode === "editor" && activeNote) {
    return (
      <EditorPage
        note={activeNote}
        books={data.books}
        themes={data.themes}
        onBack={() => setMode("workbench")}
        onSaved={updateNoteInState}
        onToggleFavorite={handlePatchNote}
      />
    );
  }

  return (
    <div className="app-shell">
      {legacyImport ? (
        <div className="import-banner">
          <span>检测到旧版浏览器数据，可以导入到新的本地数据库。</span>
          <button className="primary-button" type="button" onClick={handleImportLegacy}>导入旧数据</button>
          <button className="secondary-button" type="button" onClick={() => setLegacyImport(null)}>稍后</button>
        </div>
      ) : null}
      <div className="workbench-shell">
        <Sidebar
          activeSection={activeSection}
          counts={{ books: data.books.length, notes: data.notes.length }}
          theme={theme}
          onSectionChange={setActiveSection}
          onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        />
        <Workbench
          section={activeSection}
          books={data.books}
          notes={data.notes}
          themes={data.themes}
          tags={data.tags}
          activeBookId={activeBook ? activeBook.id : ""}
          activeNoteId={activeNote ? activeNote.id : ""}
          onBookSelect={handleBookSelect}
          onNoteSelect={setActiveNoteId}
          onOpenEditor={(noteId) => {
            setActiveNoteId(noteId);
            setMode("editor");
          }}
          onCreateBook={handleCreateBook}
          onCreateNote={handleCreateNote}
        />
        <MetadataPanel
          book={activeBook}
          note={activeNote}
          themes={data.themes}
          onOpenEditor={(noteId) => {
            setActiveNoteId(noteId);
            setMode("editor");
          }}
          onPatchNote={handlePatchNote}
        />
      </div>
    </div>
  );
}
