import { useState, useCallback, useEffect, useMemo } from "react";
import { loadSaved, useStorage } from "./hooks/useStorage";
import { useVendors } from "./hooks/useVendors";

import { B, EQ_TYPES } from "./constants";
import { normalizeProductionCapacityStored } from "./utils";
import { mkAll } from "./sections";
import { exportVendorPdfReport } from "./utils/print";
import { TECH_SPECS_DEFAULT, PDU_TECH_SPECS_DEFAULT, normalizeTechSpecs } from "./data/techSpecs";
import { EDITOR_DEFAULT_WEIGHTS } from "./data/editorDefaultWeights";
import { useImportExportHandlers } from "./hooks/useImportExportHandlers";
import { useBackupRestore } from "./hooks/useBackupRestore";
import { useModals } from "./hooks/useModals";
import { useTechSpecsEditor } from "./hooks/useTechSpecsEditor";
import { useDisableDoubleTapZoom } from "./hooks/useDisableDoubleTapZoom";
import NotePopup from "./components/NotePopup";
import Dashboard from "./components/features/Dashboard";
import ScoreEditor from "./components/features/ScoreEditor";
import ChecklistEditor from "./components/features/ChecklistEditor";
import TechSpecs from "./components/features/TechSpecs";
import NavBar from "./components/ui/NavBar";


/* Weight: 0=П (excluded from score), 1=ОП, 2=ПП */

/*
  Scoring logic:
  - П (w=0): excluded from calculation entirely
  - ОП (w=1): base=1, ПП (w=2): base=2
  - Coefficients: score 0→0, score 1→0.5, score 2→1
  - Item points = base × coefficient
  - Total = (sum_earned / sum_max_ALL) × 10
  - sum_max_ALL = sum of base points for ALL ОП/ПП items (not just scored)
  - hasFail: any ОП/ПП item (w>=1) with score===0
*/

export default function App(){
  useDisableDoubleTapZoom();
  const deriveSectionsFromTechSpecs = useCallback((specs, weightsMap, defaultWeightsMap) => (
    (Array.isArray(specs) ? specs : []).map((sec) => ({
      n: sec?.n || "",
      items: (Array.isArray(sec?.items) ? sec.items : []).map((item) => {
        const name = item?.n || "";
        const merged = { ...(defaultWeightsMap || {}), ...(weightsMap || {}) };
        const rawWeight = merged[name];
        const w = rawWeight === 0 || rawWeight === 1 || rawWeight === 2 ? rawWeight : 2;
        return { n: name, w, sec: sec?.n || "" };
      }),
    }))
  ), []);
  const getEditorWeightsKey = useCallback((type) => `rack_editor_weights_${type === "pdu" ? "pdu" : "стойка"}`, []);
  const loadWeightsByType = useCallback((type) => {
    try {
      const raw = loadSaved(getEditorWeightsKey(type));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return Object.entries(raw).reduce((acc, [key, value]) => {
        if (value === 0 || value === 1 || value === 2) acc[key] = value;
        return acc;
      }, {});
    } catch {
      return {};
    }
  }, [getEditorWeightsKey]);
  const createDefaultScoringData = useCallback((type) => {
    const defaults = type === "pdu" ? PDU_TECH_SPECS_DEFAULT : TECH_SPECS_DEFAULT;
    const defW = type === "pdu" ? EDITOR_DEFAULT_WEIGHTS.pdu : EDITOR_DEFAULT_WEIGHTS.стойка;
    const defaultSections = deriveSectionsFromTechSpecs(defaults, {}, defW);
    const itemCount = mkAll(defaultSections).length;
    return {
      sections: defaultSections,
      vendors: [{
        name: "Вендор 1",
        scores: Array(itemCount).fill(null),
        notes: Array(itemCount).fill(""),
        images: Array(itemCount).fill(null),
        productionRating: null,
        productionVerdict: null,
        productionCapacity: "0",
      }],
    };
  }, [deriveSectionsFromTechSpecs]);
  const normalizeScoringData = useCallback((type, raw) => {
    const fallback = createDefaultScoringData(type);
    if (!Array.isArray(raw?.vendors)) return fallback;
    const rawSections =
      Array.isArray(raw?.sections) &&
      raw.sections.every((sec) => Array.isArray(sec?.items))
        ? raw.sections
        : fallback.sections;
    const sectionsCount = mkAll(rawSections).length;
    const maxVendorLength = raw.vendors.reduce((maxLen, v) => (
      Math.max(
        maxLen,
        Array.isArray(v?.scores) ? v.scores.length : 0,
        Array.isArray(v?.notes) ? v.notes.length : 0,
        Array.isArray(v?.images) ? v.images.length : 0
      )
    ), 0);
    const n = Math.max(sectionsCount, maxVendorLength);
    return {
      sections: rawSections,
      vendors: raw.vendors.map((v) => ({
        ...v,
        scores: Array.isArray(v.scores) ? [...v.scores.slice(0, n), ...Array(Math.max(0, n - v.scores.length)).fill(null)] : Array(n).fill(null),
        notes: Array.isArray(v.notes) ? [...v.notes.slice(0, n), ...Array(Math.max(0, n - v.notes.length)).fill("")] : Array(n).fill(""),
        images: Array.isArray(v.images) ? [...v.images.slice(0, n), ...Array(Math.max(0, n - v.images.length)).fill(null)] : Array(n).fill(null),
        productionRating: v?.productionRating ?? null,
        productionVerdict: v?.productionVerdict ?? null,
        productionCapacity: normalizeProductionCapacityStored(v?.productionCapacity),
      })),
    };
  }, [createDefaultScoringData]);
  const loadEqType = useCallback((key) => {
    const saved = loadSaved(key);
    return saved === "pdu" ? "pdu" : "стойка";
  }, []);

  const [techSpecsEqType, setTechSpecsEqType] = useState(() => loadEqType("rack_techspecs_eq_type"));
  const [editorEqType, setEditorEqType] = useState(() => loadEqType("rack_editor_eq_type"));
  const [scoringEqType, setScoringEqType] = useState(() => loadEqType("rack_scoring_eq_type"));
  const [scoringDataByType, setScoringDataByType] = useState(() => ({
    стойка: normalizeScoringData("стойка", loadSaved("rack_scoring_data_стойка")),
    pdu: normalizeScoringData("pdu", loadSaved("rack_scoring_data_pdu")),
  }));
  const [techSpecsByType, setTechSpecsByType] = useState(() => ({
    стойка: normalizeTechSpecs(loadSaved("rack_tech_specs_стойка") || TECH_SPECS_DEFAULT),
    pdu: normalizeTechSpecs(loadSaved("rack_tech_specs_pdu") || PDU_TECH_SPECS_DEFAULT),
  }));
  const [editorWeightsByType, setEditorWeightsByType] = useState(() => ({
    стойка: loadWeightsByType("стойка"),
    pdu: loadWeightsByType("pdu"),
  }));

  const scoringData = scoringDataByType[scoringEqType] || createDefaultScoringData(scoringEqType);
  const editorTechSpecs = techSpecsByType[editorEqType] || (editorEqType === "pdu" ? PDU_TECH_SPECS_DEFAULT : TECH_SPECS_DEFAULT);
  const scoringTechSpecsByType = useMemo(() => ({
    стойка: techSpecsByType["стойка"] || TECH_SPECS_DEFAULT,
    pdu: techSpecsByType["pdu"] || PDU_TECH_SPECS_DEFAULT,
  }), [techSpecsByType]);
  const sectionsByType = useMemo(() => ({
    стойка: deriveSectionsFromTechSpecs(scoringTechSpecsByType["стойка"], editorWeightsByType["стойка"] || {}, EDITOR_DEFAULT_WEIGHTS.стойка),
    pdu: deriveSectionsFromTechSpecs(scoringTechSpecsByType.pdu, editorWeightsByType.pdu || {}, EDITOR_DEFAULT_WEIGHTS.pdu),
  }), [deriveSectionsFromTechSpecs, editorWeightsByType, scoringTechSpecsByType]);
  const sections = sectionsByType[editorEqType] || [];
  const scoringSections = sectionsByType[scoringEqType] || [];

  const setScoringData = useCallback((updater) => {
    setScoringDataByType((prev) => {
      const current = prev[scoringEqType] || createDefaultScoringData(scoringEqType);
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [scoringEqType]: nextValue };
    });
  }, [createDefaultScoringData, scoringEqType]);
  const [actByType, setActByType] = useState({ стойка: 0, pdu: 0 });
  const act = actByType[scoringEqType] ?? 0;
  const setAct = useCallback((valOrUpdater) => {
    setActByType((prev) => {
      const current = prev[scoringEqType] ?? 0;
      const next = typeof valOrUpdater === "function" ? valOrUpdater(current) : valOrUpdater;
      return { ...prev, [scoringEqType]: next };
    });
  }, [scoringEqType]);
  const {
    vendors,
    setVendors,
    ALL,
    SEC_OFF,
    itemCount,
    addVendor: addV,
    removeVendor: rmV,
    renameVendor: setName,
    onScoreChange: setScore,
    onNoteChange: setNote,
    onImageAdd: addImage,
    onImageRemove: rmImage,
    onProductionRatingChange: setProductionRating,
    onProductionCapacityChange: setProductionCapacity,
    onProductionVerdictChange: setProductionVerdict,
    totals,
    allSec,
    sortedIdx,
    getAdvantages,
  } = useVendors({ scoringData, setScoringData, sections: scoringSections, act, setAct });
  const [view, setView] = useStorage("rack_active_view", "input");
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [noteOpenByType, setNoteOpenByType] = useState({ стойка: null, pdu: null });
  const noteOpen = noteOpenByType[scoringEqType] ?? null;
  const setNoteOpen = useCallback((valOrUpdater) => {
    setNoteOpenByType((prev) => {
      const current = prev[scoringEqType] ?? null;
      const next = typeof valOrUpdater === "function" ? valOrUpdater(current) : valOrUpdater;
      return { ...prev, [scoringEqType]: next };
    });
  }, [scoringEqType]);
  const {
    notePopup,
    setNotePopup,
    infoPopup,
    setInfoPopup,
    showReset,
    setShowReset,
    showApplyConfirm,
    setShowApplyConfirm,
    closeNotePopup,
    closeResetModal,
    closeApplyConfirmModal,
    stopModalPropagation,
    showResetModal,
  } = useModals();
  const [expImgs,setExpImgs]=useState({});
  const [heatmapSort,setHeatmapSort]=useState({col:null,label:null});
  const [heatmapSelectedVendor, setHeatmapSelectedVendor] = useState(null);
  const techSpecs = techSpecsByType[techSpecsEqType] || (techSpecsEqType === "pdu" ? PDU_TECH_SPECS_DEFAULT : TECH_SPECS_DEFAULT);
  const setTechSpecs = useCallback((updater) => {
    setTechSpecsByType((prev) => {
      const current = prev[techSpecsEqType] || (techSpecsEqType === "pdu" ? PDU_TECH_SPECS_DEFAULT : TECH_SPECS_DEFAULT);
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [techSpecsEqType]: normalizeTechSpecs(nextValue) };
    });
  }, [techSpecsEqType]);
  const {
    techSpecsEditMode,
    setTechSpecsEditMode,
    techSpecsSnapshot,
    moveTechSection,
    moveTechItem,
    applyTechSpecsToEditor,
  } = useTechSpecsEditor({ techSpecs, setTechSpecs, setShowApplyConfirm });
  useEffect(() => {
    const handler = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('orientationchange', handler); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("rack_techspecs_eq_type", JSON.stringify(techSpecsEqType)); } catch { /* ignored */ }
  }, [techSpecsEqType]);
  useEffect(() => {
    try { localStorage.setItem("rack_editor_eq_type", JSON.stringify(editorEqType)); } catch { /* ignored */ }
  }, [editorEqType]);
  useEffect(() => {
    try { localStorage.setItem("rack_scoring_eq_type", JSON.stringify(scoringEqType)); } catch { /* ignored */ }
  }, [scoringEqType]);
  useEffect(() => {
    EQ_TYPES.forEach((type) => {
      try { localStorage.setItem(`rack_scoring_data_${type}`, JSON.stringify(scoringDataByType[type])); } catch { /* ignored */ }
    });
  }, [scoringDataByType]);
  useEffect(() => {
    EQ_TYPES.forEach((type) => {
      try { localStorage.setItem(`rack_tech_specs_${type}`, JSON.stringify(techSpecsByType[type])); } catch { /* ignored */ }
    });
  }, [techSpecsByType]);
  useEffect(() => {
    setScoringDataByType((prev) => {
      let changed = false;
      const next = { ...prev };
      EQ_TYPES.forEach((type) => {
        const typeSections = sectionsByType[type] || [];
        const targetCount = mkAll(typeSections).length;
        const current = prev[type] || createDefaultScoringData(type);
        const resizedVendors = (current.vendors || []).map((v) => ({
          ...v,
          scores: Array.isArray(v.scores) ? [...v.scores.slice(0, targetCount), ...Array(Math.max(0, targetCount - v.scores.length)).fill(null)] : Array(targetCount).fill(null),
          notes: Array.isArray(v.notes) ? [...v.notes.slice(0, targetCount), ...Array(Math.max(0, targetCount - v.notes.length)).fill("")] : Array(targetCount).fill(""),
          images: Array.isArray(v.images) ? [...v.images.slice(0, targetCount), ...Array(Math.max(0, targetCount - v.images.length)).fill(null)] : Array(targetCount).fill(null),
          productionRating: v?.productionRating ?? null,
          productionVerdict: v?.productionVerdict ?? null,
          productionCapacity: normalizeProductionCapacityStored(v?.productionCapacity),
        }));
        const oldVendors = current.vendors || [];
        const vendorsChanged = oldVendors.length !== resizedVendors.length || oldVendors.some((v, idx) => {
          const n = resizedVendors[idx];
          return v.scores?.length !== n.scores.length || v.notes?.length !== n.notes.length || v.images?.length !== n.images.length;
        });
        const sectionsChanged = current.sections !== typeSections;
        if (vendorsChanged || sectionsChanged) {
          changed = true;
          next[type] = { ...current, sections: typeSections, vendors: resizedVendors };
        }
      });
      return changed ? next : prev;
    });
  }, [createDefaultScoringData, sectionsByType]);

  const { exportExcelFile, importFile, exportTechSpecs, importTechSpecs, exportActiveVendorForm } =
    useImportExportHandlers({
      sections: scoringSections,
      vendors,
      itemCount,
      setVendors,
      setAct,
      setView,
      techSpecs,
      techSpecsEqType,
      setTechSpecs,
      scoringEqType,
      ALL,
      act,
    });

  /* Full reset to code defaults for all equipment types */
  const doReset=useCallback(()=>{
    const resetScoring = EQ_TYPES.reduce((acc, type) => {
      acc[type] = createDefaultScoringData(type);
      return acc;
    }, {});
    setScoringDataByType(resetScoring);
    setTechSpecsByType({
      стойка: normalizeTechSpecs(TECH_SPECS_DEFAULT),
      pdu: normalizeTechSpecs(PDU_TECH_SPECS_DEFAULT),
    });
    setEditorWeightsByType({ стойка: {}, pdu: {} });
    EQ_TYPES.forEach((type) => {
      try { localStorage.removeItem(getEditorWeightsKey(type)); } catch { /* ignored */ }
    });
    setShowReset(false);
    setNoteOpen(null);
    setAct(0);
  }, [
    EQ_TYPES,
    createDefaultScoringData,
    getEditorWeightsKey,
    setAct,
    setNoteOpen,
    setScoringDataByType,
    setTechSpecsByType,
    setEditorWeightsByType,
  ]);

  const exportVendorPDF = useCallback((vendorIndex) => {
    exportVendorPdfReport(vendors[vendorIndex], scoringSections);
  }, [scoringSections, vendors]);

  const setItemWeight = useCallback((si, ii, w) => {
    const itemName = editorTechSpecs?.[si]?.items?.[ii]?.n;
    if (!itemName) return;
    const safeWeight = w === 0 || w === 1 || w === 2 ? w : 2;
    setEditorWeightsByType((prev) => {
      const current = prev[editorEqType] || {};
      const nextForType = { ...current, [itemName]: safeWeight };
      const next = { ...prev, [editorEqType]: nextForType };
      try { localStorage.setItem(getEditorWeightsKey(editorEqType), JSON.stringify(nextForType)); } catch { /* ignored */ }
      return next;
    });
  }, [editorEqType, editorTechSpecs, getEditorWeightsKey]);

  const resetHeatmapPrintScroll=useCallback(()=>{
    if(typeof document==="undefined")return;
    document.querySelectorAll(".heatmap-table-wrap").forEach((el)=>{el.scrollLeft=0;});
  },[]);

  useEffect(()=>{
    const handleBeforePrint=()=>{resetHeatmapPrintScroll();};
    window.addEventListener("beforeprint",handleBeforePrint);
    return ()=>window.removeEventListener("beforeprint",handleBeforePrint);
  },[resetHeatmapPrintScroll]);

  const exportPDF=useCallback(()=>{
    resetHeatmapPrintScroll();
    window.print();
  },[resetHeatmapPrintScroll]);

  const { handleBackupSession, handleRestoreBackupFileChange } = useBackupRestore({
    EQ_TYPES,
    normalizeScoringData,
    scoringDataByType,
    editorWeightsByType,
    techSpecsByType,
    scoringEqType,
    setScoringDataByType,
    setEditorWeightsByType,
    setTechSpecsByType,
    setScoringEqType,
    getEditorWeightsKey,
  });

  const scoringTechSpecs = techSpecsByType[scoringEqType] || [];
  const getTechReq=useCallback((secName,itemName)=>{
    void secName;
    const normalize = (v) => String(v || "").trim().toLowerCase();
    const targetName = normalize(itemName);
    if (!targetName) return "";
    for (const sec of scoringTechSpecs) {
      const found = sec?.items?.find((x) => normalize(x?.n) === targetName);
      if (found?.n2) return found.n2;
    }
    return "";
  },[scoringTechSpecs]);
  return <div style={{minHeight:"100vh",background:B.bg,fontFamily:"Inter, system-ui, sans-serif",position:"relative",overflowX:"hidden"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet"/>

    

    <NotePopup note={notePopup} onClose={closeNotePopup}/>

    {/* Reset confirmation modal */}
    {showReset&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={closeResetModal}>
      <div onClick={stopModalPropagation} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Сбросить все?</div>
        <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Все данные будут сброшены к дефолтам из кода: вендоры, оценки, тех. условия и веса редактора для «Стойка» и «PDU».</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button className="btn-danger" onClick={closeResetModal} style={{padding:"10px 28px",borderRadius:12,border:"1.5px solid #EF4444",background:"#fff",color:"#EF4444",fontSize:14,fontWeight:600,cursor:"pointer"}}>Отмена</button>
          <button className="btn-primary" onClick={doReset} style={{padding:"10px 28px",borderRadius:12,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Да, сбросить</button>
        </div>
      </div>
    </div>}

    {showApplyConfirm && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={closeApplyConfirmModal}>
        <div onClick={stopModalPropagation} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:400,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={B.blue} strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Применить в редактор?</div>
          <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Разделы и параметры в редакторе будут обновлены из тех. условий. Новые параметры получат вес «ПП». Существующие веса сохранятся.</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button type="button" className="btn-danger" onClick={closeApplyConfirmModal} style={{padding:"10px 28px",borderRadius:12,border:"1.5px solid #EF4444",background:"#fff",color:"#EF4444",fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>Отмена</button>
            <button type="button" className="btn-primary" onClick={applyTechSpecsToEditor} style={{padding:"10px 28px",borderRadius:12,border:"none",background:B.blue,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              Применить
            </button>
          </div>
        </div>
      </div>
    )}

    <NavBar
      view={view}
      setView={setView}
      vendorsCount={vendors.length}
      onExport={exportExcelFile}
      onImport={importFile}
      onReset={doReset}
      onExportPdf={exportPDF}
      onBackupSession={handleBackupSession}
      onRestoreBackupFileChange={handleRestoreBackupFileChange}
    />

    {/* ═══ EDITOR ═══ */}
    {view==="editor"&&<ChecklistEditor
      sections={sections}
      techSpecs={editorTechSpecs}
      eqType={editorEqType}
      isPortrait={isPortrait}
      onSwitchEqType={setEditorEqType}
      onItemWeightChange={setItemWeight}
    />}

    {/* ═══ INPUT ═══ */}
    {view==="techspecs"&&<TechSpecs
      techSpecs={techSpecs}
      setTechSpecs={setTechSpecs}
      techSpecsSnapshot={techSpecsSnapshot}
      techSpecsEditMode={techSpecsEditMode}
      setTechSpecsEditMode={setTechSpecsEditMode}
      setShowApplyConfirm={setShowApplyConfirm}
      exportTechSpecs={exportTechSpecs}
      importTechSpecs={importTechSpecs}
      EQ_TYPES={EQ_TYPES}
      switchEqType={setTechSpecsEqType}
      eqType={techSpecsEqType}
      moveTechSection={moveTechSection}
      moveTechItem={moveTechItem}
    />}

        {view==="input"&&<ScoreEditor
      eqType={scoringEqType}
      onSwitchEqType={setScoringEqType}
      vendors={vendors}
      sections={scoringSections}
      ALL={ALL}
      SEC_OFF={SEC_OFF}
      act={act}
      setAct={setAct}
      noteOpen={noteOpen}
      setNoteOpen={setNoteOpen}
      expImgs={expImgs}
      setExpImgs={setExpImgs}
      onScoreChange={setScore}
      onNoteChange={setNote}
      onImageAdd={addImage}
      onImageRemove={rmImage}
      onProductionRatingChange={setProductionRating}
      onProductionCapacityChange={setProductionCapacity}
      onProductionVerdictChange={setProductionVerdict}
      isPortrait={isPortrait}
      onAddVendor={addV}
      onRemoveVendor={rmV}
      onVendorNameChange={setName}
      onExportVendorPDF={exportVendorPDF}
      onImport={importFile}
      onExportVendorForm={exportActiveVendorForm}
      onShowReset={showResetModal}
      infoPopup={infoPopup}
      setInfoPopup={setInfoPopup}
      getTechReq={getTechReq}
    />}

    {/* DASHBOARD */}
    {view==="dashboard"&&<Dashboard
      eqType={scoringEqType}
      onSwitchEqType={setScoringEqType}
      vendors={vendors}
      sections={scoringSections}
      totals={totals}
      allSec={allSec}
      sortedIdx={sortedIdx}
      heatmapSort={heatmapSort}
      setHeatmapSort={setHeatmapSort}
      heatmapSelectedVendor={heatmapSelectedVendor}
      setHeatmapSelectedVendor={setHeatmapSelectedVendor}
      setNotePopup={setNotePopup}
      SEC_OFF={SEC_OFF}
      getAdvantages={getAdvantages}
    />}

    {/* Footer */}
    <footer data-footer="" style={{padding:"12px 24px",borderTop:`1px solid ${B.border}`,background:"#fff",display:"flex",justifyContent:"center",alignItems:"center",gap:6,fontSize:11,color:B.steel,flexShrink:0}}>
      <span>Авторы:</span>
      <a href="https://t.me/anezuf" target="_blank" rel="noreferrer" style={{color:B.blue,fontWeight:600,textDecoration:"none"}}>Трандафил Кирилл Антонович</a>
      <span>·</span>
      <span style={{color:B.graphite,fontWeight:500}}>Грачев Егор Алексеевич</span>
    </footer>
  </div>;
}
