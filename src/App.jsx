import { useState, useRef, useCallback, useMemo, useEffect } from "react";

import { B, VC, ICO, SM, WL, WC } from "./constants";

const IconNo=({c="#EF4444",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><line x1="4" y1="4" x2="12" y2="12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/><line x1="12" y1="4" x2="4" y2="12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>;
const IconMid=({c="#F59E0B",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>;
const IconYes=({c="#10B981",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><polyline points="3,8.5 6.5,12 13,4.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;

/* Smart number: 10 → "10", 6.7 → "6.7" */
const fmt=(v)=>{if(v==null)return "—";return v%1===0?v.toFixed(0):v.toFixed(1);};

/* Weight: 0=Преимущество (excluded from score), 1=Требование, 2=Требование(!) critical */

const DEF_SECTIONS=[
  {n:"Поставщик",items:[{n:"Производственная мощность",w:1}]},
  {n:"Транспортировка",items:[{n:"Упаковка",w:1},{n:"ЗИП-комплект",w:1},{n:"Готовность к эксплуатации",w:1}]},
  {n:"Габариты и конструктив",items:[{n:"Соответствие габаритов",w:2},{n:"Допустимая высота",w:1},{n:"Направляющие для PDU",w:1},{n:"Кабель PDU vs рама",w:0},{n:"Сдвиг направляющих",w:1},{n:"Разметка направляющих",w:0},{n:"Стандарт EIA-310-D",w:2},{n:"Глубина монтажа",w:1},{n:"Совместимость рельсов",w:0},{n:"Нумерация юнитов",w:0}]},
  {n:"Покраска и маркировка",items:[{n:"Качество покраски",w:1},{n:"Маркировка юнитов",w:1}]},
  {n:"Колёсики и ножки",items:[{n:"Наличие колёсиков",w:1},{n:"Качество колёсиков",w:1},{n:"Регулировка ножек",w:0}]},
  {n:"Ручки и двери",items:[{n:"Ручки",w:1},{n:"Угол открытия",w:1},{n:"Перфорация дверей",w:1},{n:"Петли",w:0},{n:"Замки",w:1},{n:"Съёмность панелей",w:0}]},
  {n:"Кабельные вводы",items:[{n:"Щёточные вводы",w:1},{n:"Заземление",w:2}]},
  {n:"Нагрузка и прочность",items:[{n:"Стат. грузоподъёмность",w:2},{n:"Дин. грузоподъёмность",w:2},{n:"Устойчивость",w:1},{n:"Жёсткость каркаса",w:0}]},
  {n:"Крыша и основание",items:[{n:"Кабельные вырезы",w:1},{n:"Основание",w:0},{n:"Крепление к полу",w:0}]},
  {n:"Кабельная организация",items:[{n:"Органайзеры",w:1},{n:"Кабельные проходы",w:0}]},
  {n:"Документация",items:[{n:"Паспорт",w:1},{n:"Сертификаты",w:2},{n:"Гарантия",w:0}]},
];
const mkAll=secs=>secs.flatMap(s=>s.items.map(it=>({...it,sec:s.n})));
const mkOff=secs=>secs.map((_,i)=>secs.slice(0,i).reduce((a,s)=>a+s.items.length,0));

/*
  Scoring logic:
  - Преимущество (w=0): excluded from calculation entirely
  - Требование (w=1): base=1, Требование! (w=2): base=2
  - Coefficients: score 0→0, score 1→0.5, score 2→1
  - Item points = base × coefficient
  - Total = (sum_earned / sum_max_ALL) × 10
  - sum_max_ALL = sum of base points for ALL Требования items (not just scored)
  - hasFail: any Требование (w>=1) with score===0
*/
const coeff=[0,0.5,1]; // score 0,1,2 → coefficient
function calcTotal(sc,all){
  let earned=0,maxPts=0;
  all.forEach((it,i)=>{
    if(it.w<1)return; // skip Преимущества
    maxPts+=it.w; // always count towards max
    if(sc[i]==null)return; // unfilled = 0 earned
    earned+=it.w*coeff[sc[i]];
  });
  if(maxPts===0)return null;
  return earned/maxPts*10;
}
function calcSec(sc,si,secs,offs){
  const off=offs[si];let earned=0,maxPts=0;
  secs[si].items.forEach((it,ii)=>{const v=sc[off+ii];
    if(it.w<1)return;
    maxPts+=it.w; // always count towards max
    if(v==null)return;
    earned+=it.w*coeff[v];
  });
  return maxPts===0?0:earned/maxPts*10;
}
function hasFail(sc,all){return all.some((it,i)=>it.w>=1&&sc[i]===0);}

const Logo=({h=28})=><svg height={h} viewBox="195 230 1530 600" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
  <path fill="#2F9AFF" d="M416.3,825.4c-114.3,0-207.3-93-207.3-207.3S301.9,411,416.1,410.9C446.5,300.5,560.7,235.7,671,266.1c70.4,19.4,125.4,74.4,144.8,144.9c45.4-9,145-17,238.8,53.3c10.2,7.6,12.2,22.1,4.6,32.2c-7.6,10.2-22.1,12.2-32.2,4.6l0,0c-43.4-32.6-93.6-49.3-149.2-49.7c-42.3-0.3-71.9,9.4-72.2,9.5c-12.1,4-25.2-2.5-29.2-14.6c-0.4-1.3-0.7-2.6-0.9-3.9c-11.4-78.5-80-137.7-159.5-137.7c-78.6-0.2-145.8,56.5-158.9,134c-2,11.9-12.9,20.2-24.9,19.1c-5.3-0.5-10.6-0.8-15.9-0.8c-88.9,0-161.2,72.3-161.2,161.2s72.3,161.2,161.2,161.2c29.3,0,58.1-8,83.2-23.1c10.9-6.6,25-3.1,31.6,7.8s3.1,25-7.8,31.6C491,815.1,454,825.4,416.3,825.4z"/>
  <path fill="#1E1E1E" d="M580.1,654.2v53.3h-37.8V530.3H612c24.5,0,42.5,5.8,54.1,17.4c11.6,11.6,17.4,26.7,17.4,45.4c0,14.8-3.6,27.1-10.8,37s-16,16.8-26.5,20.7c-10.5,3.9-22.2,5.9-35.3,5.9S587.6,655.9,580.1,654.2z M580.1,563.4v59.7c5.4,1.1,13.9,1.7,25.5,1.7c25.6,0,38.4-10.8,38.4-32.5c0-19.2-11.4-28.9-34.2-28.9H580.1z"/><path fill="#1E1E1E" d="M689.1,563.4v-33.1h148.5v33.1h-56v144.1h-36.5V563.4H689.1z"/><path fill="#1E1E1E" d="M859,707.4V530.3h37.8V604h8.7l61.7-73.7h44.3l-73.2,85.5l81.8,91.7h-49.4L906,632.9h-9.3v74.5H859z"/><path fill="#1E1E1E" d="M1093,655.9h-86.6v-35.6h86.6V655.9z"/><path fill="#1E1E1E" d="M1237.6,673.8V530.3h37.8v143.5h26.6v66.7h-36.4v-33.1h-140.1V530.3h37.8v143.5H1237.6z"/><path fill="#1E1E1E" d="M1414.4,712.5c-27.8,0-50.4-8.6-67.7-25.8s-26.1-39.5-26.5-67c0.4-27.5,9.2-49.7,26.5-66.8s39.8-25.6,67.7-25.7c28,0,50.6,8.5,67.7,25.5c17.1,17,25.9,39.3,26.2,67c-0.4,27.5-9.1,49.8-26.2,67C1465,703.9,1442.5,712.5,1414.4,712.5z M1375.4,661.6c10.1,10.4,23.1,15.6,39,15.6c15.9,0,28.9-5.2,39.1-15.6c10.2-10.4,15.3-24.3,15.3-41.9s-5.1-31.6-15.3-42c-10.2-10.5-23.2-15.7-39.1-15.7s-28.9,5.2-39,15.7c-10.1,10.5-15.1,24.5-15.1,42C1360.3,637.2,1365.4,651.2,1375.4,661.6z"/><path fill="#1E1E1E" d="M1523.7,740.5v-66.7h16.5c7.2-16.7,12.3-34.1,15.4-52c3.2-18.2,4.8-42,4.8-71.3v-20.2h127.8v143.5h20.7v66.7h-35.6v-33.1h-114.1v33.1H1523.7z M1650.7,563.9h-54.4V583c0,33.6-5.6,63.9-16.8,90.8h71.2V563.9z"/>
  <path fill="#7B98B3" d="M336.9,552.5c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,575.5,336.9,565.2,336.9,552.5z"/><path fill="#7B98B3" d="M336.9,685.1c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,708.2,336.9,697.9,336.9,685.1z"/><path fill="#7B98B3" d="M336.9,618.9c0-12.7,10.3-23,23-23h113.4c12.7,0,23,10.3,23,23c0,12.7-10.3,23-23,23H359.9C347.2,641.9,336.9,631.6,336.9,618.9z"/>
</svg>;

function Gauge({value,color,label,rank,fail,size=90}){
  const r=(size-8)/2,circ=2*Math.PI*r,dash=circ*0.75,off=dash*(1-(value!=null?value/10:0));
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 12px 10px",background:fail?"#FEF2F2":"#fff",borderRadius:14,border:fail?"2px solid #EF4444":`1px solid ${B.border}`,flex:"1 1 120px",maxWidth:160,minWidth:110,position:"relative",borderTop:fail?"3px solid #EF4444":`3px solid ${color}`}}>
    {rank!=null&&<div style={{position:"absolute",top:6,right:6,width:20,height:20,borderRadius:"50%",background:rank===1?"#10B981":rank===2?"#F59E0B":rank===3?"#EF4444":B.steel,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>{rank}</div>}
    <div style={{fontSize:11,fontWeight:600,color:B.graphite,marginBottom:6,textAlign:"center",lineHeight:"1.3",wordBreak:"break-word",paddingRight:rank!=null?16:0}}>{label}</div>
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="5" strokeDasharray={`${dash} ${circ}`} transform={`rotate(135 ${size/2} ${size/2})`}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`} style={{transition:"all 0.6s"}}/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={B.graphite} fontSize="20" fontWeight="800" fontFamily="Inter">{fmt(value)}</text>
      </svg>
      <div style={{position:"absolute",bottom:4,left:"50%",transform:"translateX(-50%)",fontSize:9,color:B.steel,fontWeight:500,letterSpacing:"0.5px",whiteSpace:"nowrap"}}>из 10</div>
    </div>
    {fail&&<div style={{height:0}}/>}
  </div>;
}


/* ─── Rich text note editor (contentEditable, zero deps) ─── */
function RichNote({value,onChange}){
  const ref=useRef(null);
  const [fmts,setFmts]=useState({bold:false,italic:false,strike:false,ul:false,ol:false});
  const focused=useRef(false);

  /* Sync external value only when not focused */
  useEffect(()=>{
    if(!focused.current&&ref.current){
      const cur=ref.current.innerHTML;
      const next=value||"";
      if(cur!==next)ref.current.innerHTML=next;
    }
  },[value]);

  const updateFmts=()=>{
    setFmts({
      bold:document.queryCommandState("bold"),
      italic:document.queryCommandState("italic"),
      strike:document.queryCommandState("strikeThrough"),
      ul:document.queryCommandState("insertUnorderedList"),
      ol:document.queryCommandState("insertOrderedList"),
    });
  };

  const exec=(c)=>{
    ref.current?.focus();
    document.execCommand(c,false,null);
    onChange(ref.current?.innerHTML||"");
    updateFmts();
  };

  const toggleList=(tag)=>{
    ref.current?.focus();
    const sel=window.getSelection();
    if(!sel||!ref.current)return;
    /* Check if already inside the requested list type */
    let node=sel.anchorNode;
    while(node&&node!==ref.current){
      if(node.nodeName===tag){
        /* Unwrap: replace list with plain text lines */
        const items=[...node.querySelectorAll("li")].map(li=>li.textContent).join("\n");
        const p=document.createElement("div");
        p.textContent=items;
        node.replaceWith(p);
        onChange(ref.current.innerHTML);
        updateFmts();
        return;
      }
      node=node.parentNode;
    }
    /* Wrap selection in list */
    const listCmd=tag==="UL"?"insertUnorderedList":"insertOrderedList";
    document.execCommand(listCmd,false,null);
    onChange(ref.current?.innerHTML||"");
    updateFmts();
  };

  const Btn=({onMD,active,title,children})=>(
    <button type="button"
      onMouseDown={e=>{e.preventDefault();onMD();}}
      title={title}
      style={{width:26,height:26,borderRadius:5,
        border:`1px solid ${active?"#2F9AFF":"#E5EAF0"}`,
        background:active?"#EFF6FF":"#fff",
        color:active?"#2F9AFF":"#7B97B2",
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:12,fontWeight:700,transition:"all 0.15s",flexShrink:0}}>
      {children}
    </button>
  );

  return(
    <div style={{border:"1.5px solid #2F9AFF",borderRadius:8,background:"#F8FBFF",overflow:"hidden"}}>
      <div style={{display:"flex",gap:3,padding:"4px 8px",borderBottom:"1px solid #E5EAF0",background:"#fff",flexWrap:"wrap",alignItems:"center"}}>
        <Btn onMD={()=>exec("bold")}         active={fmts.bold}   title="Жирный (Ctrl+B)"><b>B</b></Btn>
        <Btn onMD={()=>exec("italic")}       active={fmts.italic} title="Курсив (Ctrl+I)"><i style={{fontStyle:"italic"}}>I</i></Btn>
        <Btn onMD={()=>exec("strikeThrough")}active={fmts.strike} title="Зачёркнутый"><span style={{textDecoration:"line-through"}}>S</span></Btn>
        <div style={{width:1,height:16,background:"#E5EAF0",margin:"0 2px"}}/>
        <Btn onMD={()=>toggleList("UL")} active={fmts.ul} title="Маркированный список">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="2.5" cy="4" r="1.5" fill="currentColor"/><circle cx="2.5" cy="8" r="1.5" fill="currentColor"/><circle cx="2.5" cy="12" r="1.5" fill="currentColor"/><line x1="6" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </Btn>
        <Btn onMD={()=>toggleList("OL")} active={fmts.ol} title="Нумерованный список">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><text x="0" y="5" fontSize="5" fill="currentColor" fontWeight="700">1.</text><text x="0" y="9" fontSize="5" fill="currentColor" fontWeight="700">2.</text><text x="0" y="13" fontSize="5" fill="currentColor" fontWeight="700">3.</text><line x1="7" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="7" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="7" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </Btn>
        <div style={{width:1,height:16,background:"#E5EAF0",margin:"0 2px"}}/>
        <button type="button" onMouseDown={e=>{e.preventDefault();if(ref.current){ref.current.innerHTML="";onChange("");ref.current.focus();}}}
          title="Очистить всё"
          style={{width:26,height:26,borderRadius:5,border:"1px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:"all 0.15s"}}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 13l10-10M8 3l5 5-4 4H6l-3-3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rich-note"
        onFocus={()=>{focused.current=true;updateFmts();}}
        onBlur={()=>{focused.current=false;onChange(ref.current?.innerHTML||"");}}
        onInput={()=>onChange(ref.current?.innerHTML||"")}
        onKeyUp={updateFmts}
        onMouseUp={updateFmts}
        style={{minHeight:56,padding:"8px 12px",fontSize:12,lineHeight:1.5,outline:"none",
          fontFamily:"Inter,sans-serif",color:"#334155",wordBreak:"break-word",textAlign:"left"}}
      />
    </div>
  );
}

/* Segmented bar */
function SegBar({scores,notes,images,si,onNoteClick,secs,offs,sortByColor}){
  const off=offs[si],items=secs[si].items,t=items.length;
  const [hov,setHov]=useState(null);
  if(!t)return null;
  let cells=items.map((it,ii)=>{const v=scores[off+ii];const nt=notes[off+ii]||"";const imgs=images?.[off+ii]||null;return{v,nt,imgs,idx:off+ii,name:it.n};});
  if(sortByColor){
    const colorOrder=(v)=>v===2?0:v===1?1:v===0?2:3;
    cells=[...cells].sort((a,b)=>colorOrder(a.v)-colorOrder(b.v));
  }
  return <div style={{position:"relative",width:"100%"}}>
    {/* Tooltip layer — overflow visible, sits above the clipped bar */}
    <div style={{position:"absolute",inset:0,display:"flex",pointerEvents:"none",zIndex:100}}>
      {cells.map((cell,ci)=>{
        const isHov=hov===ci;
        return <div key={ci} style={{flex:"1 1 0%",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {isHov&&<div style={{position:"absolute",bottom:"calc(100% + 7px)",left:"50%",transform:"translateX(-50%)",background:"#334155",color:"#fff",fontSize:10,fontWeight:500,padding:"4px 8px",borderRadius:6,whiteSpace:"nowrap",lineHeight:"1.3",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
            {cell.name}
            <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/>
          </div>}
        </div>;
      })}
    </div>
    {/* Bar — overflow hidden keeps corners clean */}
    <div style={{display:"flex",height:20,borderRadius:6,overflow:"hidden",background:"#F1F5F9",width:"100%"}}>
      {cells.map((cell,ci)=>{
        const bg=cell.v===2?"#10B981":cell.v===1?"#F59E0B":cell.v===0?"#EF4444":"#E2E8F0";
        const hasNote=!!(cell.nt||(cell.imgs&&cell.imgs.length));
        return <div key={ci} style={{flex:"1 1 0%",minWidth:0,background:bg,borderRight:ci<t-1?"1.5px solid rgba(255,255,255,0.5)":"none",position:"relative",cursor:hasNote?"pointer":"default",transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}
          onMouseEnter={()=>setHov(ci)}
          onMouseLeave={()=>setHov(null)}
          onClick={e=>{if(hasNote)onNoteClick({name:cell.name,text:cell.nt,imgs:cell.imgs,x:e.clientX,y:e.clientY});}}>
          {hasNote&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff",opacity:0.9,boxShadow:"0 0 3px rgba(0,0,0,0.3)"}}/>}
        </div>;
      })}
    </div>
  </div>;
}

/* Note popup — shows on click, with param name, text, photos */
function NotePopup({note,onClose}){
  const [imgIdx,setImgIdx]=useState(0);
  useEffect(()=>setImgIdx(0),[note]);
  if(!note)return null;
  const imgs=note.imgs||[];
  const total=imgs.length;
  const hasPrev=imgIdx>0,hasNext=imgIdx<total-1;

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,maxWidth:420,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:B.graphite,borderRadius:"16px 16px 0 0",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:"1.4",paddingRight:8}}>{note.name}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
      </div>
      <div style={{padding:"14px 16px",overflowY:"auto",flex:1}}>
        {note.text&&note.text.trim()&&note.text!=="<br>"&&<>
          <style>{".npop ul{list-style:disc;padding-left:18px;margin:4px 0}.npop ol{list-style:decimal;padding-left:18px;margin:4px 0}.npop li{margin:2px 0}.npop strong{font-weight:700}.npop em{font-style:italic}.npop p{margin:0 0 4px}.npop p:last-child{margin:0}"}</style>
          <div className="npop" dangerouslySetInnerHTML={{__html:note.text}} style={{fontSize:12,color:B.graphite,lineHeight:"1.6",wordBreak:"break-word",background:"#F8FAFC",borderRadius:8,padding:"10px 12px",marginBottom:total>0?12:0,border:`1px solid ${B.border}`,textAlign:"left"}}/>
        </>}
        {total>0&&<div style={{position:"relative",borderRadius:8,overflow:"hidden",background:"#F1F5F9"}}>
          <img src={imgs[imgIdx].data} alt={imgs[imgIdx].name||""} style={{display:"block",width:"100%",maxHeight:300,objectFit:"contain",borderRadius:8}}/>
          {hasPrev&&<button onClick={e=>{e.stopPropagation();setImgIdx(i=>i-1);}} style={{position:"absolute",top:"50%",left:8,transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}>‹</button>}
          {hasNext&&<button onClick={e=>{e.stopPropagation();setImgIdx(i=>i+1);}} style={{position:"absolute",top:"50%",right:8,transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}>›</button>}
          {total>1&&<div style={{position:"absolute",bottom:6,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
            {imgs.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setImgIdx(i);}} style={{width:i===imgIdx?16:6,height:6,borderRadius:3,background:i===imgIdx?"#fff":"rgba(255,255,255,0.5)",cursor:"pointer",transition:"all 0.2s"}}/>)}
          </div>}
        </div>}
        {!note.text&&total===0&&<div style={{fontSize:12,color:B.steel}}>Нет данных</div>}
      </div>
    </div>
  </div>;
}

const STORAGE_KEY="rack_scoring_data";

function loadSaved(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch{return null;}
}

export default function App(){
  const saved=useRef(loadSaved());
  const [sections,setSections]=useState(()=>saved.current?.sections||DEF_SECTIONS);
  const ALL=useMemo(()=>mkAll(sections),[sections]);
  const SEC_OFF=useMemo(()=>mkOff(sections),[sections]);
  const itemCount=ALL.length;

  const [vendors,setVendors]=useState(()=>{
    if(saved.current?.vendors)return saved.current.vendors.map(v=>({...v,images:v.images||Array(mkAll(saved.current?.sections||DEF_SECTIONS).length).fill(null)}));
    return [{name:"Вендор 1",scores:Array(mkAll(DEF_SECTIONS).length).fill(null),notes:Array(mkAll(DEF_SECTIONS).length).fill(""),images:Array(mkAll(DEF_SECTIONS).length).fill(null)}];
  });
  const [act,setAct]=useState(0);
  const [view,setView]=useState("editor");
  const [noteOpen,setNoteOpen]=useState(null);
  const [notePopup,setNotePopup]=useState(null);
  const [showReset,setShowReset]=useState(false);
  const [expImgs,setExpImgs]=useState({});
  const [heatmapSortCol,setHeatmapSortCol]=useState(null);
  const [heatmapActiveLabel,setHeatmapActiveLabel]=useState(null);
  const [heatmapHoverCol,setHeatmapHoverCol]=useState(null);
  const [techSpecs,setTechSpecs]=useState(()=>{
    try{const s=localStorage.getItem("rack_tech_specs");return s?JSON.parse(s):[{n:"Общие требования",items:[{n:"Введите техническое условие"}]}];}catch{return [{n:"Общие требования",items:[{n:"Введите техническое условие"}]}];}
  });
  useEffect(()=>{try{localStorage.setItem("rack_tech_specs",JSON.stringify(techSpecs));}catch{}},[techSpecs]);

  /* Auto-save to localStorage on every change */
  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({sections,vendors}));}catch{}
  },[sections,vendors]);

  /* Export to Excel (same format as template) */
  const exportExcelFile=useCallback(async()=>{
    try{
      const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const wb=XLSX.utils.book_new();

      const sl=["Нет","Частично","Да"];
      const allItems=mkAll(sections);
      const offs=mkOff(sections);
      const rows=[];

      /* Header row */
      const hdr=["#","Параметр","Тип"];
      vendors.forEach(v=>{hdr.push(v.name);hdr.push("Прим. "+v.name);});
      rows.push(hdr);

      /* Data */
      let gi=0;
      sections.forEach((sec)=>{
        /* Section header */
        const secRow=[sec.n];
        rows.push(secRow);
        sec.items.forEach((it,ii)=>{
          const row=[gi+1,it.n,it.w===2?"★! Требование":it.w>=1?"★ Требование":"☆ Преимущество"];
          vendors.forEach(v=>{
            const sc=v.scores[gi];
            row.push(sc!=null?sc:"");
            row.push(v.notes[gi]||"");
          });
          rows.push(row);
          gi++;
        });
      });

      const ws=XLSX.utils.aoa_to_sheet(rows);

      /* Column widths */
      ws["!cols"]=[{wch:4},{wch:28},{wch:16}];
      vendors.forEach(()=>{ws["!cols"].push({wch:12},{wch:20});});

      /* Merge section header rows */
      const merges=[];
      let ri=1;
      sections.forEach(sec=>{
        const colCount=3+vendors.length*2;
        merges.push({s:{r:ri,c:0},e:{r:ri,c:colCount-1}});
        ri+=1+sec.items.length;
      });
      ws["!merges"]=merges;

      XLSX.utils.book_append_sheet(wb,ws,"Оценка");
      XLSX.writeFile(wb,"scoring_export.xlsx");
    }catch(err){
      console.error(err);
      /* Fallback to JSON */
      const data=JSON.stringify({sections,vendors},null,2);
      const blob=new Blob([data],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="scoring_data.json";a.click();
      URL.revokeObjectURL(url);
    }
  },[sections,vendors]);

  /* Import JSON or XLSX */
  const importFile=useCallback(()=>{
    const input=document.createElement("input");
    input.type="file";input.accept=".json,.xlsx,.xls";
    input.onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      const ext=file.name.split(".").pop().toLowerCase();

      if(ext==="json"){
        const reader=new FileReader();
        reader.onload=ev=>{
          try{
            const d=JSON.parse(ev.target.result);
            if(d.sections&&Array.isArray(d.sections)){setSections(d.sections);}
            if(d.vendors&&Array.isArray(d.vendors)){setVendors(d.vendors.map(v=>({...v,images:v.images||Array(mkAll(d.sections||sections).length).fill(null)})));}
            setAct(0);setView("editor");
          }catch{alert("Ошибка чтения JSON");}
        };
        reader.readAsText(file);
        return;
      }

      /* XLSX parsing with SheetJS */
      try{
        const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:"array"});
        const wsName=wb.SheetNames.find(n=>n==="Оценка")||wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

        /* Parse structure: find header row, sections, items */
        let headerRow=-1;
        for(let r=0;r<Math.min(data.length,5);r++){
          const row=data[r];
          if(row&&String(row[0]||"").includes("#")&&String(row[1]||"").includes("Параметр")){headerRow=r;break;}
          if(row&&String(row[1]||"").includes("Параметр")){headerRow=r;break;}
        }
        if(headerRow<0)headerRow=1; /* default: row index 1 (row 2 in excel) */

        /* Detect vendor columns: pairs of score+note starting from col D (index 3) */
        const hdr=data[headerRow]||[];
        const vendorNames=[];
        for(let c=3;c<hdr.length;c+=2){
          const name=String(hdr[c]||"").trim();
          if(name&&!name.startsWith("Прим"))vendorNames.push({name,scoreCol:c,noteCol:c+1});
        }
        if(vendorNames.length===0){alert("Не найдены колонки вендоров");return;}

        /* Parse sections and items */
        const newSections=[];
        let curSec=null;
        for(let r=headerRow+1;r<data.length;r++){
          const row=data[r];
          if(!row||row.every(c=>c===""||c==null))continue;
          const colA=row[0];const colB=row[1];const colC=String(row[2]||"");

          /* Section header: col A has text (not a number), col B is empty or merged */
          const aNum=Number(colA);
          if(colA&&isNaN(aNum)&&!colC.includes("★")&&!colC.includes("☆")){
            /* It's a section header */
            curSec={n:String(colA).trim(),items:[]};
            newSections.push(curSec);
            continue;
          }

          /* Item row: has a number in A or has type in C */
          if(colB&&(colC.includes("★")||colC.includes("☆")||!isNaN(aNum))){
            const w=colC.includes("★!")? 2 : (colC.includes("★")||colC.includes("Требование"))? 1 : 0;
            if(!curSec){curSec={n:"Раздел",items:[]};newSections.push(curSec);}
            curSec.items.push({n:String(colB).trim(),w});
          }
        }

        if(newSections.length===0||newSections.every(s=>s.items.length===0)){
          alert("Не удалось распознать структуру файла");return;
        }

        /* Build vendor data */
        const totalItems=newSections.reduce((a,s)=>a+s.items.length,0);
        const newVendors=vendorNames.map(vn=>{
          const scores=Array(totalItems).fill(null);
          const notes=Array(totalItems).fill("");
          const images=Array(totalItems).fill(null);
          let idx=0;
          for(let r=headerRow+1;r<data.length;r++){
            const row=data[r];
            if(!row)continue;
            const colC=String(row[2]||"");
            const aNum=Number(row[0]);
            const isItem=row[1]&&(colC.includes("★")||colC.includes("☆")||!isNaN(aNum));
            if(!isItem)continue;
            if(idx>=totalItems)break;
            const rawScore=row[vn.scoreCol];
            if(rawScore!=null&&rawScore!==""){
              const num=Number(rawScore);
              if(!isNaN(num)&&num>=0&&num<=2)scores[idx]=num;
            }
            const rawNote=String(row[vn.noteCol]||"").trim();
            if(rawNote)notes[idx]=rawNote;
            idx++;
          }
          return {name:vn.name,scores,notes,images};
        });

        setSections(newSections);
        setVendors(newVendors);
        setAct(0);setView("input");
      }catch(err){
        console.error(err);
        alert("Ошибка чтения Excel: "+err.message);
      }
    };
    input.click();
  },[sections]);

  /* Reset vendor scores and notes (keeps sections/structure) */
  const doReset=useCallback(()=>{
    setVendors([{name:"Вендор 1",scores:Array(itemCount).fill(null),notes:Array(itemCount).fill(""),images:Array(itemCount).fill(null)}]);
    setShowReset(false);
    setNoteOpen(null);
    setAct(0);
  },[itemCount]);

  /* Export to Excel (CSV with BOM for proper Cyrillic in Excel) */
  /* Generate clean PDF report for a specific vendor */
  const exportVendorPDF=useCallback((vi)=>{
    const v=vendors[vi];
    if(!v)return;
    const allItems=mkAll(sections);
    const offs=mkOff(sections);
    const sl=["✗ Нет","◐ Частично","✓ Да"];
    const sc_colors=["#EF4444","#F59E0B","#10B981"];
    const total=calcTotal(v.scores,allItems);

    let html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${v.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
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
      .pdf-btn{display:block;margin:0 auto 24px;padding:10px 32px;border-radius:20px;border:none;background:#2F9AFF;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif}
      .pdf-btn:hover{background:#1a7de6}
      .sec-block{break-inside:avoid}
      .row{break-inside:avoid}
      @media print{body{padding:16px}.pdf-btn{display:none!important}}
    </style></head><body>`;

    html+=`<button class="pdf-btn" onclick="window.print()">Сохранить в PDF</button>`;
    html+=`<h1>${v.name}</h1>`;
    const tColor=total!=null&&total>=7?"#10B981":total!=null&&total>=4?"#F59E0B":"#7B97B2";
    html+=`<div class="total" style="background:${tColor}">${fmt(total)} / 10</div>`;

    let gi=0;
    sections.forEach((sec,si)=>{
      html+=`<div class="sec-block"><div class="sec">${sec.n}</div><div class="items">`;
      sec.items.forEach((it,ii)=>{
        const sc=v.scores[gi];
        const nt=v.notes[gi]||"";
        const imgs=v.images?.[gi]||null;
        const isReq=it.w>=1;
        const isCrit=it.w===2;
        const star=isCrit?`<span class="rtype" style="color:#DC2626">★!</span>`:isReq?`<span class="rtype" style="color:#DC2626">★</span>`:`<span class="rtype" style="color:#2F9AFF">☆</span>`;
        let scoreLabel="—";let scoreColor="#CBD5E1";
        if(sc!=null){
          scoreLabel=sl[sc];scoreColor=sc_colors[sc];
        }
        html+=`<div class="row"><div class="rhead">${star}<span class="rname">${it.n}</span><span class="rscore" style="color:${scoreColor}">${scoreLabel}</span></div>`;
        if(nt)html+=`<div class="note">${nt}</div>`;
        if(imgs&&imgs.length){
          html+=`<div class="photos">`;
          imgs.forEach(im=>{html+=`<img src="${im.data}" alt="${(im.name||"").replace(/"/g,"&quot;")}">`;});
          html+=`</div>`;
        }
        html+=`</div>`;
        gi++;
      });
      html+=`</div></div>`;
    });

    html+=`<div class="summary" style="break-inside:avoid">`;
    html+=`<div class="srow" style="background:#334155;color:#fff;font-weight:700"><span>Раздел</span><span>Балл</span></div>`;
    sections.forEach((sec,si)=>{
      const val=calcSec(v.scores,si,sections,offs);
      html+=`<div class="srow"><span class="sn">${sec.n}</span><span class="sv">${fmt(val)}</span></div>`;
    });
    html+=`<div class="srow" style="border-top:2px solid #E5EAF0;font-weight:700"><span>ИТОГО</span><span style="color:${tColor}">${fmt(total)}</span></div>`;
    html+=`</div></body></html>`;

    const w=window.open("","_blank");
    w.document.write(html);
    w.document.close();
  },[sections,vendors]);

  const resizeVendors=(newSecs)=>{
    const newLen=mkAll(newSecs).length;
    setVendors(prev=>prev.map(v=>{
      const sc=[...v.scores];const nt=[...v.notes];const im=[...(v.images||[])];
      while(sc.length<newLen){sc.push(null);nt.push("");im.push(null);}
      return {...v,scores:sc.slice(0,newLen),notes:nt.slice(0,newLen),images:im.slice(0,newLen)};
    }));
  };

  const setSectionName=(si,name)=>{const n=sections.map((s,i)=>i===si?{...s,n:name}:s);setSections(n);};
  const addSection=()=>{const n=[...sections,{n:"Новый раздел",items:[{n:"Параметр 1",w:2}]}];setSections(n);resizeVendors(n);};
  const rmSection=(si)=>{if(sections.length<=1)return;const n=sections.filter((_,i)=>i!==si);setSections(n);resizeVendors(n);};
  const setItemName=(si,ii,name)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,n:name}:it)}:s);setSections(n);};
  const setItemWeight=(si,ii,w)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,w}:it)}:s);setSections(n);};
  const addItem=(si)=>{const n=sections.map((s,i)=>i===si?{...s,items:[...s.items,{n:"Новый параметр",w:2}]}:s);setSections(n);resizeVendors(n);};
  const rmItem=(si,ii)=>{if(sections[si].items.length<=1)return;const n=sections.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s);setSections(n);resizeVendors(n);};

  const addV=()=>{if(vendors.length>=25)return;setVendors(p=>[...p,{name:`Вендор ${p.length+1}`,scores:Array(itemCount).fill(null),notes:Array(itemCount).fill(""),images:Array(itemCount).fill(null)}]);};
  const rmV=i=>{if(vendors.length<=1)return;setVendors(p=>p.filter((_,j)=>j!==i));if(act>=vendors.length-1)setAct(Math.max(0,vendors.length-2));};
  const setScore=(idx,val)=>{setVendors(p=>{const n=[...p];const v={...n[act],scores:[...n[act].scores]};v.scores[idx]=v.scores[idx]===val?null:val;n[act]=v;return n;});};
  const setNote=(idx,txt)=>{setVendors(p=>{const n=[...p];const v={...n[act],notes:[...n[act].notes]};v.notes[idx]=txt;n[act]=v;return n;});};
  const addImage=(idx,name,dataUrl,isFile=false,isImg=false,isVid=false)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=v.images[idx]||[];v.images[idx]=[...arr,{name,data:dataUrl,isFile,isImg,isVid}];n[act]=v;return n;});};
  const rmImage=(idx,imgIdx)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=[...(v.images[idx]||[])];arr.splice(imgIdx,1);v.images[idx]=arr.length?arr:null;n[act]=v;return n;});};
  const setName=(i,nm)=>{setVendors(p=>{const n=[...p];n[i]={...n[i],name:nm};return n;});};

  const totals=useMemo(()=>vendors.map(v=>calcTotal(v.scores,ALL)),[vendors,ALL]);
  const fails=useMemo(()=>vendors.map(v=>hasFail(v.scores,ALL)),[vendors,ALL]);
  const advCounts=useMemo(()=>vendors.map(v=>ALL.filter((it,i)=>it.w===0&&v.scores[i]!=null&&v.scores[i]>0).length),[vendors,ALL]);
  const ranks=useMemo(()=>{
    /* Build sorted order: primary=total desc, secondary=advantages desc, tertiary=index asc */
    const indexed=vendors.map((_,i)=>i).filter(i=>totals[i]!=null);
    indexed.sort((a,b)=>{
      const ta=totals[a],tb=totals[b];
      if(tb!==ta)return tb-ta;
      return advCounts[b]-advCounts[a];
    });
    /* Assign strict 1/2/3 to top 3 positions regardless of ties */
    const result=Array(vendors.length).fill(null);
    [0,1,2].forEach(pos=>{if(indexed[pos]!=null)result[indexed[pos]]=pos+1;});
    return result;
  },[totals,advCounts,vendors]);
  const allSec=useMemo(()=>vendors.map(v=>sections.map((_,si)=>calcSec(v.scores,si,sections,SEC_OFF))),[vendors,sections,SEC_OFF]);

  const sortedIdx=useMemo(()=>{
    const arr=vendors.map((_,i)=>i);
    arr.sort((a,b)=>{const ta=totals[a],tb=totals[b];if(ta==null&&tb==null)return a-b;if(ta==null)return 1;if(tb==null)return -1;return tb-ta;});
    return arr;
  },[vendors,totals]);

  const heatmapSortedIdx=useMemo(()=>{
    const arr=vendors.map((_,i)=>i);
    arr.sort((a,b)=>{
      const va=heatmapSortCol===null?totals[a]:(allSec[a]?allSec[a][heatmapSortCol]:0);
      const vb=heatmapSortCol===null?totals[b]:(allSec[b]?allSec[b][heatmapSortCol]:0);
      const na=va==null?-1:va,nb=vb==null?-1:vb;
      if(nb!==na)return nb-na;
      return a-b;
    });
    return arr;
  },[vendors,totals,allSec,heatmapSortCol]);

  const getTop=(sc,best)=>{const s=ALL.filter(it=>it.w>=1).map((it,i)=>{const gi=ALL.indexOf(it);return{...it,idx:gi,score:sc[gi]};}).filter(x=>x.score!=null);s.sort((a,b2)=>best?(b2.score*b2.w)-(a.score*a.w):(a.score*a.w)-(b2.score*b2.w));return s.slice(0,5);};
  const getAdvantages=(sc)=>ALL.filter((it,i)=>it.w===0&&sc[i]!=null&&sc[i]>0).map((it,i)=>({...it,idx:ALL.indexOf(it)}));
  const filled=sc=>sc.filter(x=>x!=null).length;

  const exportPDF=useCallback(()=>{window.print();},[]);

  const wbBadge=(w)=>{const wc=WC[w]||WC[1];return{fontSize:11,fontWeight:700,color:wc.c,whiteSpace:"nowrap",flexShrink:0,lineHeight:1};};
  const navBtn=(label,v)=><button onClick={()=>setView(v)} style={{padding:"6px 16px",borderRadius:20,border:"none",cursor:"pointer",background:view===v?B.blue:"transparent",color:view===v?"#fff":B.steel,fontSize:12,fontWeight:600,transition:"all 0.2s",whiteSpace:"nowrap"}}>{label}</button>;

  return <div style={{minHeight:"100vh",background:B.bg,fontFamily:"Inter, system-ui, sans-serif",position:"relative",overflowX:"hidden"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <style>{`
      html, body, #root, #app { margin: 0; padding: 0; width: 100%; min-height: 100vh; }
      .rich-note { outline: none; text-align: left; }
      .rich-note p { margin: 0 0 4px; }
      .rich-note p:last-child { margin-bottom: 0; }
      .rich-note ul { list-style-type: disc; padding-left: 20px; margin: 4px 0; }
      .rich-note ol { list-style-type: decimal; padding-left: 20px; margin: 4px 0; }
      .rich-note li { margin: 2px 0; display: list-item; }
      .rich-note strong { font-weight: 700; }
      .rich-note em { font-style: italic; }
      .rich-note s { text-decoration: line-through; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${B.bg}; }
      @media print {
        [data-nav] { display: none !important; }
        body, html { background: #fff !important; margin: 0 auto !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 100%; }
        #root, #app { margin: 0 auto !important; }
        button { display: none !important; }
        [data-dash] { padding: 8px !important; max-width: 100% !important; margin: 0 auto !important; }
        [data-gauges] { gap: 8px !important; margin-bottom: 12px !important; justify-content: center !important; }
        [data-gauges] > div { padding: 8px !important; min-width: 90px !important; }
        [data-heatmap] { break-inside: avoid; }
        [data-heatmap] table { font-size: 9px !important; }
        [data-heatmap-section-label] { display: none !important; }
        [data-heatmap-legend] { display: block !important; }
        [data-vendor-bars] { break-inside: avoid; padding: 8px !important; margin-bottom: 8px !important; }
        [data-bottom-cards] { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        [data-bottom-cards] > div { break-inside: avoid; flex: none !important; min-width: 0 !important; padding: 10px !important; font-size: 10px !important; }
        [data-bottom-cards] > div > div:first-child { font-size: 11px !important; white-space: normal !important; overflow: visible !important; }
        [data-bottom-cards] span { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
        textarea { border: none !important; background: none !important; resize: none !important; }
        img { max-height: 200px !important; }
        label { display: none !important; }
        [data-footer] { display: none !important; }
      }
    `}</style>

    

    <NotePopup note={notePopup} onClose={()=>setNotePopup(null)}/>

    {/* Reset confirmation modal */}
    {showReset&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={()=>setShowReset(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Сбросить всё?</div>
        <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Все вендоры, оценки и примечания будут удалены. Останется один пустой «Вендор 1». Структура разделов сохранится.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={()=>setShowReset(false)} style={{padding:"10px 28px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.graphite,fontSize:14,fontWeight:600,cursor:"pointer"}}>Отмена</button>
          <button onClick={doReset} style={{padding:"10px 28px",borderRadius:12,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Да, сбросить</button>
        </div>
      </div>
    </div>}

    {/* NAV */}
    <div data-nav="" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"#fff",borderBottom:`1px solid ${B.border}`,position:"sticky",top:0,zIndex:50,gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Logo h={26}/>
          <div style={{width:1,height:22,background:B.border}}/>
          <span style={{fontSize:13,fontWeight:700,color:B.graphite,letterSpacing:"0.5px"}}>НИТС</span>
        </div>
        <div style={{display:"flex",gap:3,background:"#F1F5F9",borderRadius:20,padding:2}}>{navBtn("Редактор","editor")}{navBtn("Тех. условия","techspecs")}{navBtn("Оценка","input")}{navBtn("Дашборд","dashboard")}</div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {view==="dashboard"&&<button onClick={exportPDF} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${B.blue}`,background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>PDF</button>}
      </div>
    </div>

    {/* ═══ EDITOR ═══ */}
    {view==="editor"&&<div style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Редактор чек-листа</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Настройте разделы, параметры и веса перед оценкой</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={importFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Загрузить
          </button>
          <button onClick={exportExcelFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Сохранить
          </button>
          <button onClick={addSection} style={{padding:"6px 14px",borderRadius:10,border:"none",background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Раздел</button>
        </div>
      </div>
      {sections.map((sec,si)=><div key={si} style={{marginBottom:12}}>
        <div draggable onDragStart={e=>{e.dataTransfer.setData("text",JSON.stringify({type:"section",si}));e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}} onDrop={e=>{e.preventDefault();try{const d=JSON.parse(e.dataTransfer.getData("text"));if(d.type==="section"&&d.si!==si){const n=[...sections];const [moved]=n.splice(d.si,1);n.splice(si,0,moved);setSections(n);resizeVendors(n);}}catch{}}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`,cursor:"grab"}}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{flexShrink:0,opacity:0.4}}><circle cx="4" cy="3" r="1.2" fill="#fff"/><circle cx="8" cy="3" r="1.2" fill="#fff"/><circle cx="4" cy="6" r="1.2" fill="#fff"/><circle cx="8" cy="6" r="1.2" fill="#fff"/><circle cx="4" cy="9" r="1.2" fill="#fff"/><circle cx="8" cy="9" r="1.2" fill="#fff"/></svg>
          <input value={sec.n} onChange={e=>setSectionName(si,e.target.value)} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0}}/>
          {sections.length>1&&<button onClick={()=>rmSection(si)} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>}
        </div>
        <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
          {sec.items.map((it,ii)=><div key={ii} draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("text",JSON.stringify({type:"item",si,ii}));e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="move";}} onDrop={e=>{e.preventDefault();e.stopPropagation();try{const d=JSON.parse(e.dataTransfer.getData("text"));if(d.type==="item"){if(d.si===si&&d.ii!==ii){const n=[...sections];const s={...n[si],items:[...n[si].items]};const [moved]=s.items.splice(d.ii,1);s.items.splice(ii,0,moved);n[si]=s;setSections(n);setVendors(prev=>prev.map(v=>{const sc=[...v.scores];const nt=[...v.notes];const off=SEC_OFF[si];const ms=sc.splice(off+d.ii,1)[0];const mn=nt.splice(off+d.ii,1)[0];sc.splice(off+(d.ii<ii?ii-1:ii),0,ms);nt.splice(off+(d.ii<ii?ii-1:ii),0,mn);return{...v,scores:sc,notes:nt};}));}else if(d.si!==si){const n=sections.map(s=>({...s,items:[...s.items]}));const [moved]=n[d.si].items.splice(d.ii,1);n[si].items.splice(ii,0,moved);if(n[d.si].items.length===0)n[d.si].items.push({n:"Параметр",w:2});setSections(n);setVendors(prev=>prev.map(v=>{const sc=[...v.scores];const nt=[...v.notes];const srcOff=SEC_OFF[d.si];const ms=sc.splice(srcOff+d.ii,1)[0];const mn=nt.splice(srcOff+d.ii,1)[0];const newOffs=mkOff(n);const dstOff=newOffs[si];sc.splice(dstOff+ii,0,ms);nt.splice(dstOff+ii,0,mn);return{...v,scores:sc,notes:nt};}));}}}catch{}}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none",cursor:"grab"}}>
            <svg width="12" height="12" viewBox="0 0 12 12" style={{flexShrink:0,opacity:0.3}}><circle cx="4" cy="3" r="1.2" fill={B.graphite}/><circle cx="8" cy="3" r="1.2" fill={B.graphite}/><circle cx="4" cy="6" r="1.2" fill={B.graphite}/><circle cx="8" cy="6" r="1.2" fill={B.graphite}/><circle cx="4" cy="9" r="1.2" fill={B.graphite}/><circle cx="4" cy="9" r="1.2" fill={B.graphite}/><circle cx="8" cy="9" r="1.2" fill={B.graphite}/></svg>
            <textarea value={it.n} onChange={e=>{setItemName(si,ii,e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} onFocus={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} rows={1} style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",minWidth:0,resize:"none",overflow:"hidden",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0}} placeholder="Название параметра"/>
            <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
              {it.w>=1&&<button onClick={()=>setItemWeight(si,ii,it.w===2?1:2)} style={{width:28,height:28,borderRadius:8,border:it.w===2?`2px solid #DC2626`:`1.5px solid ${B.border}`,background:it.w===2?"#FEE2E2":"#fff",cursor:"pointer",fontSize:13,fontWeight:800,color:it.w===2?"#DC2626":B.steel,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} title="Критичный параметр (×2)">!</button>}
              {[{w:1,l:"★ Требование"},{w:0,l:"☆ Преимущество"}].map(({w:wv,l})=>{const on=wv===0?it.w===0:(it.w>=1);const wc=WC[wv];return <button key={wv} onClick={()=>setItemWeight(si,ii,wv===0?0:1)} style={{padding:"4px 10px",borderRadius:8,border:on?`2px solid ${wc.bc}`:`1.5px solid ${B.border}`,background:on?wc.bg:"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:on?wc.c:B.steel,transition:"all 0.15s",whiteSpace:"nowrap"}}>{l}</button>;})}
            </div>
            {sec.items.length>1&&<button onClick={()=>rmItem(si,ii)} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>×</button>}
          </div>)}
          <button onClick={()=>addItem(si)} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px"}}>+ Добавить параметр</button>
        </div>
      </div>)}
      <div style={{textAlign:"center",padding:20}}>
        <button onClick={()=>setView("input")} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Перейти к оценке →</button>
      </div>
    </div>}

    {/* ═══ INPUT ═══ */}
    {view==="techspecs"&&<div style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Технические условия</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Критерии подбора оборудования — только для справки, не влияет на расчёты</div>
        </div>
        <button onClick={()=>setTechSpecs(p=>[...p,{n:"Новый раздел",items:[{n:"Новое условие"}]}])} style={{padding:"6px 14px",borderRadius:10,border:"none",background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Раздел</button>
      </div>
      {techSpecs.map((sec,si)=><div key={si} style={{marginBottom:12}}>
        <div draggable onDragStart={e=>{e.dataTransfer.setData("text",JSON.stringify({type:"ts-sec",si}));e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}} onDrop={e=>{e.preventDefault();try{const d=JSON.parse(e.dataTransfer.getData("text"));if(d.type==="ts-sec"&&d.si!==si){const n=[...techSpecs];const [m]=n.splice(d.si,1);n.splice(si,0,m);setTechSpecs(n);}}catch{}}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`,cursor:"grab"}}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{flexShrink:0,opacity:0.4}}><circle cx="4" cy="3" r="1.2" fill="#fff"/><circle cx="8" cy="3" r="1.2" fill="#fff"/><circle cx="4" cy="6" r="1.2" fill="#fff"/><circle cx="8" cy="6" r="1.2" fill="#fff"/><circle cx="4" cy="9" r="1.2" fill="#fff"/><circle cx="8" cy="9" r="1.2" fill="#fff"/></svg>
          <input value={sec.n} onChange={e=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,n:e.target.value}:s))} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0}}/>
          {techSpecs.length>1&&<button onClick={()=>setTechSpecs(p=>p.filter((_,i)=>i!==si))} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>}
        </div>
        <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
          {sec.items.map((it,ii)=><div key={ii} draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("text",JSON.stringify({type:"ts-item",si,ii}));}} onDragOver={e=>{e.preventDefault();e.stopPropagation();}} onDrop={e=>{e.preventDefault();e.stopPropagation();try{const d=JSON.parse(e.dataTransfer.getData("text"));if(d.type==="ts-item"&&d.si===si&&d.ii!==ii){const n=[...techSpecs];const s={...n[si],items:[...n[si].items]};const [m]=s.items.splice(d.ii,1);s.items.splice(ii,0,m);n[si]=s;setTechSpecs(n);}}catch{}}} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none",cursor:"grab"}}>
            <svg width="12" height="12" viewBox="0 0 12 12" style={{flexShrink:0,opacity:0.3,marginTop:3}}><circle cx="4" cy="3" r="1.2" fill={B.graphite}/><circle cx="8" cy="3" r="1.2" fill={B.graphite}/><circle cx="4" cy="6" r="1.2" fill={B.graphite}/><circle cx="8" cy="6" r="1.2" fill={B.graphite}/><circle cx="4" cy="9" r="1.2" fill={B.graphite}/><circle cx="8" cy="9" r="1.2" fill={B.graphite}/></svg>
            <textarea value={it.n} onChange={e=>{const v=e.target.value;e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((x,j)=>j===ii?{...x,n:v}:x)}:s));}} onFocus={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} rows={1} style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",resize:"none",overflow:"hidden",fontFamily:"Inter,system-ui,sans-serif",lineHeight:"1.4",padding:0}}/>
            {sec.items.length>1&&<button onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s))} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>×</button>}
          </div>)}
          <button onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,{n:"Новое условие"}]}:s))} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px"}}>+ Добавить условие</button>
        </div>
      </div>)}
    </div>}

        {view==="input"&&<div style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <div style={{display:"inline-flex",gap:6,padding:"8px 16px",background:"#fff",borderRadius:12,border:`1px solid ${B.border}`,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
          <IconNo c="#EF4444" s={13}/><span style={{fontSize:11,color:"#EF4444",fontWeight:600}}>Нет</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconMid c="#F59E0B" s={13}/><span style={{fontSize:11,color:"#F59E0B",fontWeight:600}}>Частично</span>
          <span style={{color:B.border,margin:"0 4px"}}>│</span>
          <IconYes c="#10B981" s={13}/><span style={{fontSize:11,color:"#10B981",fontWeight:600}}>Да</span>
          <span style={{color:B.border,margin:"0 8px 0 4px"}}>│</span>
          <span style={{fontSize:10,color:B.steel}}>★ требование</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>★! критичное</span>
          <span style={{fontSize:10,color:B.steel,marginLeft:4}}>☆ преимущество</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        {vendors.length<25&&<button onClick={addV} style={{padding:"6px 14px",borderRadius:12,border:"2px dashed #CBD5E1",background:"none",color:B.steel,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>+ Добавить вендора</button>}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>exportVendorPDF(act)} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2"/></svg>
            Отчёт
          </button>
          <button onClick={()=>setShowReset(true)} style={{padding:"6px 14px",borderRadius:12,border:`1.5px solid #EF4444`,background:"#fff",color:"#EF4444",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>Сбросить</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {vendors.map((v,i)=>{return <div key={i} onClick={()=>setAct(i)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:12,cursor:"pointer",background:i===act?VC[i%VC.length]+"10":"#fff",border:`2px solid ${i===act?VC[i%VC.length]:B.border}`,transition:"all 0.2s",maxWidth:260,minWidth:0}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:VC[i%VC.length],flexShrink:0}}/><input value={v.name} onChange={e=>setName(i,e.target.value)} onClick={e=>e.stopPropagation()} style={{background:"none",border:"none",color:B.graphite,fontSize:12,fontWeight:i===act?700:400,width:Math.min(Math.max(v.name.length*7.5,60),140),minWidth:40,maxWidth:140,outline:"none",overflow:"hidden",textOverflow:"ellipsis"}} title={v.name}/><span style={{fontSize:9,color:B.steel,flexShrink:0,whiteSpace:"nowrap"}}>{filled(v.scores)}/{itemCount}</span>
          {vendors.length>1&&<span onClick={e=>{e.stopPropagation();rmV(i);}} style={{color:B.steel,cursor:"pointer",fontSize:14,flexShrink:0}}>×</span>}
        </div>;})}
      </div>
      {sections.map((sec,si)=>{const off=SEC_OFF[si];
        return <div key={si} style={{marginBottom:12}}>
          <div style={{padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",fontSize:12,fontWeight:700,color:"#fff",borderLeft:`3px solid ${VC[si%VC.length]}`}}>{sec.n}</div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            {sec.items.map((it,ii)=>{const idx=off+ii;const v=vendors[act]?.scores[idx];const nt=vendors[act]?.notes[idx]||"";const imgs=vendors[act]?.images?.[idx]||null;const hasImgs=imgs&&imgs.length>0;const isExp=noteOpen===idx||noteOpen===-999;const isReq=it.w>=1;
              return <div key={ii} style={{borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div style={{display:"flex",alignItems:"center",padding:"8px 16px",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 150px",display:"flex",alignItems:"center",gap:6,minWidth:0}}><span style={{fontSize:12,color:B.graphite,overflow:"hidden",textOverflow:"ellipsis"}}>{it.n}</span><span style={wbBadge(it.w)}>{it.w===2?"★!":it.w===1?"★":"☆"}</span></div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
                    {isReq?
                      [0,1,2].map(n2=>{const Ic=ICO[n2];const on=v===n2;return <button key={n2} onClick={()=>setScore(idx,n2)} style={{width:38,height:38,borderRadius:10,border:on?`2px solid ${SM[n2].c}`:`1.5px solid ${B.border}`,background:on?SM[n2].bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",boxShadow:on?`0 2px 8px ${SM[n2].c}22`:"none"}}><Ic c={on?SM[n2].c:"#B0BEC5"} s={16}/></button>;})
                      :
                      [{sc:0,Ic:IconNo,sm:SM[0]},{sc:2,Ic:IconYes,sm:SM[2]}].map(({sc:sv,Ic,sm})=>{const on=v===sv;return <button key={sv} onClick={()=>setScore(idx,sv)} style={{width:38,height:38,borderRadius:10,border:on?`2px solid ${sm.c}`:`1.5px solid ${B.border}`,background:on?sm.bg:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",boxShadow:on?`0 2px 8px ${sm.c}22`:"none"}}><Ic c={on?sm.c:"#B0BEC5"} s={16}/></button>;})
                    }
                    <button onClick={()=>setNoteOpen(isExp&&noteOpen!==-999?null:idx)} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${(isExp||nt||hasImgs)?B.blue:B.border}`,background:(isExp||nt||hasImgs)?B.blue+"10":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:(isExp||nt||hasImgs)?B.blue:B.steel,marginLeft:4,flexShrink:0}} title="Примечание">
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
                          ? <button onClick={()=>setExpImgs(p=>({...p,[key]:!p[key]}))} style={{padding:"4px 8px",background:"none",border:"none",cursor:"pointer",fontSize:11,color:open?B.blue:B.steel,fontWeight:600,display:"flex",alignItems:"center",gap:4,maxWidth:160,overflow:"hidden"}}>
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
                        <a href={im.data} download={im.name} title="Скачать" style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:B.blue,display:"flex",alignItems:"center",textDecoration:"none"}}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 8l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </a>
                        <button onClick={()=>{rmImage(idx,imIdx);setExpImgs(p=>{const n={...p};delete n[key];return n;});}} style={{padding:"4px 6px",background:"none",border:"none",borderLeft:`1px solid ${B.border}`,cursor:"pointer",color:"#EF4444",fontSize:13,lineHeight:1,display:"flex",alignItems:"center"}} title="Удалить">×</button>
                      </div>;
                    })}
                    <label style={{padding:"4px 10px",borderRadius:8,border:`1.5px dashed ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      Файл
                      <input type="file" multiple style={{display:"none"}} onChange={e=>{
                        Array.from(e.target.files).forEach(f=>{
                          const mime=f.type||"";
                          const name=f.name||"";
                          const ext=name.split(".").pop().toLowerCase();
                          const isHeic=ext==="heic"||ext==="heif";
                          const isVid=mime.startsWith("video/");
                          const isImg=mime.startsWith("image/")||isHeic;
                          const reader=new FileReader();
                          if(isHeic){
                            /* Try native browser HEIC support via canvas (works in Safari).
                               On unsupported browsers, store as downloadable file. */
                            const blobUrl=URL.createObjectURL(f);
                            const img=new Image();
                            img.onload=()=>{
                              try{
                                const c=document.createElement("canvas");
                                c.width=img.naturalWidth;c.height=img.naturalHeight;
                                c.getContext("2d").drawImage(img,0,0);
                                const jpeg=c.toDataURL("image/jpeg",0.9);
                                URL.revokeObjectURL(blobUrl);
                                addImage(idx,name.replace(/\.(heic|heif)$/i,".jpg"),jpeg,false,true,false);
                              }catch{
                                URL.revokeObjectURL(blobUrl);
                                const fr=new FileReader();
                                fr.onload=ev2=>addImage(idx,name,ev2.target.result,false,false,false);
                                fr.readAsDataURL(f);
                              }
                            };
                            img.onerror=()=>{
                              /* Browser doesn't support HEIC — save as downloadable file */
                              URL.revokeObjectURL(blobUrl);
                              const fr=new FileReader();
                              fr.onload=ev2=>addImage(idx,name,ev2.target.result,false,false,false);
                              fr.readAsDataURL(f);
                            };
                            img.src=blobUrl;
                          }else if(isVid){
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,false,true);
                            reader.readAsDataURL(f);
                          }else if(isImg){
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,true,false);
                            reader.readAsDataURL(f);
                          }else{
                            reader.onload=ev=>addImage(idx,name,ev.target.result,false,false,false);
                            reader.readAsDataURL(f);
                          }
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
      <div style={{display:"flex",justifyContent:"center",gap:12,padding:20}}>
        <button onClick={()=>setView("dashboard")} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Дашборд →</button>
      </div>
    </div>}

    {/* DASHBOARD */}
    {view==="dashboard"&&<div data-dash="" style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
      {/* Gauges */}
      <div data-gauges="" style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:12,marginBottom:24}}>
        {sortedIdx.map(i=><Gauge key={i} value={totals[i]} color={VC[i%VC.length]} label={vendors[i].name} rank={ranks[i]} fail={fails[i]}/>)}
      </div>

      {/* Heatmap — full width */}
      <div data-heatmap="" style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${B.border}`,marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:B.graphite}}>Сравнение по разделам</div>
          <div data-heatmap-section-label="" style={{fontSize:12,fontWeight:600,color:heatmapActiveLabel?B.blue:B.steel,background:heatmapActiveLabel?`${B.blue}10`:"#F8FAFC",borderRadius:8,padding:"4px 12px",border:`1px solid ${heatmapActiveLabel?B.blue:B.border}`,transition:"all 0.2s",minWidth:160,textAlign:"center"}}>
            {heatmapActiveLabel||"Выберите раздел"}
          </div>
        </div>
        <div data-heatmap-legend="" style={{display:"none",marginBottom:10,fontSize:9,color:B.graphite,columnCount:2,columnGap:16}}>
          {sections.map((s,si)=><div key={si} style={{marginBottom:3}}><span style={{fontWeight:700,color:B.blue}}>{si+1}.</span> {s.n}</div>)}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,tableLayout:"fixed"}}>
          <thead>
            <tr>
              <th style={{textAlign:"left",padding:"6px 8px",fontSize:10,color:B.steel,fontWeight:600,borderBottom:`2px solid ${B.border}`,width:120}}>Вендор</th>
              {sections.map((s,si)=>{
                const active=heatmapSortCol===si;
                return <th key={si} onMouseEnter={()=>setHeatmapHoverCol(si)} onMouseLeave={()=>setHeatmapHoverCol(null)} onClick={()=>{const next=active?null:si;setHeatmapSortCol(next);setHeatmapActiveLabel(next===null?null:s.n);}} style={{textAlign:"center",padding:"4px 2px",fontSize:10,fontWeight:active?800:600,color:active?B.blue:B.steel,borderBottom:`2px solid ${active?B.blue:B.border}`,verticalAlign:"middle",cursor:"pointer",userSelect:"none",transition:"color 0.15s,border-color 0.15s",whiteSpace:"nowrap",position:"relative"}}>{si+1}{heatmapHoverCol===si&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:B.graphite,color:"#fff",fontSize:10,fontWeight:500,padding:"4px 8px",borderRadius:6,whiteSpace:"nowrap",pointerEvents:"none",zIndex:99,boxShadow:"0 2px 8px rgba(0,0,0,0.18)",lineHeight:"1.3"}}>{s.n}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`5px solid ${B.graphite}`}}/></div>}</th>;
              })}
              <th onClick={()=>{setHeatmapSortCol(null);setHeatmapActiveLabel(null);}} style={{textAlign:"center",padding:"6px 4px",fontSize:10,fontWeight:heatmapSortCol===null?800:700,color:heatmapSortCol===null?B.blue:B.graphite,borderBottom:`2px solid ${heatmapSortCol===null?B.blue:B.border}`,width:50,cursor:"pointer",userSelect:"none",transition:"color 0.15s,border-color 0.15s"}}>Итого</th>
            </tr>
          </thead>
          <tbody>
            {heatmapSortedIdx.map((i,rank)=>{const v=vendors[i];const t=totals[i];
              const rowBg=rank%2?"#fff":"#F8FAFC";
              return <tr key={i} style={{borderBottom:`1px solid #F1F5F9`}}>
                <td style={{padding:"6px 8px",fontSize:10,fontWeight:600,color:VC[i%VC.length],background:rowBg,borderRight:`1px solid ${B.border}`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</td>
                {sections.map((s,si)=>{
                  const val=allSec[i]?allSec[i][si]:0;
                  const bg=val>=8?"#D1FAE5":val>=5?"#FEF3C7":val>0?"#FEE2E2":"#F1F5F9";
                  const tc=val>=8?"#065F46":val>=5?"#92400E":val>0?"#991B1B":B.steel;
                  const isActiveCol=heatmapSortCol===si;
                  return <td key={si} style={{textAlign:"center",padding:"6px 2px",background:bg,fontWeight:isActiveCol?800:700,fontSize:10,color:tc,outline:isActiveCol?`1.5px solid ${B.blue}40`:undefined,outlineOffset:-1}}>{fmt(val)}</td>;
                })}
                <td style={{textAlign:"center",padding:"6px 4px",fontWeight:800,fontSize:11,color:t!=null&&t>=8?"#065F46":t!=null&&t>=5?"#92400E":t!=null&&t>0?"#991B1B":B.steel,background:t!=null&&t>=8?"#D1FAE5":t!=null&&t>=5?"#FEF3C7":t!=null&&t>0?"#FEE2E2":rowBg,borderLeft:`2px solid ${B.border}`}}>{fmt(t)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {/* Vendor bars */}
      <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:24}}>
        <div data-bars-wrap="" style={{flex:"1 1 100%",display:"flex",flexWrap:"wrap",gap:10}}>
          {sortedIdx.map(i=>{const v=vendors[i];
            return <div data-vendor-bars="" key={i} style={{flex:"1 1 340px",minWidth:0,background:"#fff",borderRadius:16,padding:12,border:`1px solid ${B.border}`,overflow:"hidden"}}>
            <div style={{fontSize:12,fontWeight:700,color:VC[i%VC.length],marginBottom:6}}>{v.name} — {fmt(totals[i])}/10</div>
            {sections.map((s,si)=>{
              const val=allSec[i]?allSec[i][si]:0;
              return <div key={si} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{width:100,fontSize:9,color:B.steel,fontWeight:400,textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={s.n}>{s.n}</div>
                <div style={{flex:1,minWidth:0}}><SegBar scores={v.scores} notes={v.notes} images={v.images} si={si} onNoteClick={setNotePopup} secs={sections} offs={SEC_OFF} sortByColor/></div>
                <span style={{fontSize:10,color:B.graphite,fontWeight:700,width:28,textAlign:"right",flexShrink:0}}>{fmt(val)}</span>
              </div>;
            })}
            <div style={{display:"flex",gap:8,marginTop:6,paddingTop:6,borderTop:"1px solid #F1F5F9",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#10B981"}}><div style={{width:8,height:8,borderRadius:2,background:"#10B981"}}/>Да</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#F59E0B"}}><div style={{width:8,height:8,borderRadius:2,background:"#F59E0B"}}/>Частично</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#EF4444"}}><div style={{width:8,height:8,borderRadius:2,background:"#EF4444"}}/>Нет</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:B.steel}}><div style={{width:8,height:8,borderRadius:2,background:"#E2E8F0"}}/>Нет оценки</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:B.steel}}><div style={{width:6,height:6,borderRadius:"50%",background:"#fff",border:"1px solid #999"}}/>Примечание</div>
            </div>
          </div>;})}
        </div>
      </div>

      {/* Top/bottom */}
      <div data-bottom-cards="" style={{display:"flex",flexWrap:"wrap",gap:12}}>
        {sortedIdx.map(i=>{const v=vendors[i];const advs=getAdvantages(v.scores);
          return <div key={i} style={{flex:"1 1 280px",minWidth:0,background:"#fff",borderRadius:16,padding:16,border:`1px solid ${B.border}`,borderTop:`3px solid ${VC[i%VC.length]}`}}>
            <div style={{fontSize:13,fontWeight:700,color:VC[i%VC.length],marginBottom:10,wordBreak:"break-word"}}>{v.name}</div>
            <div style={{fontSize:9,fontWeight:700,color:B.blue,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>☆ Преимущества</div>
            {advs.length===0?<div style={{fontSize:10,color:B.steel}}>—</div>:advs.map((a,j)=><div key={j} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"3px 0",fontSize:11}}><IconYes c="#10B981" s={12} style={{flexShrink:0,marginTop:1}}/><span style={{color:B.graphite,wordBreak:"break-word"}}>{a.n}</span></div>)}
          </div>;
        })}
      </div>
    </div>}

    {/* Footer */}
    <footer data-footer="" style={{padding:"12px 24px",borderTop:`1px solid ${B.border}`,background:"#fff",display:"flex",justifyContent:"center",alignItems:"center",gap:6,fontSize:11,color:B.steel,flexShrink:0}}>
      <span>Авторы:</span>
      <a href="https://t.me/anezuf" target="_blank" rel="noreferrer" style={{color:B.blue,fontWeight:600,textDecoration:"none"}}>Трандафил Кирилл Антонович</a>
      <span>·</span>
      <span style={{color:B.graphite,fontWeight:500}}>Грачев Егор Алексеевич</span>
    </footer>
  </div>;
}
