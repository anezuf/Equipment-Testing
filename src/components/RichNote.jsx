import { useState, useRef, useEffect } from "react";

function RichNoteBtn({onMD,active,title,children}){
  return (
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
}

function RichNote({value,onChange}){
  const ref=useRef(null);
  const [fmts,setFmts]=useState({bold:false,ul:false,ol:false});
  const focused=useRef(false);
  const [isFocused,setIsFocused]=useState(false);

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
      ul:document.queryCommandState("insertUnorderedList"),
      ol:document.queryCommandState("insertOrderedList"),
    });
  };

  const exec=(c)=>{
    ref.current?.focus();
    try{
      // NOTE: For contentEditable editors there is still no single interoperable replacement
      // for semantic commands (especially undo-aware rich text formatting), so we keep
      // execCommand as primary behavior to preserve current UX and history handling.
      document.execCommand(c,false,null);
    }catch(err){
      if(c==="bold"){
        // Fallback: preserve basic bold behavior via Selection/Range when execCommand fails.
        const sel=window.getSelection();
        if(sel&&sel.rangeCount>0){
          const range=sel.getRangeAt(0);
          if(!range.collapsed){
            const strong=document.createElement("strong");
            try{
              range.surroundContents(strong);
            }catch(fallbackErr){
              console.warn("RichNote: bold fallback failed.",fallbackErr);
            }
          }
        }else{
          console.warn("RichNote: no selection for bold fallback.");
        }
      }else{
        // TODO: If execCommand support degrades further, replace command path with explicit Range-based transforms.
        console.warn(`RichNote: execCommand('${c}') failed.`,err);
      }
    }
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
    try{
      document.execCommand(listCmd,false,null);
    }catch(err){
      // TODO: List transforms with Range API are fragile for nested blocks; keep current behavior until safe replacement is implemented.
      console.warn(`RichNote: execCommand('${listCmd}') failed.`,err);
    }
    onChange(ref.current?.innerHTML||"");
    updateFmts();
  };

  return(
    <div style={{border:`${(isFocused||(value&&value!=="<br>"))?"1.5px solid #2F9AFF":"1px solid #E5EAF0"}`,borderRadius:8,background:"#F8FBFF",overflow:"hidden",transition:"border 0.15s"}}>
      <div style={{display:"flex",gap:3,padding:"4px 8px",borderBottom:"1px solid #E5EAF0",background:"#fff",flexWrap:"wrap",alignItems:"center"}}>
        <RichNoteBtn onMD={()=>exec("bold")} active={fmts.bold} title="Жирный (Ctrl+B)"><b>B</b></RichNoteBtn>
        <div style={{width:1,height:16,background:"#E5EAF0",margin:"0 2px"}}/>
        <RichNoteBtn onMD={()=>toggleList("UL")} active={fmts.ul} title="Маркированный список">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="2.5" cy="4" r="1.5" fill="currentColor"/><circle cx="2.5" cy="8" r="1.5" fill="currentColor"/><circle cx="2.5" cy="12" r="1.5" fill="currentColor"/><line x1="6" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </RichNoteBtn>
        <RichNoteBtn onMD={()=>toggleList("OL")} active={fmts.ol} title="Нумерованный список">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><text x="0" y="5" fontSize="5" fill="currentColor" fontWeight="700">1.</text><text x="0" y="9" fontSize="5" fill="currentColor" fontWeight="700">2.</text><text x="0" y="13" fontSize="5" fill="currentColor" fontWeight="700">3.</text><line x1="7" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="7" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="7" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </RichNoteBtn>
        <div style={{width:1,height:16,background:"#E5EAF0",margin:"0 2px"}}/>
        <button type="button" onMouseDown={e=>{e.preventDefault();if(ref.current){ref.current.innerHTML="";onChange("");ref.current.focus();}}}
          title="Очистить все"
          style={{width:26,height:26,borderRadius:5,border:"1px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:"all 0.15s"}}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 13l10-10M8 3l5 5-4 4H6l-3-3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rich-note"
        onFocus={()=>{focused.current=true;setIsFocused(true);updateFmts();}}
        onBlur={()=>{focused.current=false;setIsFocused(false);onChange(ref.current?.innerHTML||"");}}
        onInput={()=>onChange(ref.current?.innerHTML||"")}
        onKeyUp={updateFmts}
        onMouseUp={updateFmts}
        style={{minHeight:56,padding:"8px 12px",fontSize:12,lineHeight:1.5,outline:"none",
          fontFamily:"Inter,sans-serif",color:"#334155",wordBreak:"break-word",textAlign:"left"}}
      />
    </div>
  );
}

export default RichNote;
