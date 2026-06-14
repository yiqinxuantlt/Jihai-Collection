import { getSectionCopy } from "../../view-models/workbenchViewModel.mjs";

export default function WorkbenchHeader({ section, activeBookId, onCreateBook, onCreateNote }) {
  const copy = getSectionCopy(section);

  return (
    <header className="main-header workbench-header">
      <div className="header-copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="header-description">{copy.description}</p>
      </div>
      <div className="header-actions">
        <button className="secondary-button" type="button" onClick={onCreateBook}>新建书籍</button>
        <button className="primary-button" type="button" onClick={() => onCreateNote(activeBookId)}>新建记录</button>
      </div>
    </header>
  );
}
