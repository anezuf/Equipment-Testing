import { useState } from "react";
import { B, VC, WC, EQ_TYPES } from "../../constants";

export default function ChecklistEditor({
  sections,
  techSpecs,
  eqType,
  onSwitchEqType,
  onItemWeightChange,
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
                      <div className="info-tooltip-box" style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",zIndex:300,fontSize:11,fontWeight:500,width:240,lineHeight:"1.5",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:"left"}}>
                        <div className="info-tooltip-title">{it.n}</div>
                        <div className="info-tooltip-body">{techSpecs[si].items[ii].n2}</div>
                        <div className="info-tooltip-arrow" aria-hidden />
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
                {[{w:2,label:"ПП",cls:"btn-score-critical",title:"ПП (Приоритетный параметр)"},{w:1,label:"ОП",cls:"btn-score-req"},{w:0,label:"П",cls:"btn-score-adv"}].map(({w:wv,label,cls,title})=>{
                  const on=it.w===wv;
                  const wc=WC[wv] || WC[1];
                  return <button type="button" className={`btn-score ${cls}`} key={wv} onClick={()=>{if(it.w===wv)return;onItemWeightChange(si,ii,wv);}} style={{width:44,height:28,boxSizing:"border-box",borderRadius:8,border:on?`2px solid ${wc.bc}`:"2px solid #E5EAF0",background:on?wc.bg:"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:on?wc.c:"#7B97B2",transition:"background-color 0.15s,border-color 0.15s,color 0.15s",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:2,flexShrink:0}} title={title}>
                    <span className="editor-btn-label"> {label}</span>
                  </button>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>;
}
