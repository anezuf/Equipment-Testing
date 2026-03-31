import { memo, useRef } from "react";
import Logo from "../Logo";
import { B } from "../../constants";

function NavBar({
  view,
  setView,
  vendorsCount,
  onExport,
  onImport,
  onReset,
  onExportPdf,
  onBackupSession,
  onRestoreBackupFileChange,
}) {
  const navBtn = (label, v) => (
    <button
      className="btn-nav"
      onClick={() => setView(v)}
      style={{
        padding: "10px 16px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        background: view === v ? B.blue : "transparent",
        color: view === v ? "#fff" : B.steel,
        fontSize: 13,
        fontWeight: 600,
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  void vendorsCount;
  void onExport;
  void onImport;
  void onReset;

  const restoreBackupInputRef = useRef(null);

  return (
    <div
      data-nav=""
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        background: "#fff",
        borderBottom: `1px solid ${B.border}`,
        position: "sticky",
        top: 0,
        zIndex: 50,
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div
        className="nav-left-group"
        style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo h={26} />
          <div style={{ width: 1, height: 22, background: B.border }} />
          <span
            className="nav-nits"
            style={{ fontSize: 13, fontWeight: 700, color: B.graphite, letterSpacing: "0.5px" }}
          >
            НИТС
          </span>
        </div>
        <div className="nav-tabs" style={{ display: "flex", gap: 3, background: "#F1F5F9", borderRadius: 20, padding: 2 }}>
          <div
            style={{
              overflow: "hidden",
              maxWidth: view === "techspecs" || view === "editor" ? 150 : 0,
              opacity: view === "techspecs" || view === "editor" ? 1 : 0,
              transition: "max-width 0.3s ease, opacity 0.3s ease",
              display: "inline-flex",
              pointerEvents: view === "techspecs" || view === "editor" ? "auto" : "none",
            }}
          >
            {navBtn("Редактор", "editor")}
          </div>
          {navBtn("Тех. условия", "techspecs")}
          {navBtn("Оценка", "input")}
          {navBtn("Дашборд", "dashboard")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {view === "dashboard" && (
          <>
            <input
              ref={restoreBackupInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={onRestoreBackupFileChange}
            />
            <button type="button" className="btn-action btn-action-xlsx-export" onClick={onBackupSession} title="Бэкап (JSON)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 3v7M5 8l3 3 3-3" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="btn-action-format btn-action-format-xlsx">JSON</span>
            </button>
            <button
              type="button"
              className="btn-action btn-action-xlsx-import"
              onClick={() => restoreBackupInputRef.current?.click()}
              title="Загрузить (JSON)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 10V3M5 6l3-3 3 3" stroke="#2F9AFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="btn-action-format btn-action-format-xlsx-import">JSON</span>
            </button>
            <button type="button" className="btn-action btn-action-pdf" onClick={onExportPdf}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 3v7M5 8l3 3 3-3" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="btn-action-label">Отчет</span>
              <span className="btn-action-format btn-action-format-pdf">PDF</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(NavBar);
