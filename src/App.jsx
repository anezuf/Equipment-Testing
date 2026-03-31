import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { loadSaved, useStorage } from "./hooks/useStorage";
import { useVendors } from "./hooks/useVendors";

import { B, EQ_TYPES } from "./constants";
import { mkAll, mkOff } from "./sections";
import { calcTotal, calcSec } from "./scoring";
import { fmt, downloadJsonFile, sanitizeEditorWeightsMap } from "./utils";
import { TECH_SPECS_DEFAULT, PDU_TECH_SPECS_DEFAULT, normalizeTechSpecs } from "./data/techSpecs";
import { EDITOR_DEFAULT_WEIGHTS } from "./data/editorDefaultWeights";
import { useImportExportHandlers } from "./hooks/useImportExportHandlers";
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
        productionCapacity: "",
      }],
    };
  }, [deriveSectionsFromTechSpecs]);
  const normalizeScoringData = useCallback((type, raw) => {
    const fallback = createDefaultScoringData(type);
    if (!Array.isArray(raw?.vendors)) return fallback;
    const n = mkAll(fallback.sections).length;
    return {
      sections: fallback.sections,
      vendors: raw.vendors.map((v) => ({
        ...v,
        scores: Array.isArray(v.scores) ? [...v.scores.slice(0, n), ...Array(Math.max(0, n - v.scores.length)).fill(null)] : Array(n).fill(null),
        notes: Array.isArray(v.notes) ? [...v.notes.slice(0, n), ...Array(Math.max(0, n - v.notes.length)).fill("")] : Array(n).fill(""),
        images: Array.isArray(v.images) ? [...v.images.slice(0, n), ...Array(Math.max(0, n - v.images.length)).fill(null)] : Array(n).fill(null),
        productionRating: v?.productionRating ?? null,
        productionCapacity: String(v?.productionCapacity ?? ""),
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
  const [notePopup,setNotePopup]=useState(null);
  const [infoPopup,setInfoPopup]=useState(null);
  const [showReset,setShowReset]=useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
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
  const [techSpecsEditMode,setTechSpecsEditMode]=useState(false);
  const techSpecsSnapshot=useRef(null);
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
          productionCapacity: String(v?.productionCapacity ?? ""),
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

  /* Export to Excel (CSV with BOM for proper Cyrillic in Excel) */
  /* Generate clean PDF report for a specific vendor */
  const exportVendorPDF=useCallback((vi)=>{
    const v=vendors[vi];
    if(!v)return;
    const allItems=mkAll(scoringSections);
    const offs=mkOff(scoringSections);
    const sl=["✗ Нет","◐ Частично","✓ Да"];
    const sc_colors=["#EF4444","#F59E0B","#10B981"];
    const total=calcTotal(v.scores,allItems);
    const esc=(str)=>String(str??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

    let html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(v.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    <style>
      *{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Inter,system-ui,sans-serif;color:#334155;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.5}
      h1{font-size:22px;font-weight:800;margin-bottom:16px}
      .total{display:inline-block;padding:8px 20px;border-radius:12px;font-size:20px;font-weight:800;color:#fff;margin-bottom:28px}
      .sec{background:#334155;color:#fff;padding:8px 14px;font-size:12px;font-weight:700;border-radius:8px 8px 0 0;margin-top:14px}
      .items{border:1px solid #E5EAF0;border-top:none;border-radius:0 0 8px 8px;margin-bottom:2px}
      .row{padding:8px 14px;border-bottom:1px solid #F1F5F9}
      .row:last-child{border-bottom:none}
      .rhead{display:flex;gap:10px;align-items:baseline}
      .rname{flex:1;font-size:12px;font-weight:500}
      .rtype{font-size:10px;font-weight:700}
      .rscore{font-size:12px;font-weight:700;flex-shrink:0;text-align:right}
      .note{display:block;background:#F5F8FB;border-radius:6px;padding:4px 10px;font-size:11px;color:#7B97B2;margin-top:4px;white-space:pre-wrap;display:block;text-align:left}.note ul{list-style:disc;padding-left:18px;margin:4px 0}.note ol{list-style:decimal;padding-left:18px;margin:4px 0}.note li{margin:2px 0}.note strong{font-weight:700}.note em{font-style:italic}.note s{text-decoration:line-through}
      .photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .photos img{max-width:48%;max-height:240px;border-radius:6px;border:1px solid #E5EAF0;object-fit:contain}
      .summary{margin-top:28px;border:1px solid #E5EAF0;border-radius:10px;overflow:hidden}
      .srow{display:flex;justify-content:space-between;padding:6px 14px;font-size:12px}
      .srow:nth-child(even){background:#F5F8FB}
      .sn{color:#7B97B2}.sv{font-weight:700}
      .pdf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:0 auto 24px;padding:8px 15px;border-radius:20px;font-size:13px;font-weight:500;color:#334155;cursor:pointer;transition:all 0.2s ease;white-space:nowrap;border:1.5px solid #FECACA;background:#FEF2F2;font-family:Inter,system-ui,sans-serif}
      .pdf-btn:hover{background:#FEE2E2;border-color:#FCA5A5}
      .pdf-btn:active{background:#FECACA}
      .sec-block{break-inside:avoid}
      .row{break-inside:avoid}
      @media print{body{padding:16px}.pdf-btn{display:none!important}}
    </style></head><body>`;

    html+=`<button class="pdf-btn" onclick="window.print()"><span style="font-size:14px;line-height:1;color:#DC2626">↓</span><span>report</span><span style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:#DC2626">PDF</span></button>`;
    html+=`<h1>${esc(v.name)}</h1>`;
    const tColor=total!=null&&total>=7?"#10B981":total!=null&&total>=4?"#F59E0B":"#7B97B2";
    html+=`<div class="total" style="background:${tColor}">${fmt(total)} / 10</div>`;
    const hasProductionInfo = Boolean(v.productionRating || String(v.productionCapacity ?? "").trim());
    if(hasProductionInfo){
      const ratingText = esc(v.productionRating || "Не оценивалось");
      const capacityRaw = String(v.productionCapacity ?? "").trim();
      const capacityText = esc(capacityRaw ? `${capacityRaw} ед./мес.` : "—");
      html+=`<div style="display:flex;gap:24px;margin-bottom:16px;padding:12px 16px;border:1px solid #E5EAF0;border-radius:12px;background:#fff;break-inside:avoid">
        <div>
          <div style="font-size:11px;color:#7B97B2;margin-bottom:4px">Оценка производства</div>
          <div style="font-size:13px;font-weight:600;color:#334155">${ratingText}</div>
        </div>
        <div style="width:1px;background:#E5EAF0"></div>
        <div>
          <div style="font-size:11px;color:#7B97B2;margin-bottom:4px">Производственная мощность</div>
          <div style="font-size:13px;font-weight:600;color:#334155">${capacityText}</div>
        </div>
      </div>`;
    }

    let gi=0;
    scoringSections.forEach((sec)=>{
      html+=`<div class="sec-block"><div class="sec">${esc(sec.n)}</div><div class="items">`;
      sec.items.forEach((it)=>{
        const sc=v.scores[gi];
        const nt=v.notes[gi]||"";
        const imgs=v.images?.[gi]||null;
        const isReq=it.w>=1;
        const isCrit=it.w===2;
        const star=isCrit?`<span class="rtype" style="color:#DC2626">ПП</span>`:isReq?`<span class="rtype" style="color:#DC2626">ОП</span>`:`<span class="rtype" style="color:#2F9AFF">П</span>`;
        let scoreLabel="—";let scoreColor="#CBD5E1";
        if(sc!=null){
          scoreLabel=sl[sc];scoreColor=sc_colors[sc];
        }
        html+=`<div class="row"><div class="rhead">${star}<span class="rname">${esc(it.n)}</span><span class="rscore" style="color:${scoreColor}">${scoreLabel}</span></div>`;
        if(nt)html+=`<div class="note">${nt}</div>`;
        if(imgs&&imgs.length){
          html+=`<div class="photos">`;
          imgs.forEach(im=>{html+=`<img src="${im.data}" alt="${esc(im.name||"")}">`;});
          html+=`</div>`;
        }
        html+=`</div>`;
        gi++;
      });
      html+=`</div></div>`;
    });

    html+=`<div class="summary" style="break-inside:avoid">`;
    html+=`<div class="srow" style="background:#334155;color:#fff;font-weight:700"><span>Раздел</span><span>Балл</span></div>`;
    scoringSections.forEach((sec,si)=>{
      const val=calcSec(v.scores,si,scoringSections,offs);
      html+=`<div class="srow"><span class="sn">${esc(sec.n)}</span><span class="sv">${fmt(val)}</span></div>`;
    });
    html+=`<div class="srow" style="border-top:2px solid #E5EAF0;font-weight:700"><span>ИТОГО</span><span style="color:${tColor}">${fmt(total)}</span></div>`;
    html+=`</div></body></html>`;

    const w=window.open("","_blank");
    if(!w){
      alert("Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    const closePrintWindow=()=>{try{w.close();}catch{/* ignored */}};
    w.onafterprint=closePrintWindow;
    setTimeout(()=>{
      try{
        w.focus();
        w.print();
      }catch{
        closePrintWindow();
      }
    },500);
  },[scoringSections,vendors]);

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

  useEffect(()=>{
    if(infoPopup===null)return;
    const close=()=>setInfoPopup(null);
    window.addEventListener("click",close,{once:true});
    return ()=>window.removeEventListener("click",close);
  },[infoPopup]);

  const exportPDF=useCallback(()=>{
    resetHeatmapPrintScroll();
    window.print();
  },[resetHeatmapPrintScroll]);

  const handleBackupSession = useCallback(() => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const normalizedScoringByType = EQ_TYPES.reduce((acc, type) => {
        acc[type] = normalizeScoringData(type, scoringDataByType[type]);
        return acc;
      }, {});
      downloadJsonFile(`rack-audit-backup-${date}.json`, {
        scoringDataByType: normalizedScoringByType,
        editorWeightsByType,
        techSpecsByType,
        scoringEqType,
      });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }, [EQ_TYPES, editorWeightsByType, normalizeScoringData, scoringDataByType, scoringEqType, techSpecsByType]);

  const handleRestoreBackupFileChange = useCallback(async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || parsed.scoringDataByType == null || typeof parsed.scoringDataByType !== "object") {
        alert("Неверный файл резервной копии: отсутствует или поврежден ключ scoringDataByType.");
        return;
      }
      const sdt = parsed.scoringDataByType;
      setScoringDataByType({
        стойка: normalizeScoringData("стойка", sdt["стойка"]),
        pdu: normalizeScoringData("pdu", sdt["pdu"]),
      });
      if (parsed.editorWeightsByType && typeof parsed.editorWeightsByType === "object") {
        const nextEw = {
          стойка: sanitizeEditorWeightsMap(parsed.editorWeightsByType["стойка"]),
          pdu: sanitizeEditorWeightsMap(parsed.editorWeightsByType["pdu"]),
        };
        setEditorWeightsByType(nextEw);
        EQ_TYPES.forEach((type) => {
          try {
            localStorage.setItem(getEditorWeightsKey(type), JSON.stringify(nextEw[type]));
          } catch { /* ignored */ }
        });
      }
      if (parsed.techSpecsByType && typeof parsed.techSpecsByType === "object") {
        setTechSpecsByType({
          стойка: normalizeTechSpecs(parsed.techSpecsByType["стойка"] ?? TECH_SPECS_DEFAULT),
          pdu: normalizeTechSpecs(parsed.techSpecsByType["pdu"] ?? PDU_TECH_SPECS_DEFAULT),
        });
      }
      if (parsed.scoringEqType === "pdu" || parsed.scoringEqType === "стойка") {
        setScoringEqType(parsed.scoringEqType);
      }
    } catch (err) {
      alert(err?.message || "Не удалось загрузить резервную копию.");
    }
  }, [getEditorWeightsKey, normalizeScoringData, setScoringDataByType, setEditorWeightsByType, setTechSpecsByType, setScoringEqType]);

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
  const moveTechSection=useCallback((si,dir)=>{
    const newIdx=si+dir;
    if(newIdx<0||newIdx>=techSpecs.length)return;
    setTechSpecs(p=>{const a=[...p];[a[si],a[newIdx]]=[a[newIdx],a[si]];return a;});
  },[techSpecs,setTechSpecs]);
  const moveTechItem=useCallback((si,ii,dir)=>{
    const newIdx=ii+dir;
    if(newIdx<0||newIdx>=techSpecs[si].items.length)return;
    setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:(()=>{const a=[...s.items];[a[ii],a[newIdx]]=[a[newIdx],a[ii]];return a;})()}:s));
  },[techSpecs,setTechSpecs]);
  const closeNotePopup=useCallback(()=>setNotePopup(null),[setNotePopup]);
  const closeResetModal=useCallback(()=>setShowReset(false),[setShowReset]);
  const closeApplyConfirmModal=useCallback(()=>setShowApplyConfirm(false),[setShowApplyConfirm]);
  const stopModalPropagation=useCallback((e)=>e.stopPropagation(),[]);
  const showResetModal=useCallback(()=>setShowReset(true),[setShowReset]);
  const applyTechSpecsToEditor=useCallback(()=>{
    setShowApplyConfirm(false);
    setTechSpecsEditMode(false);
  },[setShowApplyConfirm,setTechSpecsEditMode]);
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
