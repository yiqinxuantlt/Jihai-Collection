import { getCountSummary } from "../view-models/workbenchViewModel.mjs";

const navItems = [
  { id: "shelf", label: "我的书架", meta: "按书籍组织" },
  { id: "quotes", label: "全部摘录", meta: "可复读的原文" },
  { id: "essays", label: "随笔", meta: "由摘录生长" },
  { id: "favorites", label: "收藏", meta: "重要记录" },
  { id: "tags", label: "标签", meta: "主题索引" },
  { id: "timeline", label: "最近阅读", meta: "回到现场" },
];

export default function Sidebar({ activeSection, onSectionChange, counts, theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">墨</div>
        <div>
          <strong>墨读札记</strong>
          <span>阅读随笔工作台</span>
        </div>
      </div>
      <nav className="nav" aria-label="工作台导航">
        {navItems.map((item) => (
          <button
            className={`nav-item ${activeSection === item.id ? "selected" : ""}`}
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.meta}</small>
          </button>
        ))}
      </nav>
      <footer className="sidebar-footer">
        <span>{getCountSummary(counts)}</span>
        <span className="sidebar-actions">
          <a className="secondary-button tiny" href="/api/export" target="_blank" rel="noreferrer">备份</a>
          <button className="icon-button" type="button" onClick={onToggleTheme} title="切换明暗主题">
            {theme === "dark" ? "浅" : "暗"}
          </button>
        </span>
      </footer>
    </aside>
  );
}
