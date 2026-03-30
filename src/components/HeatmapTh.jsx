import { useState } from "react";
import { B } from "../constants";

export default function HeatmapTh({si,s,active,onSort}){
  const [hov,setHov]=useState(false);
  return <th onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onSort} style={{textAlign:"center",padding:"4px 2px",fontSize:10,fontWeight:active?800:600,color:active?B.blue:B.steel,verticalAlign:"middle",cursor:"pointer",userSelect:"none",transition:"color 0.15s",whiteSpace:"nowrap",position:"relative"}}>{si+1}{hov===true&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:"#334155",color:"#fff",fontSize:10,padding:"4px 8px",borderRadius:6,whiteSpace:"nowrap",pointerEvents:"none",zIndex:99}}>{s.n}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #334155"}}/></div>}</th>;
}
