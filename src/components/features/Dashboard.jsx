import { memo, useCallback, useMemo } from "react";
import { B, VC, ICO } from "../../constants";
import { fmt } from "../../utils";
import { mkAll } from "../../sections";
import { hasFail } from "../../scoring";
import Gauge from "../Gauge";
import SegBar from "../SegBar";
import HeatmapTh from "../HeatmapTh";

const [,,IconYes] = ICO;

function Dashboard({
  vendors,
  sections,
  totals,
  allSec,
  sortedIdx,
  heatmapSort,
  setHeatmapSort,
  heatmapSelectedVendor,
  setHeatmapSelectedVendor,
  setNotePopup,
  SEC_OFF,
  getAdvantages,
}) {
  const ALL = useMemo(() => mkAll(sections), [sections]);
  const fails = useMemo(() => vendors.map(v => hasFail(v.scores, ALL)), [vendors, ALL]);
  const advCounts = useMemo(() => vendors.map(v => ALL.filter((it, i) => it.w === 0 && v.scores[i] != null && v.scores[i] > 0).length), [vendors, ALL]);
  const advantagesByVendor = useMemo(() => vendors.map(v => getAdvantages(v.scores)), [vendors, getAdvantages]);
  const getScorePalette = useMemo(() => {
    return (value, zeroTextColor, zeroBgColor = "#F1F5F9") => ({
      bg: value >= 8 ? "#D1FAE5" : value >= 5 ? "#FEF3C7" : value > 0 ? "#FEE2E2" : zeroBgColor,
      tc: value >= 8 ? "#065F46" : value >= 5 ? "#92400E" : value > 0 ? "#991B1B" : zeroTextColor,
    });
  }, []);
  const handleHeatmapSortSection = useCallback((si, sectionName) => {
    const isActive = heatmapSort.col === si;
    const next = isActive ? null : si;
    setHeatmapSort({ col: next, label: next === null ? null : sectionName });
  }, [heatmapSort.col, setHeatmapSort]);
  const handleHeatmapSortTotal = useCallback(() => {
    setHeatmapSort({ col: null, label: null });
  }, [setHeatmapSort]);
  const heatmapSortHandlers = useMemo(
    () => sections.map((s, si) => () => handleHeatmapSortSection(si, s.n)),
    [sections, handleHeatmapSortSection]
  );
  const ranks = useMemo(() => {
    const indexed = vendors.map((_, i) => i).filter(i => totals[i] != null);
    indexed.sort((a, b) => {
      const ta = totals[a], tb = totals[b];
      if (tb !== ta) return tb - ta;
      return advCounts[b] - advCounts[a];
    });
    const result = Array(vendors.length).fill(null);
    [0, 1, 2].forEach(pos => { if (indexed[pos] != null) result[indexed[pos]] = pos + 1; });
    return result;
  }, [totals, advCounts, vendors]);
  const heatmapSortedIdx = useMemo(() => {
    const arr = vendors.map((_, i) => i);
    arr.sort((a, b) => {
      const va = heatmapSort.col === null ? totals[a] : (allSec[a] ? allSec[a][heatmapSort.col] : 0);
      const vb = heatmapSort.col === null ? totals[b] : (allSec[b] ? allSec[b][heatmapSort.col] : 0);
      const na = va == null ? -1 : va, nb = vb == null ? -1 : vb;
      if (nb !== na) return nb - na;
      return a - b;
    });
    return arr;
  }, [vendors, totals, allSec, heatmapSort]);

  return <div data-dash="" style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
    {/* Gauges */}
    <div data-gauges="" style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:12,marginBottom:24}}>
      {sortedIdx.map(i=><Gauge key={i} value={totals[i]} color={VC[i%VC.length]} label={vendors[i].name} rank={ranks[i]} fail={fails[i]}/>)}
    </div>

    {/* Heatmap — full width */}
    <div data-heatmap="" style={{background:"#F5F8FB",borderRadius:16,padding:16,marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:B.graphite}}>Сравнение по разделам</div>
        <div style={{height:28,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
          {heatmapSort.col===null
            ?<span data-no-print="" style={{fontSize:11,color:B.steel}}>← нажмите на номер для сортировки</span>
            :<span onClick={()=>setHeatmapSort({col:null,label:null})} style={{fontSize:11,fontWeight:700,color:B.blue,background:"#EFF6FF",padding:"4px 14px",borderRadius:20,border:"1px solid #BFDBFE",cursor:"pointer"}}>{heatmapSort.label}</span>}
        </div>
      </div>
      <div data-heatmap-legend="" style={{display:"none",marginBottom:10,fontSize:9,color:B.graphite,columnCount:2,columnGap:16}}>
        {sections.map((s,si)=><div key={si} style={{marginBottom:3}}><span style={{fontWeight:700,color:B.blue}}>{si+1}.</span> {s.n}</div>)}
      </div>
      <div className="heatmap-table-wrap">
      <div style={{borderRadius:12,overflow:"visible",border:"1px solid #E5EAF0",background:"#fff"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,tableLayout:"fixed"}}>
        <thead>
          <tr>
            <th style={{textAlign:"center",padding:"6px 8px",fontSize:10,color:B.steel,fontWeight:600,width:120}}>Вендор</th>
            {sections.map((s,si)=>{
              const active=heatmapSort.col===si;
              return <HeatmapTh key={si} si={si} s={s} active={active} onSort={heatmapSortHandlers[si]}/>;
            })}
            <th onClick={handleHeatmapSortTotal} style={{textAlign:"center",padding:"6px 4px",fontSize:10,fontWeight:heatmapSort.col===null?800:700,color:heatmapSort.col===null?B.blue:B.graphite,width:50,cursor:"pointer",userSelect:"none",transition:"color 0.15s"}}>Итого</th>
          </tr>
        </thead>
        <tbody>
          {heatmapSortedIdx.map((i,rank)=>{const v=vendors[i];const t=totals[i];const isLastRow=rank===heatmapSortedIdx.length-1;
            const rowBg="#fff";
            const totalPalette = getScorePalette(t ?? 0, B.steel, rowBg);
            return <tr key={i} onClick={() => setHeatmapSelectedVendor(prev => prev === i ? null : i)} style={{borderBottom:isLastRow?"none":`1px solid #F1F5F9`,cursor:"pointer",opacity:heatmapSelectedVendor !== null && heatmapSelectedVendor !== i ? 0.4 : 1,transition:"opacity 0.2s"}}>
              <td title={v.name} style={{padding:"6px 8px",fontSize:10,fontWeight:600,color:VC[i%VC.length],textAlign:"center",background:`linear-gradient(to right, ${VC[i%VC.length]} 0 3px, ${rowBg} 3px)`,borderRight:`1px solid ${B.border}`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderRadius:isLastRow?"0 0 0 12px":undefined,backgroundClip:"padding-box"}}>{v.name}</td>
              {sections.map((s,si)=>{
                const val=allSec[i]?allSec[i][si]:0;
                const { bg, tc } = getScorePalette(val, "#CBD5E1");
                const isActiveCol=heatmapSort.col===si;
                return <td key={si} style={{textAlign:"center",padding:"6px 2px",background:bg,fontWeight:isActiveCol?800:700,fontSize:10,color:tc,outline:isActiveCol?`1.5px solid ${B.blue}40`:undefined,outlineOffset:-1}}>{val===0?"—":fmt(val)}</td>;
              })}
              <td style={{textAlign:"center",padding:"6px 4px",fontWeight:800,fontSize:11,color:totalPalette.tc,background:totalPalette.bg,borderLeft:`2px solid ${B.border}`,borderRadius:isLastRow?"0 0 12px 0":undefined,clipPath:isLastRow?"inset(0 round 0 0 12px 0)":undefined}}>{fmt(t)}</td>
            </tr>;
          })}
        </tbody>
      </table>
      </div>
      </div>
    </div>

    {/* Vendor bars */}
    <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:24}}>
      <div data-bars-wrap="" style={{flex:"1 1 100%",display:"flex",flexWrap:"wrap",gap:10}}>
        {sortedIdx.map(i=>{const v=vendors[i];
          return <div data-vendor-bars="" key={i} style={{flex:"1 1 calc(50% - 8px)",maxWidth:"calc(50% - 8px)",minWidth:0,background:"#fff",borderRadius:16,padding:12,border:`1px solid ${B.border}`,overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:700,color:VC[i%VC.length],marginBottom:6}}>{v.name} — {fmt(totals[i])}/10</div>
          {sections.map((s,si)=>{
            const val=allSec[i]?allSec[i][si]:0;
            const { bg: valBg, tc: valC } = getScorePalette(val, "#7B97B2");
            return <div key={si} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <div className="sec-bar-label" title={s.n}>{s.n}</div>
              <div style={{flex:1,minWidth:0}}><SegBar scores={v.scores} notes={v.notes} images={v.images} si={si} onNoteClick={setNotePopup} secs={sections} offs={SEC_OFF} sortByColor/></div>
              <div style={{width:36,height:20,borderRadius:6,fontSize:11,fontWeight:700,background:valBg,color:valC,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{fmt(val)}</div>
            </div>;
          })}
          <div className="vendor-legend-row" style={{display:"flex",gap:8,marginTop:6,marginLeft:0,paddingTop:6,paddingLeft:0,borderTop:"1px solid #F1F5F9",flexWrap:"wrap",justifyContent:"center"}}>
            <div className="vendor-legend-center" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#10B981"}}><div style={{width:8,height:8,borderRadius:2,background:"#10B981"}}/>Да</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#F59E0B"}}><div style={{width:8,height:8,borderRadius:2,background:"#F59E0B"}}/>Частично</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#EF4444"}}><div style={{width:8,height:8,borderRadius:2,background:"#EF4444"}}/>Нет</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:B.steel}}><div style={{width:8,height:8,borderRadius:2,background:"#E2E8F0"}}/>Нет оценки</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:B.steel}}><div style={{width:6,height:6,borderRadius:"50%",background:"#fff",border:"1px solid #999"}}/>Примечание</div>
            </div>
          </div>
        </div>;})}
      </div>
    </div>

    {/* Top/bottom */}
    <div data-bottom-cards="" style={{display:"flex",flexWrap:"wrap",gap:12}}>
      {sortedIdx.filter(i=>advantagesByVendor[i].length>0).map(i=>{const v=vendors[i];const advs=advantagesByVendor[i];
        return <div key={i} style={{flex:"1 1 280px",minWidth:0,background:"#fff",borderRadius:16,padding:16,border:`1px solid ${B.border}`,borderTop:`3px solid ${VC[i%VC.length]}`}}>
          <div style={{fontSize:13,fontWeight:700,color:VC[i%VC.length],marginBottom:10,wordBreak:"break-word",textAlign:"left"}}>{v.name}</div>
          <div style={{fontSize:9,fontWeight:700,color:B.blue,textTransform:"uppercase",letterSpacing:1,marginBottom:6,textAlign:"left"}}>☆ Преимущества</div>
          {advs.map((a,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",fontSize:11}}><IconYes c="#10B981" s={12} style={{flexShrink:0}}/><span style={{color:B.graphite,wordBreak:"break-word"}}>{a.n}</span></div>)}
        </div>;
      })}
    </div>
  </div>;
}

export default memo(Dashboard);
