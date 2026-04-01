import { useEffect, useRef } from "react";
import { B, VC, ICO, SM, WC, EQ_TYPES } from "../../constants";
import RichNote from "../RichNote";
import Logo from "../Logo";

const [IconNo, IconMid, IconYes] = ICO;
const CAPACITY_HOLD_DELAY_MS = 350;
const CAPACITY_HOLD_INTERVAL_MS = 80;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || "");
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function downscaleDataUrlImage(dataUrl, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, tw, th);
        const optimized = canvas.toDataURL("image/jpeg", quality);
        resolve(optimized || dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function readAndOptimizeImage(file) {
  const original = await readFileAsDataUrl(file);
  const optimized = await downscaleDataUrlImage(original);
  return optimized;
}

export default function ScoreEditor({
  eqType,
  onSwitchEqType,
  vendors,
  sections,
  ALL,
  SEC_OFF,
  act,
  setAct,
  noteOpen,
  setNoteOpen,
  expImgs,
  setExpImgs,
  onScoreChange,
  onNoteChange,
  onImageAdd,
  onImageRemove,
  onProductionRatingChange,
  onProductionCapacityChange,
  onProductionVerdictChange,
  isPortrait,
  onAddVendor,
  onRemoveVendor,
  onVendorNameChange,
  onExportVendorPDF,
  onImport,
  onExportVendorForm,
  onShowReset,
  infoPopup,
  setInfoPopup,
  getTechReq,
}) {
  const itemCount = ALL.length;
  const filled = sc => sc.filter(x => x != null).length;
  const wbBadge = (w) => { const wc = WC[w] || WC[1]; return { fontSize: 11, fontWeight: 700, color: wc.c, whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1 }; };
  const setScore = onScoreChange;
  const setNote = onNoteChange;
  const addImage = onImageAdd;
  const rmImage = onImageRemove;
  const addV = onAddVendor;
  const rmV = onRemoveVendor;
  const setName = onVendorNameChange;
  const exportVendorPDF = onExportVendorPDF;
  const importFile = onImport;
  const exportVendorForm = onExportVendorForm;
  const productionRatingOptions = ["Не оценивалось", "Плохо", "Удовлетворительно", "Хорошо"];
  const productionRatingStyles = {
    "Не оценивалось": { c: "#7B97B2", bg: "#F8FAFC", bd: "#D7E1EC" },
    "Плохо": { c: "#EF4444", bg: "#FEF2F2", bd: "#FECACA" },
    "Удовлетворительно": { c: "#F59E0B", bg: "#FFFBEB", bd: "#FDE68A" },
    "Хорошо": { c: "#10B981", bg: "#ECFDF5", bd: "#A7F3D0" },
  };
  const productionVerdictOptions = [
    { key: "not_recommended", label: "Не рекомендован", c: "#EF4444", bg: "#FEF2F2", bd: "#FECACA" },
    { key: "rework", label: "На доработку", c: "#F59E0B", bg: "#FFFBEB", bd: "#FDE68A" },
    { key: "recommended", label: "Рекомендован", c: "#10B981", bg: "#ECFDF5", bd: "#A7F3D0" },
  ];
  const activeVendor = vendors[act] || {};
  const printDate = new Date().toLocaleDateString("ru-RU");
  const sanitizeCapacityValue = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 4);
  const parsedCapacity = Number.parseInt(sanitizeCapacityValue(activeVendor.productionCapacity), 10);
  const currentCapacity = Number.isFinite(parsedCapacity) ? parsedCapacity : 0;
  const currentCapacityRef = useRef(currentCapacity);
  const onProductionCapacityChangeRef = useRef(onProductionCapacityChange);
  const capacityHoldTimeoutRef = useRef(null);
  const capacityHoldIntervalRef = useRef(null);
  const capacityClickResetTimeoutRef = useRef(null);
  const suppressCapacityClickRef = useRef(false);

  useEffect(() => {
    currentCapacityRef.current = currentCapacity;
  }, [currentCapacity]);

  useEffect(() => {
    onProductionCapacityChangeRef.current = onProductionCapacityChange;
  }, [onProductionCapacityChange]);

  useEffect(
    () => () => {
      if (capacityHoldTimeoutRef.current != null) {
        window.clearTimeout(capacityHoldTimeoutRef.current);
      }
      if (capacityHoldIntervalRef.current != null) {
        window.clearInterval(capacityHoldIntervalRef.current);
      }
      if (capacityClickResetTimeoutRef.current != null) {
        window.clearTimeout(capacityClickResetTimeoutRef.current);
      }
    },
    []
  );

  const canDecreaseCapacity = currentCapacity > 0;
  const canIncreaseCapacity = currentCapacity < 9999;
  const stepProductionCapacity = (step) => {
    const nextValue = Math.max(0, Math.min(9999, currentCapacityRef.current + step));
    if (nextValue === currentCapacityRef.current) return false;
    currentCapacityRef.current = nextValue;
    onProductionCapacityChangeRef.current(String(nextValue));
    return true;
  };
  const stopCapacityStepHold = () => {
    if (capacityHoldTimeoutRef.current != null) {
      window.clearTimeout(capacityHoldTimeoutRef.current);
      capacityHoldTimeoutRef.current = null;
    }
    if (capacityHoldIntervalRef.current != null) {
      window.clearInterval(capacityHoldIntervalRef.current);
      capacityHoldIntervalRef.current = null;
    }
    if (capacityClickResetTimeoutRef.current != null) {
      window.clearTimeout(capacityClickResetTimeoutRef.current);
    }
    capacityClickResetTimeoutRef.current = window.setTimeout(() => {
      suppressCapacityClickRef.current = false;
      capacityClickResetTimeoutRef.current = null;
    }, 0);
  };
  const startCapacityStepHold = (step, disabled) => (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    stopCapacityStepHold();
    if (capacityClickResetTimeoutRef.current != null) {
      window.clearTimeout(capacityClickResetTimeoutRef.current);
      capacityClickResetTimeoutRef.current = null;
    }
    suppressCapacityClickRef.current = true;

    if (typeof event.currentTarget.setPointerCapture === "function") {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures and fall back to local pointer events.
      }
    }

    const didStep = stepProductionCapacity(step);
    if (!didStep) {
      suppressCapacityClickRef.current = false;
      return;
    }

    capacityHoldTimeoutRef.current = window.setTimeout(() => {
      capacityHoldIntervalRef.current = window.setInterval(() => {
        const repeated = stepProductionCapacity(step);
        if (!repeated) stopCapacityStepHold();
      }, CAPACITY_HOLD_INTERVAL_MS);
    }, CAPACITY_HOLD_DELAY_MS);
  };
  const handleCapacityStepClick = (step) => (event) => {
    if (suppressCapacityClickRef.current) {
      suppressCapacityClickRef.current = false;
      event.preventDefault();
      return;
    }
    stepProductionCapacity(step);
  };

  return <div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div
        data-print-header=""
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #E5EAF0",
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <div style={{display:"inline-flex",alignItems:"center"}}>
          <Logo h={22} />
        </div>
        <div style={{fontSize:12,fontWeight:600,color:B.graphite,textAlign:"center"}}>
          Отчёт по тестированию оборудования
        </div>
        <div style={{fontSize:11,color:"#7B97B2",whiteSpace:"nowrap"}}>
          {printDate}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EQ_TYPES.map((t) => (
            <button key={t} onClick={() => onSwitchEqType(t)} className={`btn-eq-type ${eqType===t?"btn-eq-type-active":""}`}>
              {t==="стойка"?"Стойка":"PDU"}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <div style={{display:"inline-flex",gap:6,padding:"8px 16px",background:"#fff",borderRadius:12,border:`1px solid ${B.border}`,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
          <IconNo c="#EF4444" s={13}/><span style={{fontSize:11,color:"#EF4444",fontWeight:600}}>Нет</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconMid c="#F59E0B" s={13}/><span style={{fontSize:11,color:"#F59E0B",fontWeight:600}}>Частично</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconYes c="#10B981" s={13}/><span style={{fontSize:11,color:"#10B981",fontWeight:600}}>Да</span>
          <span style={{color:B.border,margin:"0 8px 0 4px"}}>│</span>
          <span style={{fontSize:10,color:B.steel}}>ПП</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>ОП</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>П</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        {vendors.length<25&&<button className="btn-add-vendor" onClick={addV} style={{padding:"6px 14px",borderRadius:12,border:"2px dashed #CBD5E1",background:"none",color:B.steel,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>{isPortrait ? '+' : '+ Добавить вендора'}</button>}
        <button className="btn-danger" onClick={onShowReset} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid #EF4444`,background:"#fff",color:"#EF4444",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s ease"}}>Сбросить</button>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button type="button" className="btn-action btn-action-pdf" onClick={()=>exportVendorPDF(act)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 3v7M5 8l3 3 3-3" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="btn-action-label">Отчет</span>
            <span className="btn-action-format btn-action-format-pdf">PDF</span>
          </button>
          <button type="button" className="btn-action btn-action-xlsx-import" onClick={importFile}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 10V3M5 6l3-3 3 3" stroke="#2F9AFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="btn-action-label">Импорт</span>
            <span className="btn-action-format btn-action-format-xlsx-import">XLSX</span>
          </button>
          <button type="button" className="btn-action btn-action-xlsx-export" onClick={exportVendorForm}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M8 3v7M5 8l3 3 3-3" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="btn-action-label">Экспорт</span>
            <span className="btn-action-format btn-action-format-xlsx">XLSX</span>
          </button>
        </div>
      </div>
      <div className="vendor-tabs-wrap" style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {vendors.map((v,i)=>{return <div key={i} data-vendor-tab-pill="" onClick={()=>setAct(i)} style={{display:"inline-flex",alignItems:"center",borderRadius:12,cursor:"pointer",background:i===act?VC[i%VC.length]+"10":"#fff",border:`2px solid ${i===act?VC[i%VC.length]:B.border}`,transition:"all 0.2s",maxWidth:260,minWidth:"auto",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 8px 6px 12px",minWidth:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:VC[i%VC.length],flexShrink:0}}/><input value={v.name} onChange={e=>setName(i,e.target.value)} onClick={e=>e.stopPropagation()} style={{background:"none",border:"none",color:B.graphite,fontSize:12,fontWeight:i===act?700:400,width:Math.min(Math.max(v.name.length*7.5,60),140),minWidth:"9ch",maxWidth:140,outline:"none",overflow:"hidden",textOverflow:"ellipsis"}} title={v.name}/><span style={{fontSize:9,color:B.steel,flexShrink:0,whiteSpace:"nowrap"}}>{filled(v.scores)}/{itemCount}</span>
          </div>
          {vendors.length>1&&<span className="vendor-rm" onClick={e=>{e.stopPropagation();rmV(i);}} style={{borderLeft:`1px solid rgba(0,0,0,0.12)`,padding:"0 9px",cursor:"pointer",color:B.steel,fontSize:14,flexShrink:0,display:"flex",alignItems:"center",alignSelf:"stretch",transition:"all 0.15s ease"}}>×</span>}
        </div>;})}
      </div>
      <div data-production-info="" className="production-panel" style={{background:"#fff",border:"1px solid #E5EAF0",borderRadius:12,padding:16,marginBottom:16}}>
        <div className="production-panel-grid" style={{display:"flex",gap:24,justifyContent:"space-between"}}>
          <div className="production-panel-left" style={{flex:"1 1 auto",minWidth:0,display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
            <div className="production-panel-title production-panel-title-left" style={{fontSize:12,fontWeight:600,color:B.graphite,marginBottom:10,textAlign:"left"}}>Оценка производства</div>
            <div className="production-rating-options" style={{display:"flex",gap:8,flexWrap:"nowrap",justifyContent:"center"}}>
              {productionRatingOptions.map((option) => {
                const isActive = activeVendor.productionRating === option;
                const palette = productionRatingStyles[option] || productionRatingStyles["Не оценивалось"];
                return (
                  <button
                    key={option}
                    type="button"
                    className={`btn-eq-type production-rating-pill ${isActive ? "production-rating-pill-active" : ""}`}
                    onClick={() => onProductionRatingChange(option)}
                    style={{ "--pill-color": palette.c, "--pill-bg": palette.bg, "--pill-border": palette.bd }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:12,fontWeight:600,color:B.graphite,marginTop:12,marginBottom:8,textAlign:"left"}}>Вывод</div>
            <div className="production-verdict-options" style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-start"}}>
              {productionVerdictOptions.map((option) => {
                const isActive = activeVendor.productionVerdict === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`btn-eq-type production-verdict-pill ${isActive ? "production-verdict-pill-active" : ""}`}
                    onClick={() => onProductionVerdictChange(isActive ? null : option.key)}
                    style={{ "--pill-color": option.c, "--pill-bg": option.bg, "--pill-border": option.bd }}
                  >
                    {isActive ? "\u2713 " : ""}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="production-panel-divider" style={{width:1,background:"#E5EAF0",flexShrink:0}} />
          <div className="production-panel-right" style={{flex:"0 0 auto",minWidth:0,display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <div className="production-panel-title production-panel-title-right" style={{fontSize:12,fontWeight:600,color:B.graphite,marginBottom:10,textAlign:"right"}}>Производственная мощность</div>
            <div className="production-capacity-row" style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
              <div className="production-capacity-note-like">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="production-capacity-input"
                  value={activeVendor.productionCapacity ?? ""}
                  onChange={(e) => onProductionCapacityChange(sanitizeCapacityValue(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (canIncreaseCapacity) stepProductionCapacity(1);
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (canDecreaseCapacity) stepProductionCapacity(-1);
                    }
                  }}
                />
              </div>
              <div className="production-capacity-stepper">
                <button
                  type="button"
                  className="btn-capacity-step"
                  onClick={handleCapacityStepClick(1)}
                  onPointerDown={startCapacityStepHold(1, !canIncreaseCapacity)}
                  onPointerUp={stopCapacityStepHold}
                  onPointerCancel={stopCapacityStepHold}
                  onPointerLeave={stopCapacityStepHold}
                  onLostPointerCapture={stopCapacityStepHold}
                  disabled={!canIncreaseCapacity}
                  aria-label="Increase production capacity by 1"
                >
                  {"\u25B2"}
                </button>
                <button
                  type="button"
                  className="btn-capacity-step"
                  onClick={handleCapacityStepClick(-1)}
                  onPointerDown={startCapacityStepHold(-1, !canDecreaseCapacity)}
                  onPointerUp={stopCapacityStepHold}
                  onPointerCancel={stopCapacityStepHold}
                  onPointerLeave={stopCapacityStepHold}
                  onLostPointerCapture={stopCapacityStepHold}
                  disabled={!canDecreaseCapacity}
                  aria-label="Decrease production capacity by 1"
                >
                  {"\u25BC"}
                </button>
              </div>
              <span style={{fontSize:12,color:B.steel,whiteSpace:"nowrap"}}>ед./мес.</span>
            </div>
          </div>
        </div>
      </div>
      {sections.map((sec,si)=>{const off=SEC_OFF[si];
        return <div key={si} style={{marginBottom:12}}>
          <div style={{padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",fontSize:12,fontWeight:700,color:"#fff",borderLeft:`3px solid ${VC[si%VC.length]}`}}>{sec.n}</div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            {sec.items.map((it,ii)=>{const idx=off+ii;const v=vendors[act]?.scores[idx];const nt=vendors[act]?.notes[idx]||"";const imgs=vendors[act]?.images?.[idx]||null;const hasImgs=imgs&&imgs.length>0;const isExp=noteOpen===idx||noteOpen===-999;const isReq=it.w>=1;const hasNote=nt&&nt.trim()!==""&&nt.trim()!=="<br>"&&nt.trim()!=="<div><br></div>";const techReq=getTechReq(sec.n,it.n);
              return <div key={ii} style={{borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div style={{display:"flex",alignItems:"center",padding:"8px 16px",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 150px",minWidth:0}}>
                    <div className="input-item-name" style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                      <span style={{fontSize:12,color:B.graphite,whiteSpace:"normal",wordBreak:"break-word",lineHeight:"1.4",textAlign:"left",minWidth:0}}>{it.n}</span>
                      <span style={wbBadge(it.w)}>{it.w===2?"ПП":it.w===1?"ОП":"П"}</span>
                      {techReq&&<div style={{position:"relative",display:"inline-flex"}}>
                        {infoPopup===idx&&(
                          <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",zIndex:300,background:"#334155",color:"#fff",fontSize:11,fontWeight:500,padding:"8px 12px",borderRadius:8,width:240,lineHeight:"1.5",boxShadow:"0 4px 16px rgba(0,0,0,0.22)",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:"left"}}>
                            <div style={{fontWeight:700,marginBottom:4,fontSize:12}}>{it.n}</div>
                            {techReq}
                            <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/>
                          </div>
                        )}
                        <button type="button" onClick={e=>{e.stopPropagation();setInfoPopup(infoPopup===idx?null:idx);}} style={{background:"none",border:"none",padding:"0 2px",cursor:"pointer",color:B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}} title="Тех. условие">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                            <line x1="8" y1="7" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                            <circle cx="8" cy="4.8" r="0.9" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>}
                    </div>
                  </div>
                  <div className="input-item-btns" style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
                    {isReq?
                      [0,1,2].map(n2=>{const Ic=ICO[n2];const on=v===n2;return <button className="btn-score" key={n2} onClick={()=>setScore(idx,n2)} style={{width:38,height:38,boxSizing:"border-box",borderRadius:10,border:on?`2px solid ${SM[n2].c}`:`2px solid ${B.border}`,background:on?SM[n2].bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background-color 0.15s,border-color 0.15s,box-shadow 0.15s",boxShadow:on?`0 2px 8px ${SM[n2].c}22`:"none"}}>{Ic({c:on?SM[n2].c:"#B0BEC5",s:16})}</button>;})
                      :
                      [{sc:0,Ic:IconNo,sm:SM[0]},{sc:2,Ic:IconYes,sm:SM[2]}].map(({sc:sv,Ic,sm})=>{const on=v===sv;return <button className="btn-score" key={sv} onClick={()=>setScore(idx,sv)} style={{width:38,height:38,boxSizing:"border-box",borderRadius:10,border:on?`2px solid ${sm.c}`:`2px solid ${B.border}`,background:on?sm.bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background-color 0.15s,border-color 0.15s,box-shadow 0.15s",boxShadow:on?`0 2px 8px ${sm.c}22`:"none"}}>{Ic({c:on?sm.c:"#B0BEC5",s:16})}</button>;})
                    }
                    <button className="btn-score" onClick={()=>setNoteOpen(isExp&&noteOpen!==-999?null:idx)} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${(isExp||hasNote||hasImgs)?B.blue:B.border}`,background:(isExp||hasNote||hasImgs)?B.blue+"10":"#fff",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",color:(isExp||hasNote||hasImgs)?B.blue:B.steel,marginLeft:4,flexShrink:0}} title="Примечание">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                {isExp&&<div style={{padding:"0 16px 10px"}}>
                  <RichNote value={nt} onChange={html=>setNote(idx,html)}/>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    {hasImgs&&imgs.map((im,imIdx)=>{
                      const key=`${idx}-${imIdx}`;
                      const open=expImgs[key];
                      const isImg=!!im.isImg,isVid=!!im.isVid;
                      const isMedia=isImg||isVid;
                      return <div key={imIdx} style={{display:"inline-flex",alignItems:"center",borderRadius:8,border:`1.5px solid ${open&&isMedia?B.blue:B.border}`,background:open&&isMedia?B.blue+"08":"#fff",overflow:"hidden",transition:"all 0.15s"}}>
                        {isMedia
                          ? <button className="btn-icon" onClick={()=>setExpImgs(p=>({...p,[key]:!p[key]}))} style={{padding:"4px 8px",background:"none",border:"none",cursor:"pointer",fontSize:11,color:open?B.blue:B.steel,fontWeight:600,display:"flex",alignItems:"center",gap:4,maxWidth:160,overflow:"hidden"}}>
                              {isVid
                                ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="1" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M11 6l4-2v8l-4-2V6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 12l3.5-4 2.5 2.5L11 6l4 6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                              }
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{im.name}</span>
                            </button>
                          : <span style={{padding:"4px 8px",fontSize:11,color:B.steel,fontWeight:600,display:"flex",alignItems:"center",gap:4,maxWidth:180,overflow:"hidden"}}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2"/></svg>
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{im.name}</span>
                            </span>
                        }
                        <a href={im.data} download={im.name} title="Экспорт" style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:B.blue,display:"flex",alignItems:"center",textDecoration:"none"}}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 8l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </a>
                        <button className="btn-icon-rm" onClick={()=>{rmImage(idx,imIdx);setExpImgs(p=>{const n={...p};delete n[key];return n;});}} style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:"#EF4444",fontSize:13,lineHeight:1,display:"flex",alignItems:"center"}} title="Удалить">×</button>
                      </div>;
                    })}
                    <label className="btn-file-upload" style={{padding:"4px 10px",borderRadius:8,border:`1.5px dashed ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      Файл
                      <input type="file" multiple style={{display:"none"}} onChange={e=>{
                        Array.from(e.target.files).forEach((f) => {
                          void (async () => {
                          const mime=f.type||"";
                          const name=f.name||"";
                          const ext=name.split(".").pop().toLowerCase();
                          const isHeic=ext==="heic"||ext==="heif";
                          const isVid=mime.startsWith("video/");
                          const isImg=mime.startsWith("image/")||isHeic;
                          if(isHeic){
                            const blobUrl=URL.createObjectURL(f);
                            const img=new Image();
                            img.onload=async ()=>{
                              try{
                                const c=document.createElement("canvas");
                                c.width=img.naturalWidth;c.height=img.naturalHeight;
                                c.getContext("2d").drawImage(img,0,0);
                                const jpeg=c.toDataURL("image/jpeg",0.82);
                                const optimized = await downscaleDataUrlImage(jpeg);
                                URL.revokeObjectURL(blobUrl);
                                addImage(idx,name.replace(/\.(heic|heif)$/i,".jpg"),optimized,false,true,false);
                              }catch{
                                URL.revokeObjectURL(blobUrl);
                                const fallback = await readFileAsDataUrl(f);
                                addImage(idx,name,fallback,false,false,false);
                              }
                            };
                            img.onerror=async ()=>{
                              URL.revokeObjectURL(blobUrl);
                              const fallback = await readFileAsDataUrl(f);
                              addImage(idx,name,fallback,false,false,false);
                            };
                            img.src=blobUrl;
                          }else if(isVid){
                            const videoData = await readFileAsDataUrl(f);
                            addImage(idx,name,videoData,false,false,true);
                          }else if(isImg){
                            const optimized = await readAndOptimizeImage(f);
                            addImage(idx,name,optimized,false,true,false);
                          }else{
                            const fileData = await readFileAsDataUrl(f);
                            addImage(idx,name,fileData,false,false,false);
                          }
                          })().catch(() => {});
                        });
                        e.target.value="";
                      }}/>
                    </label>
                  </div>
                  {hasImgs&&imgs.map((im,imIdx)=>{const key=`${idx}-${imIdx}`;
                    if(!expImgs[key])return null;
                    if(im.isVid)return <div key={imIdx} style={{marginTop:6}}><video src={im.data} controls style={{maxWidth:"100%",maxHeight:300,borderRadius:8,border:`1px solid ${B.border}`,display:"block"}}/></div>;
                    if(im.isImg)return <div key={imIdx} style={{marginTop:6}}><img src={im.data} alt={im.name} style={{maxWidth:"100%",maxHeight:300,borderRadius:8,border:`1px solid ${B.border}`,objectFit:"contain",display:"block"}}/></div>;
                    return null;
                  })}
                </div>}
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>;
}
