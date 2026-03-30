import { B, VC, WC, EQ_TYPES } from "../../constants";

export default function ChecklistEditor({
  sections,
  SEC_OFF,
  eqType,
  isPortrait,
  onImport,
  onExport,
  onSwitchEqType,
  onAddSection,
  onRemoveSection,
  onSectionNameChange,
  onMoveSection,
  onAddItem,
  onRemoveItem,
  onItemNameChange,
  onItemWeightChange,
  onMoveItem,
  onNavigateToInput,
}) {
  return <div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
      <div style={{textAlign:"left"}}>
        <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Редактор чек-листа</div>
        <div style={{fontSize:12,color:B.steel,marginTop:2}}>Настройте разделы, параметры и веса перед оценкой</div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn-secondary" onClick={onImport} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Загрузить
        </button>
        <button className="btn-action" onClick={onExport} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Сохранить
        </button>
      </div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      {EQ_TYPES.map(t=>
        <button key={t} onClick={()=>onSwitchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
          {t==="стойка"?"Стойка":"PDU"}
        </button>
      )}
    </div>
    <div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
      <button className="btn-add-vendor" onClick={onAddSection} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Раздел</button>
    </div>
    {sections.map((sec,si)=>
      <div key={si} style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
          <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
            <button type="button" className="btn-icon" onClick={()=>onMoveSection(si,-1)} disabled={si===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===0?0.3:1,padding:0}}>↑</button>
            <button type="button" className="btn-icon" onClick={()=>onMoveSection(si,1)} disabled={si===sections.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===sections.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===sections.length-1?0.3:1,padding:0}}>↓</button>
          </div>
          <input value={sec.n} onChange={e=>onSectionNameChange(si,e.target.value)} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0}}/>
          {sections.length>1&&<button type="button" className="btn-icon-close" onClick={()=>onRemoveSection(si)} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>}
        </div>
        <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
          {sec.items.map((it,ii)=>
            <div key={ii} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none"}}>
              <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
                <button type="button" className="btn-icon" onClick={()=>onMoveItem(si,ii,-1)} disabled={ii===0} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===0?0.3:1,padding:0}}>↑</button>
                <button type="button" className="btn-icon" onClick={()=>onMoveItem(si,ii,1)} disabled={ii===sec.items.length-1} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===sec.items.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===sec.items.length-1?0.3:1,padding:0}}>↓</button>
              </div>
              <textarea value={it.n} onChange={e=>{onItemNameChange(si,ii,e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} onFocus={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} rows={1} style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",minWidth:0,resize:"none",overflow:"hidden",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0}} placeholder="Название параметра"/>
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <button type="button" className="btn-score" onClick={()=>onItemWeightChange(si,ii,it.w===2?1:2)} style={{width:28,height:28,borderRadius:8,border:it.w===2?`2px solid #DC2626`:`2px solid ${B.border}`,background:it.w===2?"#FEE2E2":"#fff",cursor:"pointer",fontSize:13,fontWeight:800,color:it.w===2?"#DC2626":B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",visibility:it.w>=1?"visible":"hidden"}} title="Критичный параметр (×2)">!</button>
                {[{w:1},{w:0}].map(({w:wv})=>{
                  const on=wv===0?it.w===0:(it.w>=1);
                  const wc=WC[wv];
                  const star=wv===0?"☆":"★";
                  return <button type="button" className="btn-score" key={wv} onClick={()=>onItemWeightChange(si,ii,wv===0?0:1)} style={{padding:"4px 10px",borderRadius:8,border:on?`2px solid ${wc.bc}`:`2px solid ${B.border}`,background:on?wc.bg:"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:on?wc.c:B.steel,transition:"all 0.15s",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:2}}>
                    <span>{star}</span>
                    {isPortrait ? null : <span className="editor-btn-label"> {wv===1 ? "Требование" : "Преимущество"}</span>}
                  </button>;
                })}
                {sec.items.length>1&&<button type="button" className="btn-icon-close" onClick={()=>onRemoveItem(si,ii)} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>×</button>}
              </div>
            </div>
          )}
          <button type="button" className="btn-secondary" onClick={()=>onAddItem(si)} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Добавить параметр</button>
        </div>
      </div>
    )}
    <div style={{textAlign:"center",padding:20}}>
      <button className="btn-primary" onClick={onNavigateToInput} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Перейти к оценке →</button>
    </div>
  </div>;
}
