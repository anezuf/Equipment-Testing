import { useState } from "react";
import { B, VC, WC, EQ_TYPES } from "../../constants";

export default function ChecklistEditor({
  sections,
  techSpecs,
  eqType,
  isPortrait,
  onSwitchEqType,
  onItemWeightChange,
  onNavigateToInput,
}) {
  const [infoPopup, setInfoPopup] = useState(null);

  return <div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
      <div style={{textAlign:"left"}}>
        <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Редактор чек-листа</div>
        <div style={{fontSize:12,color:B.steel,marginTop:2}}>Вес параметров берется из ТУ и влияет на расчеты</div>
      </div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      {EQ_TYPES.map(t=>
        <button key={t} onClick={()=>onSwitchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
          {t==="стойка"?"Стойка":"PDU"}
        </button>
      )}
    </div>
    {sections.map((sec,si)=>
      <div key={si} style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
          <div style={{flex:1,color:"#fff",fontSize:13,fontWeight:700,minWidth:0}}>{sec.n}</div>
        </div>
        <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
          {sec.items.map((it,ii)=>
            <div key={ii} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none"}}>
              <div style={{flex:1,minWidth:220,color:B.graphite,fontSize:12,lineHeight:"1.4",display:"flex",alignItems:"center",gap:8}}>
                <span>{it.n}</span>
                {techSpecs?.[si]?.items?.[ii]?.n2?.trim() ? (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(e)=>{
                      e.stopPropagation();
                      setInfoPopup((p)=>p&&p.si===si&&p.ii===ii?null:{si,ii});
                    }}
                    style={{width:18,height:18,borderRadius:"50%",border:`1px solid ${B.border}`,background:"#fff",color:B.steel,cursor:"pointer",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}
                    title="Показать требование"
                  >
                    ⓘ
                  </button>
                ) : null}
              </div>
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
              </div>
              {infoPopup?.si===si&&infoPopup?.ii===ii&&techSpecs?.[si]?.items?.[ii]?.n2?.trim()?(
                <div style={{width:"100%",fontSize:12,color:B.steel,background:"#EFF6FF",border:`1px solid ${B.border}`,borderRadius:8,padding:"8px 10px",lineHeight:"1.4"}}>
                  {techSpecs[si].items[ii].n2}
                </div>
              ):null}
            </div>
          )}
        </div>
      </div>
    )}
    <div style={{textAlign:"center",padding:20}}>
      <button className="btn-primary" onClick={onNavigateToInput} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Перейти к оценке →</button>
    </div>
  </div>;
}
