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
        <button key={t} onClick={()=>onSwitchEqType(t)} className={`btn-eq-type ${eqType===t?"btn-eq-type-active":""}`}>
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
                  <div style={{position:"relative",display:"inline-flex"}}>
                    {infoPopup?.si===si&&infoPopup?.ii===ii&&(
                      <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",zIndex:300,background:"#334155",color:"#fff",fontSize:11,fontWeight:500,padding:"8px 12px",borderRadius:8,width:240,lineHeight:"1.5",boxShadow:"0 4px 16px rgba(0,0,0,0.22)",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:"left"}}>
                        <div style={{fontWeight:700,marginBottom:4,fontSize:12}}>{it.n}</div>
                        {techSpecs[si].items[ii].n2}
                        <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e)=>{
                        e.stopPropagation();
                        setInfoPopup((p)=>p&&p.si===si&&p.ii===ii?null:{si,ii});
                      }}
                      style={{background:"none",border:"none",padding:"0 2px",cursor:"pointer",color:B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}
                      title="Показать требование"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                        <line x1="8" y1="7" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
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
