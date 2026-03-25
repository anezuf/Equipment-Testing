import { useState } from "react";

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
    <div style={{display:"flex",height:22,borderRadius:8,overflow:"hidden",background:"#F1F5F9",width:"100%"}}>
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

export default SegBar;
