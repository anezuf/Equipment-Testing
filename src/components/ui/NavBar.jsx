import { memo } from "react";
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
          <button
            className="btn-file-pill btn-file-pdf"
            onClick={onExportPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 20,
              border: "1.5px solid #FECACA",
              background: "#FEF2F2",
              color: "#334155",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 3v7M5 8l3 3 3-3" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="btn-file-pill-label">Отчёт</span>
            <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(NavBar);
