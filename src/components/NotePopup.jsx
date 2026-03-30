import { useState } from "react";
import { B } from "../constants";

/* Note popup — shows on click, with param name, text, photos */
function NotePopup({note,onClose}){
  const [imgIdxByNote,setImgIdxByNote]=useState({});
  if(!note)return null;
  const noteKey=JSON.stringify([note.name,note.text,note.imgs?.map(img=>img?.name)]);
  const imgs=note.imgs||[];
  const total=imgs.length;
  const imgIdx=Math.min(imgIdxByNote[noteKey]??0,Math.max(total-1,0));
  const hasPrev=imgIdx>0,hasNext=imgIdx<total-1;

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,maxWidth:420,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",background:B.graphite,borderRadius:"16px 16px 0 0",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:"1.4",paddingRight:8}}>{note.name}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
      </div>
      <div style={{padding:"14px 16px",overflowY:"auto",flex:1}}>
        {note.text&&note.text.trim()&&note.text!=="<br>"&&<>
          <div className="npop" dangerouslySetInnerHTML={{__html:note.text}} style={{fontSize:12,color:B.graphite,lineHeight:"1.6",wordBreak:"break-word",background:"#F8FAFC",borderRadius:8,padding:"10px 12px",marginBottom:total>0?12:0,border:`1px solid ${B.border}`,textAlign:"left"}}/>
        </>}
        {total>0&&<div style={{position:"relative",borderRadius:8,overflow:"hidden",background:"#F1F5F9"}}>
          <img src={imgs[imgIdx].data} alt={imgs[imgIdx].name||""} style={{display:"block",width:"100%",maxHeight:300,objectFit:"contain",borderRadius:8}}/>
          {hasPrev&&<button onClick={e=>{e.stopPropagation();setImgIdxByNote(prev=>({...prev,[noteKey]:imgIdx-1}));}} style={{position:"absolute",top:"50%",left:8,transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}>‹</button>}
          {hasNext&&<button onClick={e=>{e.stopPropagation();setImgIdxByNote(prev=>({...prev,[noteKey]:imgIdx+1}));}} style={{position:"absolute",top:"50%",right:8,transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.45)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1}}>›</button>}
          {total>1&&<div style={{position:"absolute",bottom:6,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
            {imgs.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setImgIdxByNote(prev=>({...prev,[noteKey]:i}));}} style={{width:i===imgIdx?16:6,height:6,borderRadius:3,background:i===imgIdx?"#fff":"rgba(255,255,255,0.5)",cursor:"pointer",transition:"all 0.2s"}}/>)}
          </div>}
        </div>}
        {!note.text&&total===0&&<div style={{fontSize:12,color:B.steel}}>Нет данных</div>}
      </div>
    </div>
  </div>;
}

export default NotePopup;
