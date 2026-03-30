import AutoSizeTextarea from "../../components/AutoSizeTextarea";
import { B, VC } from "../../constants";
import { fmt } from "../../utils";

export default function TechSpecs({
  techSpecs,
  setTechSpecs,
  techSpecsSnapshot,
  techSpecsEditMode,
  setTechSpecsEditMode,
  setShowApplyConfirm,
  exportTechSpecs,
  importTechSpecs,
  EQ_TYPES,
  switchEqType,
  eqType,
  moveTechSection,
  moveTechItem,
}) {
  void fmt;

  return (
    <div className="view-section-pad" style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8, paddingBottom: 12, borderBottom: `1px solid ${B.border}` }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: B.graphite }}>Технические условия (Стандарт качества)</div>
          <div style={{ fontSize: 12, color: B.steel, marginTop: 2 }}>Критерии подбора оборудования — только для справки, не влияет на расчёты</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {techSpecsEditMode ? (
            <>
              <button className="btn-secondary" onClick={() => { setTechSpecs(techSpecsSnapshot.current); setTechSpecsEditMode(false); }} style={{ padding: "6px 14px", borderRadius: 10, border: `1.5px solid ${B.border}`, background: "#fff", color: B.steel, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                Отменить
              </button>
              <button className="btn-secondary" onClick={() => setShowApplyConfirm(true)} style={{ padding: "6px 14px", borderRadius: 10, border: `1.5px solid ${B.blue}`, background: "#fff", color: B.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Применить
              </button>
              <button className="btn-secondary" onClick={exportTechSpecs} style={{ padding: "6px 14px", borderRadius: 10, border: `1.5px solid ${B.border}`, background: "#fff", color: B.steel, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Сохранить
              </button>
              <button className="btn-secondary" onClick={importTechSpecs} style={{ padding: "6px 14px", borderRadius: 10, border: `1.5px solid ${B.border}`, background: "#fff", color: B.steel, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Загрузить
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => { techSpecsSnapshot.current = JSON.parse(JSON.stringify(techSpecs)); setTechSpecsEditMode(true); }} style={{ padding: "6px 14px", borderRadius: 10, border: `1.5px solid ${B.border}`, background: "#fff", color: B.steel, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Редактировать
            </button>
          )}
        </div>
      </div>
      {!techSpecsEditMode && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          {EQ_TYPES.map((t) =>
            <button key={t} onClick={() => switchEqType(t)} style={{ padding: "6px 16px", borderRadius: 12, border: `1.5px solid ${eqType === t ? B.blue : B.border}`, background: eqType === t ? "#EFF6FF" : "#fff", color: eqType === t ? B.blue : B.steel, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {t === "стойка" ? "Стойка" : "PDU"}
            </button>,
          )}
        </div>
      )}
      {techSpecsEditMode && <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
        <button className="btn-add-vendor" onClick={() => setTechSpecs((p) => [...p, { n: "Новый раздел", items: [{ n: "Новый параметр", n2: "" }] }])} style={{ padding: "6px 14px", borderRadius: 12, border: "1.5px dashed #CBD5E1", background: "#F8FAFC", color: "#7B97B2", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>+ Раздел</button>
      </div>}
      {techSpecs.map((sec, si) =>
        <div key={si} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: B.graphite, borderRadius: "12px 12px 0 0", borderLeft: `3px solid ${VC[si % VC.length]}` }}>
            {techSpecsEditMode && (
              <div style={{ display: "flex", gap: 3, marginRight: 4, flexShrink: 0 }}>
                <button type="button" className="btn-icon" onClick={() => moveTechSection(si, -1)} disabled={si === 0} style={{ width: 20, height: 20, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: si === 0 ? "not-allowed" : "pointer", fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: si === 0 ? 0.3 : 1, padding: 0 }}>↑</button>
                <button type="button" className="btn-icon" onClick={() => moveTechSection(si, 1)} disabled={si === techSpecs.length - 1} style={{ width: 20, height: 20, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: si === techSpecs.length - 1 ? "not-allowed" : "pointer", fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: si === techSpecs.length - 1 ? 0.3 : 1, padding: 0 }}>↓</button>
              </div>
            )}
            <input readOnly={!techSpecsEditMode} value={sec.n} onChange={(e) => setTechSpecs((p) => p.map((s, i) => i === si ? { ...s, n: e.target.value } : s))} style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, outline: "none", minWidth: 0, pointerEvents: techSpecsEditMode ? "auto" : "none" }} />
            {techSpecsEditMode && techSpecs.length > 1 && <button type="button" className="btn-icon-close" onClick={() => setTechSpecs((p) => p.filter((_, i) => i !== si))} style={{ background: "none", border: "none", color: "#ffffff88", cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>×</button>}
          </div>
          <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: `1px solid ${B.border}`, borderTop: "none" }}>
            <div style={{ display: "flex", padding: "6px 16px", background: "#F8FAFC", borderBottom: `1px solid ${B.border}` }}>
              <div style={{ flex: "0 0 40%", fontSize: 10, fontWeight: 700, color: B.steel, textTransform: "uppercase", letterSpacing: "0.5px" }}>Параметр</div>
              <div style={{ flex: "1 1 60%", fontSize: 10, fontWeight: 700, color: B.steel, textTransform: "uppercase", letterSpacing: "0.5px", paddingLeft: 16 }}>Требование</div>
            </div>
            {sec.items.map((it, ii) =>
              <div key={ii} className="ts-item-row" style={{ display: "flex", alignItems: "stretch", gap: 8, padding: "0 16px", minHeight: 40, borderTop: ii ? "1px solid #F1F5F9" : "none" }}>
                <div className="ts-param-col" style={{ position: "relative", flex: "0 0 40%", display: "flex", alignItems: "flex-start", padding: "8px 0", borderRight: `1px solid ${B.border}`, paddingRight: 12 }}>
                  {techSpecsEditMode && (
                    <div style={{ display: "flex", gap: 3, marginRight: 4, flexShrink: 0, alignSelf: "flex-start", marginTop: 3 }}>
                      <button type="button" className="btn-icon" onClick={() => moveTechItem(si, ii, -1)} disabled={ii === 0} style={{ width: 20, height: 20, borderRadius: 3, border: "0.5px solid #E5EAF0", background: "#fff", color: "#7B97B2", cursor: ii === 0 ? "not-allowed" : "pointer", fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: ii === 0 ? 0.3 : 1, padding: 0 }}>↑</button>
                      <button type="button" className="btn-icon" onClick={() => moveTechItem(si, ii, 1)} disabled={ii === sec.items.length - 1} style={{ width: 20, height: 20, borderRadius: 3, border: "0.5px solid #E5EAF0", background: "#fff", color: "#7B97B2", cursor: ii === sec.items.length - 1 ? "not-allowed" : "pointer", fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: ii === sec.items.length - 1 ? 0.3 : 1, padding: 0 }}>↓</button>
                    </div>
                  )}
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n}
                    onChange={(e) => { const v = e.target.value; setTechSpecs((p) => p.map((s, i) => i === si ? { ...s, items: s.items.map((x, j) => j === ii ? { ...x, n: v } : x) } : s)); }}
                    minHeight={20}
                    placeholder="Параметр"
                    style={{ flex: 1, border: "none", background: "none", fontSize: 12, color: B.graphite, outline: "none", resize: "none", fontFamily: "Inter, system-ui, sans-serif", lineHeight: "1.4", padding: 0, minWidth: 0 }}
                  />
                </div>
                <div className="ts-req-col" style={{ flex: "1 1 60%", display: "flex", alignItems: "center", padding: "8px 0", paddingLeft: 12, background: "transparent" }}>
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n2 || ""}
                    onChange={(e) => { const v = e.target.value; setTechSpecs((p) => p.map((s, i) => i === si ? { ...s, items: s.items.map((x, j) => j === ii ? { ...x, n2: v } : x) } : s)); }}
                    minHeight={36}
                    placeholder="Требование"
                    style={{ flex: 1, border: "none", background: "#EFF6FF", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: B.steel, outline: "none", resize: "none", fontFamily: "Inter, system-ui, sans-serif", lineHeight: "1.4", minWidth: 0 }}
                  />
                </div>
                {techSpecsEditMode && sec.items.length > 1 && <button type="button" className="btn-icon-close ts-item-delete" onClick={() => setTechSpecs((p) => p.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s))} style={{ background: "none", border: "none", color: B.steel, cursor: "pointer", fontSize: 15, padding: "0 2px", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>×</button>}
              </div>,
            )}
            {techSpecsEditMode && <button type="button" className="btn-secondary" onClick={() => setTechSpecs((p) => p.map((s, i) => i === si ? { ...s, items: [...s.items, { n: "", n2: "" }] } : s))} style={{ width: "100%", padding: "8px", border: "none", borderTop: "1px solid #F1F5F9", background: "none", color: B.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: "0 0 12px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>+ Добавить условие</button>}
          </div>
        </div>,
      )}
    </div>
  );
}
