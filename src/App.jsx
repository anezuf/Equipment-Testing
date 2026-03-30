import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useStorage, loadSaved } from "./hooks/useStorage";

import { B, VC, WC } from "./constants";
import { DEF_SECTIONS, PDU_DEFAULT, mkAll, mkOff } from "./sections";
import { calcTotal, calcSec } from "./scoring";
import { fmt } from "./utils";
import { exportTechSpecsXlsx } from "./utils/exportTechSpecs";
import { TECH_SPECS_DEFAULT, PDU_TECH_SPECS_DEFAULT, normalizeTechSpecs } from "./data/techSpecs";
import Logo from "./components/Logo";
import NotePopup from "./components/NotePopup";
import AutoSizeTextarea from "./components/AutoSizeTextarea";
import Dashboard from "./components/features/Dashboard";
import ScoreEditor from "./components/features/ScoreEditor";
import * as XLSX from "xlsx";


/* Weight: 0=Преимущество (excluded from score), 1=Требование, 2=Требование(!) critical */

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

const EQ_TYPES=["стойка","pdu"];


export default function App(){
  const [eqType,setEqType]=useStorage("rack_eq_type","стойка");
  const STORAGE_KEY=`rack_scoring_data_${eqType}`;
  const [scoringData,setScoringData]=useStorage(STORAGE_KEY,()=>{
    const defSecs=eqType==="pdu"?PDU_DEFAULT:DEF_SECTIONS;
    const defN=mkAll(defSecs).length;
    return{sections:defSecs,vendors:[{name:"Вендор 1",scores:Array(defN).fill(null),notes:Array(defN).fill(""),images:Array(defN).fill(null)}]};
  });
  const sections=scoringData?.sections??(eqType==="pdu"?PDU_DEFAULT:DEF_SECTIONS);
  const vendors=scoringData?.vendors??(()=>{const n=mkAll(sections).length;return[{name:"Вендор 1",scores:Array(n).fill(null),notes:Array(n).fill(""),images:Array(n).fill(null)}];})();
  const setSections=useCallback(ns=>setScoringData(p=>({...p,sections:typeof ns==="function"?ns(p.sections):ns})),[setScoringData]);
  const setVendors=useCallback(nv=>setScoringData(p=>({...p,vendors:typeof nv==="function"?nv(p.vendors):nv})),[setScoringData]);
  const ALL=useMemo(()=>mkAll(sections),[sections]);
  const SEC_OFF=useMemo(()=>mkOff(sections),[sections]);
  const itemCount=ALL.length;
  const [act,setAct]=useState(0);
  const [view,setView]=useState("editor");
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [noteOpen,setNoteOpen]=useState(null);
  const [notePopup,setNotePopup]=useState(null);
  const [infoPopup,setInfoPopup]=useState(null);
  const [showReset,setShowReset]=useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [expImgs,setExpImgs]=useState({});
  const [heatmapSort,setHeatmapSort]=useState({col:null,label:null});
  const [heatmapSelectedVendor, setHeatmapSelectedVendor] = useState(null);
  const techSpecsStorageKey=`rack_tech_specs_${eqType}`;
  const [techSpecs,setTechSpecs]=useStorage(techSpecsStorageKey,()=>eqType==="pdu"?PDU_TECH_SPECS_DEFAULT:TECH_SPECS_DEFAULT);
  const [techSpecsEditMode,setTechSpecsEditMode]=useState(false);
  const techSpecsSnapshot=useRef(null);
  useEffect(() => {
    const handler = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('orientationchange', handler); };
  }, []);

  const switchEqType=useCallback((newType)=>{
    if(newType===eqType)return;
    setEqType(newType);
    const savedScoring=loadSaved(`rack_scoring_data_${newType}`);
    if(savedScoring?.sections&&savedScoring?.vendors){
      const n=mkAll(savedScoring.sections).length;
      setScoringData({sections:savedScoring.sections,vendors:savedScoring.vendors.map(v=>({...v,images:v.images||Array(n).fill(null)}))});
    }else{
      const defSecs=newType==="pdu"?PDU_DEFAULT:DEF_SECTIONS;
      const defN=mkAll(defSecs).length;
      setScoringData({sections:defSecs,vendors:[{name:"Вендор 1",scores:Array(defN).fill(null),notes:Array(defN).fill(""),images:Array(defN).fill(null)}]});
    }
    const savedTech=loadSaved(`rack_tech_specs_${newType}`);
    if(savedTech)setTechSpecs(savedTech);
    else setTechSpecs(newType==="pdu"?PDU_TECH_SPECS_DEFAULT:TECH_SPECS_DEFAULT);
    setAct(0);
    setNoteOpen(null);
  },[eqType]);

  /* Export to Excel (same format as template) */
  const exportExcelFile=useCallback(async()=>{
    try{
      const {default:ExcelJS}=await import("exceljs");
      const wb=new ExcelJS.Workbook();
      const ws=wb.addWorksheet("Оценка");
      const colCount=3+vendors.length*2;

      /* helpers */
      const argb=hex=>"FF"+hex.replace("#","");
      const fill=hex=>({type:"pattern",pattern:"solid",fgColor:{argb:argb(hex)}});
      const fnt=(color,bold=false,size)=>({bold,color:{argb:argb(color)},...(size?{size}:{})});
      const CENTER={horizontal:"center",vertical:"middle"};
      const LEFT={horizontal:"left",vertical:"middle"};

      /* column widths */
      ws.getColumn(1).width=5;
      ws.getColumn(2).width=30;
      ws.getColumn(3).width=18;
      vendors.forEach((_,vi)=>{
        ws.getColumn(4+vi*2).width=12;
        ws.getColumn(5+vi*2).width=22;
      });

      /* ROW 1: title */
      ws.addRow(["ЧЕК-ЛИСТ ТЕСТИРОВАНИЯ СТОЕК"]);
      ws.mergeCells(1,1,1,colCount);
      const tc=ws.getCell(1,1);
      tc.fill=fill("#334155");tc.font=fnt("#FFFFFF",true,13);tc.alignment=CENTER;
      ws.getRow(1).height=26;

      /* ROW 2: headers */
      const hdr=["#","Параметр","Тип"];
      vendors.forEach((v,n)=>{hdr.push(v.name);hdr.push(`Прим. В${n+1}`);});
      ws.addRow(hdr);
      for(let c=1;c<=colCount;c++){
        const cell=ws.getCell(2,c);
        cell.fill=fill("#334155");cell.font=fnt("#FFFFFF",true);cell.alignment=CENTER;
      }
      ws.getRow(2).height=18;

      /* data rows */
      let gi=0;
      let rowNum=3;
      sections.forEach(sec=>{
        /* section header */
        ws.addRow([sec.n]);
        ws.mergeCells(rowNum,1,rowNum,colCount);
        const sc=ws.getCell(rowNum,1);
        sc.fill=fill("#2F9AFF");sc.font=fnt("#FFFFFF",true);sc.alignment=CENTER;
        ws.getRow(rowNum).height=16;
        rowNum++;

        sec.items.forEach(it=>{
          const typeStr=it.w===2?"★! Требование":it.w===1?"★ Требование":"☆ Преимущество";
          const isReq=it.w>=1;
          const altBg=gi%2===0?"#F5F8FB":"#FFFFFF";

          const cleanNote=(str)=>{if(!str)return'';return str.replace(/<[^>]*>/g,'').trim();};
          const rowData=[gi+1,it.n,typeStr];
          vendors.forEach(v=>{
            rowData.push(v.scores[gi]!=null?v.scores[gi]:"");
            rowData.push(cleanNote(v.notes[gi]));
          });
          ws.addRow(rowData);
          ws.getRow(rowNum).height=15;

          /* A: number */
          const ca=ws.getCell(rowNum,1);
          ca.font=fnt("#7B97B2");ca.alignment=CENTER;

          /* B: name */
          const cb=ws.getCell(rowNum,2);
          cb.font=fnt("#334155");cb.alignment=LEFT;

          /* C: type */
          const cc=ws.getCell(rowNum,3);
          cc.fill=isReq?fill("#FEE2E2"):fill("#DBEAFE");
          cc.font=isReq?fnt("#DC2626",true):fnt("#2F9AFF",true);
          cc.alignment=CENTER;

          /* score + note cols */
          vendors.forEach((_,vi)=>{
            const sc2=ws.getCell(rowNum,4+vi*2);
            sc2.fill=fill(altBg);sc2.alignment=CENTER;
            const nc=ws.getCell(rowNum,5+vi*2);
            nc.fill=fill(altBg);nc.font=fnt("#7B97B2");
          });

          rowNum++;gi++;
        });
      });

      /* download */
      const buffer=await wb.xlsx.writeBuffer();
      const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="scoring_export.xlsx";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(err){
      console.error(err);
      alert("Ошибка экспорта Excel: "+err.message);
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
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:"array"});
        const wsName=wb.SheetNames.find(n=>n==="Оценка")||wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

        /* Row 0 = title (skip), Row 1 = headers */
        const hdr=data[1]||[];

        /* Vendor columns: vendor name at col 3, 5, 7... note at col+1 */
        const vendorCols=[];
        for(let c=3;c<hdr.length;c+=2){
          const name=String(hdr[c]||"").trim();
          if(name)vendorCols.push({name,scoreCol:c,noteCol:c+1});
        }
        if(vendorCols.length===0){alert("Не найдены колонки вендоров");return;}

        /* Parse sections and items from row 2 onward */
        const newSections=[];
        let curSec=null;
        for(let r=2;r<data.length;r++){
          const row=data[r];
          if(!row||row.every(c=>c===""||c==null))continue;
          const colA=row[0];
          const colB=String(row[1]||"").trim();
          const aNum=Number(colA);

          /* Section header: col A is non-empty non-number, col B is empty */
          if(colA&&isNaN(aNum)&&colB===""){
            curSec={n:String(colA).trim(),items:[]};
            newSections.push(curSec);
            continue;
          }

          /* Item row: col A is a positive integer */
          if(!isNaN(aNum)&&aNum>0){
            const colC=String(row[2]||"");
            const w=colC.includes("!")?2:colC.includes("★")?1:0;
            if(!curSec){curSec={n:"Раздел",items:[]};newSections.push(curSec);}
            curSec.items.push({n:String(row[1]||"").trim(),w});
          }
        }

        if(newSections.length===0||newSections.every(s=>s.items.length===0)){
          alert("Не удалось распознать структуру файла");return;
        }

        /* Build vendor score/note arrays */
        const totalItems=newSections.reduce((a,s)=>a+s.items.length,0);
        const newVendors=vendorCols.map(vn=>{
          const scores=Array(totalItems).fill(null);
          const notes=Array(totalItems).fill("");
          const images=Array(totalItems).fill(null);
          let idx=0;
          for(let r=2;r<data.length;r++){
            const row=data[r];
            if(!row)continue;
            const aNum=Number(row[0]);
            if(isNaN(aNum)||aNum<=0)continue; /* skip title, header, section rows */
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
          return{name:vn.name,scores,notes,images};
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

  const exportTechSpecs=useCallback(async()=>{
    try{
      await exportTechSpecsXlsx({ techSpecs, eqType });
    }catch(err){
      console.error(err);
      alert("Ошибка экспорта: "+err.message);
    }
  },[techSpecs,eqType]);

  const importTechSpecs=useCallback(()=>{
    const input=document.createElement("input");
    input.type="file";
    input.accept=".json,.xlsx,.xls";
    input.onchange=async e=>{
      const file=e.target.files[0];
      if(!file)return;
      const ext=file.name.split(".").pop().toLowerCase();

      if(ext==="json"){
        const reader=new FileReader();
        reader.onload=ev=>{
          try{
            const d=JSON.parse(ev.target.result);
            if(Array.isArray(d))setTechSpecs(normalizeTechSpecs(d));
            else alert("Неверный формат файла");
          }catch{alert("Ошибка чтения JSON");}
        };
        reader.readAsText(file);
        return;
      }

      try{
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:"array"});
        const wsName=wb.SheetNames.find(n=>n==="ТУ")||wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});

        const newSpecs=[];
        let curSec=null;
        for(let r=0;r<data.length;r++){
          const row=Array.isArray(data[r])?data[r]:[];
          const col0Raw=row[0];
          const col1Raw=row[1];
          const col2Raw=row[2];
          const col0=String(col0Raw??"").trim();
          const col1=String(col1Raw??"").trim();
          const col2=String(col2Raw??"").trim();
          const col1Empty=col1===""||Number.isNaN(col1Raw);
          const col2Empty=col2===""||Number.isNaN(col2Raw);
          const col0Numeric=col0!==""&&!Number.isNaN(Number(col0));

          if(col0==="#" )continue;

          if(col1Empty&&col0!==""&&col0!=="#"){
            curSec={n:col0,items:[]};
            newSpecs.push(curSec);
            continue;
          }

          if(col0Numeric&&!col1Empty&&curSec){
            curSec.items.push({n:col1,n2:col2Empty?"":col2});
          }
        }

        const validSpecs=newSpecs.filter(sec=>Array.isArray(sec.items)&&sec.items.length>0);
        if(validSpecs.length===0){
          alert("Не удалось распознать структуру ТУ: в файле не найдено ни одного корректного раздела с параметрами.");
          return;
        }
        setTechSpecs(normalizeTechSpecs(validSpecs));
        // Auto-sync sections from loaded tech specs, preserving weights from current defaults
        const defaultSecs = eqType === "pdu" ? PDU_DEFAULT : DEF_SECTIONS;
        const syncedSections = validSpecs.map(sec => {
          const defSec = defaultSecs.find(s => s.n === sec.n);
          return {
            n: sec.n,
            items: sec.items.map(it => {
              const defItem = defSec?.items?.find(x => x.n === it.n);
              return { n: it.n, w: defItem?.w ?? 1 };
            })
          };
        });
        const totalItems = syncedSections.reduce((a,s) => a + s.items.length, 0);
        setSections(syncedSections);
        setVendors(v => v.map(vnd => ({
          ...vnd,
          scores: Array(totalItems).fill(null),
          notes: Array(totalItems).fill(""),
          images: Array(totalItems).fill(null)
        })));
        alert(`✓ Загружено: разделов ${validSpecs.length}, параметров ${validSpecs.reduce((a,s)=>a+s.items.length,0)}`);
      }catch(err){
        alert("Ошибка чтения XLSX: "+err.message);
      }
    };
    input.click();
  },[eqType]);

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
    const esc=(str)=>String(str??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

    let html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(v.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    <style>
      *{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
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
      .pdf-btn{display:block;margin:0 auto 24px;padding:10px 20px;border-radius:12px;border:1.5px dashed #CBD5E1;background:#F8FAFC;color:#7B97B2;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui,sans-serif;transition:all 0.2s ease}
      .pdf-btn:hover{border:1.5px solid #2F9AFF;background:#EFF6FF;color:#2F9AFF}
      .sec-block{break-inside:avoid}
      .row{break-inside:avoid}
      @media print{body{padding:16px}.pdf-btn{display:none!important}}
    </style></head><body>`;

    html+=`<button class="pdf-btn" onclick="window.print()">Сохранить в PDF</button>`;
    html+=`<h1>${esc(v.name)}</h1>`;
    const tColor=total!=null&&total>=7?"#10B981":total!=null&&total>=4?"#F59E0B":"#7B97B2";
    html+=`<div class="total" style="background:${tColor}">${fmt(total)} / 10</div>`;

    let gi=0;
    sections.forEach((sec,si)=>{
      html+=`<div class="sec-block"><div class="sec">${esc(sec.n)}</div><div class="items">`;
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
        html+=`<div class="row"><div class="rhead">${star}<span class="rname">${esc(it.n)}</span><span class="rscore" style="color:${scoreColor}">${scoreLabel}</span></div>`;
        if(nt)html+=`<div class="note">${nt}</div>`;
        if(imgs&&imgs.length){
          html+=`<div class="photos">`;
          imgs.forEach(im=>{html+=`<img src="${im.data}" alt="${esc(im.name||"")}">`;});
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
      html+=`<div class="srow"><span class="sn">${esc(sec.n)}</span><span class="sv">${fmt(val)}</span></div>`;
    });
    html+=`<div class="srow" style="border-top:2px solid #E5EAF0;font-weight:700"><span>ИТОГО</span><span style="color:${tColor}">${fmt(total)}</span></div>`;
    html+=`</div></body></html>`;

    const w=window.open("","_blank");
    if(!w){
      alert("Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    const closePrintWindow=()=>{try{w.close();}catch{}};
    w.onafterprint=closePrintWindow;
    setTimeout(()=>{
      try{
        w.focus();
        w.print();
      }catch{
        closePrintWindow();
      }
    },500);
  },[sections,vendors]);

  const setSectionName=(si,name)=>{const n=sections.map((s,i)=>i===si?{...s,n:name}:s);setSections(n);};
  const addSection=()=>{
    const newSection={n:"Новый раздел",items:[{n:"Параметр 1",w:2}]};
    const insertAt=itemCount;
    const blockLen=newSection.items.length;
    setSections([...sections,newSection]);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(insertAt,0,...Array(blockLen).fill(null));
      notes.splice(insertAt,0,...Array(blockLen).fill(""));
      images.splice(insertAt,0,...Array(blockLen).fill(null));
      return {...v,scores,notes,images};
    }));
  };
  const rmSection=(si)=>{
    if(sections.length<=1)return;
    const absIdx=SEC_OFF[si];
    const blockLen=sections[si].items.length;
    const n=sections.filter((_,i)=>i!==si);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,blockLen);
      notes.splice(absIdx,blockLen);
      images.splice(absIdx,blockLen);
      return {...v,scores,notes,images};
    }));
  };
  const setItemName=(si,ii,name)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,n:name}:it)}:s);setSections(n);};
  const setItemWeight=(si,ii,w)=>{const n=sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,w}:it)}:s);setSections(n);};
  const addItem=(si,ii)=>{
    const insertIdx=ii==null?sections[si].items.length-1:ii;
    const absIdx=SEC_OFF[si]+insertIdx+1;
    const n=sections.map((s,i)=>i===si?{...s,items:[...s.items.slice(0,insertIdx+1),{n:"Новый параметр",w:2},...s.items.slice(insertIdx+1)]}:s);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,0,null);
      notes.splice(absIdx,0,"");
      images.splice(absIdx,0,null);
      return {...v,scores,notes,images};
    }));
  };
  const rmItem=(si,ii)=>{
    if(sections[si].items.length<=1)return;
    const absIdx=SEC_OFF[si]+ii;
    const n=sections.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s);
    setSections(n);
    setVendors(prev=>prev.map(v=>{
      const scores=[...v.scores];
      const notes=[...v.notes];
      const images=[...(v.images||[])];
      scores.splice(absIdx,1);
      notes.splice(absIdx,1);
      images.splice(absIdx,1);
      return {...v,scores,notes,images};
    }));
  };

  const addV=()=>{if(vendors.length>=25)return;setVendors(p=>[...p,{name:`Вендор ${p.length+1}`,scores:Array(itemCount).fill(null),notes:Array(itemCount).fill(""),images:Array(itemCount).fill(null)}]);};
  const rmV=i=>{if(vendors.length<=1)return;setVendors(p=>p.filter((_,j)=>j!==i));if(act>=vendors.length-1&&act>0)setAct(act-1);};
  const setScore=useCallback((idx,val)=>{setVendors(p=>{const n=[...p];const v={...n[act],scores:[...n[act].scores]};v.scores[idx]=v.scores[idx]===val?null:val;n[act]=v;return n;});},[act]);
  const setNote=useCallback((idx,html)=>{const clean=html.replace(/<br\s*\/?>/gi,'').replace(/<div><\/div>/gi,'').trim();const final=clean===''?'':html;setVendors(p=>{const n=[...p];const v={...n[act],notes:[...n[act].notes]};v.notes[idx]=final;n[act]=v;return n;});},[act]);
  const addImage=useCallback((idx,name,dataUrl,isFile=false,isImg=false,isVid=false)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=v.images[idx]||[];v.images[idx]=[...arr,{name,data:dataUrl,isFile,isImg,isVid}];n[act]=v;return n;});},[act]);
  const rmImage=useCallback((idx,imgIdx)=>{setVendors(p=>{const n=[...p];const v={...n[act],images:[...(n[act].images||[])]};const arr=[...(v.images[idx]||[])];arr.splice(imgIdx,1);v.images[idx]=arr.length?arr:null;n[act]=v;return n;});},[act]);
  const setName=(i,nm)=>{setVendors(p=>{const n=[...p];n[i]={...n[i],name:nm};return n;});};

  const totals=useMemo(()=>vendors.map(v=>calcTotal(v.scores,ALL)),[vendors,ALL]);
  const allSec=useMemo(()=>vendors.map(v=>sections.map((_,si)=>calcSec(v.scores,si,sections,SEC_OFF))),[vendors,sections,SEC_OFF]);

  const sortedIdx=useMemo(()=>{
    const arr=vendors.map((_,i)=>i);
    arr.sort((a,b)=>{const ta=totals[a],tb=totals[b];if(ta==null&&tb==null)return a-b;if(ta==null)return 1;if(tb==null)return -1;return tb-ta;});
    return arr;
  },[vendors,totals]);

  const getAdvantages=(sc)=>ALL.flatMap((it,i)=>it.w===0&&sc[i]!=null&&sc[i]>0?[{...it,idx:i}]:[]);
  const resetHeatmapPrintScroll=useCallback(()=>{
    if(typeof document==="undefined")return;
    document.querySelectorAll(".heatmap-table-wrap").forEach((el)=>{el.scrollLeft=0;});
  },[]);

  useEffect(()=>{
    const handleBeforePrint=()=>{resetHeatmapPrintScroll();};
    window.addEventListener("beforeprint",handleBeforePrint);
    return ()=>window.removeEventListener("beforeprint",handleBeforePrint);
  },[resetHeatmapPrintScroll]);

  useEffect(()=>{
    if(infoPopup===null)return;
    const close=()=>setInfoPopup(null);
    window.addEventListener("click",close,{once:true});
    return ()=>window.removeEventListener("click",close);
  },[infoPopup]);

  const exportPDF=useCallback(()=>{
    resetHeatmapPrintScroll();
    window.print();
  },[resetHeatmapPrintScroll]);

  const getTechReq=(secName,itemName)=>{
    const sec=techSpecs.find(s=>s.n===secName);
    const item=sec?.items?.find(x=>x.n===itemName);
    return item?.n2||"";
  };
  const navBtn=(label,v)=><button className="btn-nav" onClick={()=>setView(v)} style={{padding:"10px 16px",borderRadius:20,border:"none",cursor:"pointer",background:view===v?B.blue:"transparent",color:view===v?"#fff":B.steel,fontSize:13,fontWeight:600,transition:"all 0.2s",whiteSpace:"nowrap"}}>{label}</button>;
  const moveSection=(si,dir)=>{
    const newIdx=si+dir;
    if(newIdx<0||newIdx>=sections.length)return;
    const oldOffs=mkOff(sections);
    const newSections=(()=>{const a=[...sections];[a[si],a[newIdx]]=[a[newIdx],a[si]];return a;})();
    setSections(newSections);
    setVendors(prev=>prev.map(v=>{
      const sc=[],nt=[],im=[];
      for(let i=0;i<newSections.length;i++){
        const sec=newSections[i];
        let origIdx=-1;
        for(let j=0;j<sections.length;j++){
          if(sections[j]===sec){
            origIdx=j;
            break;
          }
        }
        if(origIdx<0)continue;
        const off=oldOffs[origIdx];
        for(let k=0;k<sec.items.length;k++){sc.push(v.scores[off+k]??null);nt.push(v.notes[off+k]??"");im.push(v.images?.[off+k]??null);}
      }
      return{...v,scores:sc,notes:nt,images:im};
    }));
  };
  const moveItem=(si,ii,dir)=>{
    const newIdx=ii+dir;
    if(newIdx<0||newIdx>=sections[si].items.length)return;
    setSections(p=>p.map((s,i)=>i===si?{...s,items:(()=>{const a=[...s.items];[a[ii],a[newIdx]]=[a[newIdx],a[ii]];return a;})()}:s));
    const off=SEC_OFF[si];
    setVendors(prev=>prev.map(v=>{
      const sc=[...v.scores];const nt=[...v.notes];const im=[...(v.images||[])];
      const[ms]=sc.splice(off+ii,1);const[mn]=nt.splice(off+ii,1);const[mi]=im.splice(off+ii,1);
      const insertIdx=off+(newIdx>ii?newIdx-1:newIdx);
      sc.splice(insertIdx,0,ms);nt.splice(insertIdx,0,mn);im.splice(insertIdx,0,mi??null);
      return{...v,scores:sc,notes:nt,images:im};
    }));
  };
  const moveTechSection=(si,dir)=>{
    const newIdx=si+dir;
    if(newIdx<0||newIdx>=techSpecs.length)return;
    setTechSpecs(p=>{const a=[...p];[a[si],a[newIdx]]=[a[newIdx],a[si]];return a;});
  };
  const moveTechItem=(si,ii,dir)=>{
    const newIdx=ii+dir;
    if(newIdx<0||newIdx>=techSpecs[si].items.length)return;
    setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:(()=>{const a=[...s.items];[a[ii],a[newIdx]]=[a[newIdx],a[ii]];return a;})()}:s));
  };
  return <div style={{minHeight:"100vh",background:B.bg,fontFamily:"Inter, system-ui, sans-serif",position:"relative",overflowX:"hidden"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet"/>

    

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
          <button className="btn-secondary" onClick={()=>setShowReset(false)} style={{padding:"10px 28px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.graphite,fontSize:14,fontWeight:600,cursor:"pointer"}}>Отмена</button>
          <button className="btn-primary" onClick={doReset} style={{padding:"10px 28px",borderRadius:12,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Да, сбросить</button>
        </div>
      </div>
    </div>}

    {showApplyConfirm && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}} onClick={()=>setShowApplyConfirm(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:400,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={B.blue} strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite,marginBottom:8}}>Применить в редактор?</div>
          <div style={{fontSize:13,color:B.steel,marginBottom:24,lineHeight:"1.5"}}>Разделы и параметры в редакторе будут обновлены из тех. условий. Веса новых параметров будут установлены как «Преимущество». Существующие веса сохранятся.</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button type="button" className="btn-secondary" onClick={()=>setShowApplyConfirm(false)} style={{padding:"10px 28px",borderRadius:12,border:`1.5px solid ${B.border}`,background:"#fff",color:B.graphite,fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>Отмена</button>
            <button type="button" className="btn-primary" onClick={()=>{
              const newSections = techSpecs.map(sec => ({
                n: sec.n,
                items: sec.items.map(it => {
                  const existing = sections.find(s=>s.n===sec.n)?.items?.find(x=>x.n===it.n);
                  return { n: it.n, w: existing?.w ?? 0 };
                })
              }));
              const totalItems = newSections.reduce((a,s)=>a+s.items.length,0);
              setSections(newSections);
              setVendors(v => v.map(vnd => ({
                ...vnd,
                scores: Array(totalItems).fill(null),
                notes: Array(totalItems).fill(""),
                images: Array(totalItems).fill(null)
              })));
              setShowApplyConfirm(false);
              setTechSpecsEditMode(false);
            }} style={{padding:"10px 28px",borderRadius:12,border:"none",background:B.blue,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              Применить
            </button>
          </div>
        </div>
      </div>
    )}

    {/* NAV */}
    <div data-nav="" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",background:"#fff",borderBottom:`1px solid ${B.border}`,position:"sticky",top:0,zIndex:50,gap:8,flexWrap:"wrap"}}>
      <div className="nav-left-group" style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Logo h={26}/>
          <div style={{width:1,height:22,background:B.border}}/>
          <span className="nav-nits" style={{fontSize:13,fontWeight:700,color:B.graphite,letterSpacing:"0.5px"}}>НИТС</span>
        </div>
        <div className="nav-tabs" style={{display:"flex",gap:3,background:"#F1F5F9",borderRadius:20,padding:2}}>
          <div style={{
            overflow:"hidden",
            maxWidth: (view==="techspecs"||view==="editor") ? 150 : 0,
            opacity: (view==="techspecs"||view==="editor") ? 1 : 0,
            transition:"max-width 0.3s ease, opacity 0.3s ease",
            display:"inline-flex",
            pointerEvents: (view==="techspecs"||view==="editor") ? "auto" : "none",
          }}>
            {navBtn("Редактор","editor")}
          </div>
          {navBtn("Тех. условия","techspecs")}{navBtn("Оценка","input")}{navBtn("Дашборд","dashboard")}
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {view==="dashboard"&&<button className="btn-add-vendor" onClick={exportPDF} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>PDF</button>}
      </div>
    </div>

    {/* ═══ EDITOR ═══ */}
    {view==="editor"&&<div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Редактор чек-листа</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Настройте разделы, параметры и веса перед оценкой</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn-secondary" onClick={importFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Загрузить
          </button>
          <button className="btn-action" onClick={exportExcelFile} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Сохранить
          </button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {EQ_TYPES.map(t=>
          <button key={t} onClick={()=>switchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {t==="стойка"?"Стойка":"PDU"}
          </button>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
        <button className="btn-add-vendor" onClick={addSection} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Раздел</button>
      </div>
      {sections.map((sec,si)=>
        <div key={si} style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
            <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
              <button type="button" className="btn-icon" onClick={()=>moveSection(si,-1)} disabled={si===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===0?0.3:1,padding:0}}>↑</button>
              <button type="button" className="btn-icon" onClick={()=>moveSection(si,1)} disabled={si===sections.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===sections.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===sections.length-1?0.3:1,padding:0}}>↓</button>
            </div>
            <input value={sec.n} onChange={e=>setSectionName(si,e.target.value)} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0}}/>
            {sections.length>1&&<button type="button" className="btn-icon-close" onClick={()=>rmSection(si)} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>}
          </div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            {sec.items.map((it,ii)=>
              <div key={ii} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"8px 16px",borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
                  <button type="button" className="btn-icon" onClick={()=>moveItem(si,ii,-1)} disabled={ii===0} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===0?0.3:1,padding:0}}>↑</button>
                  <button type="button" className="btn-icon" onClick={()=>moveItem(si,ii,1)} disabled={ii===sec.items.length-1} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===sec.items.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===sec.items.length-1?0.3:1,padding:0}}>↓</button>
                </div>
                <textarea value={it.n} onChange={e=>{setItemName(si,ii,e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} onFocus={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}} rows={1} style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",minWidth:0,resize:"none",overflow:"hidden",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0}} placeholder="Название параметра"/>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <button type="button" className="btn-score" onClick={()=>setItemWeight(si,ii,it.w===2?1:2)} style={{width:28,height:28,borderRadius:8,border:it.w===2?`2px solid #DC2626`:`2px solid ${B.border}`,background:it.w===2?"#FEE2E2":"#fff",cursor:"pointer",fontSize:13,fontWeight:800,color:it.w===2?"#DC2626":B.steel,display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",visibility:it.w>=1?"visible":"hidden"}} title="Критичный параметр (×2)">!</button>
                  {[{w:1},{w:0}].map(({w:wv})=>{
                    const on=wv===0?it.w===0:(it.w>=1);
                    const wc=WC[wv];
                    const star=wv===0?"☆":"★";
                    return <button type="button" className="btn-score" key={wv} onClick={()=>setItemWeight(si,ii,wv===0?0:1)} style={{padding:"4px 10px",borderRadius:8,border:on?`2px solid ${wc.bc}`:`2px solid ${B.border}`,background:on?wc.bg:"#fff",cursor:"pointer",fontSize:10,fontWeight:700,color:on?wc.c:B.steel,transition:"all 0.15s",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:2}}>
                      <span>{star}</span>
                      {isPortrait ? null : <span className="editor-btn-label"> {wv===1 ? "Требование" : "Преимущество"}</span>}
                    </button>;
                  })}
                  {sec.items.length>1&&<button type="button" className="btn-icon-close" onClick={()=>rmItem(si,ii)} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>×</button>}
                </div>
              </div>
            )}
            <button type="button" className="btn-secondary" onClick={()=>addItem(si)} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Добавить параметр</button>
          </div>
        </div>
      )}
      <div style={{textAlign:"center",padding:20}}>
        <button className="btn-primary" onClick={()=>setView("input")} style={{padding:"10px 32px",borderRadius:20,border:"none",background:`linear-gradient(90deg,${B.blue},${B.neon})`,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${B.blue}44`}}>Перейти к оценке →</button>
      </div>
    </div>}

    {/* ═══ INPUT ═══ */}
    {view==="techspecs"&&<div className="view-section-pad" style={{maxWidth:920,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,paddingBottom:12,borderBottom:`1px solid ${B.border}`}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:16,fontWeight:700,color:B.graphite}}>Технические условия (Стандарт качества)</div>
          <div style={{fontSize:12,color:B.steel,marginTop:2}}>Критерии подбора оборудования — только для справки, не влияет на расчёты</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {techSpecsEditMode ? (
            <>
              <button className="btn-secondary" onClick={()=>{setTechSpecs(techSpecsSnapshot.current);setTechSpecsEditMode(false);}} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                Отменить
              </button>
              <button className="btn-secondary" onClick={()=>setShowApplyConfirm(true)} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.blue}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Применить
              </button>
              <button className="btn-secondary" onClick={exportTechSpecs} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Сохранить
              </button>
              <button className="btn-secondary" onClick={importTechSpecs} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Загрузить
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={()=>{techSpecsSnapshot.current=JSON.parse(JSON.stringify(techSpecs));setTechSpecsEditMode(true);}} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${B.border}`,background:"#fff",color:B.steel,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Редактировать
            </button>
          )}
        </div>
      </div>
      {!techSpecsEditMode && (
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        {EQ_TYPES.map(t=>
          <button key={t} onClick={()=>switchEqType(t)} style={{padding:"6px 16px",borderRadius:12,border:`1.5px solid ${eqType===t?B.blue:B.border}`,background:eqType===t?"#EFF6FF":"#fff",color:eqType===t?B.blue:B.steel,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {t==="стойка"?"Стойка":"PDU"}
          </button>
        )}
      </div>
      )}
      {techSpecsEditMode&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
        <button className="btn-add-vendor" onClick={()=>setTechSpecs(p=>[...p,{n:"Новый раздел",items:[{n:"Новый параметр",n2:""}]}])} style={{padding:"6px 14px",borderRadius:12,border:"1.5px dashed #CBD5E1",background:"#F8FAFC",color:"#7B97B2",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Раздел</button>
      </div>}
      {techSpecs.map((sec,si)=>
        <div key={si} style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:B.graphite,borderRadius:"12px 12px 0 0",borderLeft:`3px solid ${VC[si%VC.length]}`}}>
            {techSpecsEditMode&&(
              <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0}}>
                <button type="button" className="btn-icon" onClick={()=>moveTechSection(si,-1)} disabled={si===0} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===0?0.3:1,padding:0}}>↑</button>
                <button type="button" className="btn-icon" onClick={()=>moveTechSection(si,1)} disabled={si===techSpecs.length-1} style={{width:20,height:20,borderRadius:3,border:"none",background:"rgba(255,255,255,0.15)",color:"#fff",cursor:si===techSpecs.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:si===techSpecs.length-1?0.3:1,padding:0}}>↓</button>
              </div>
            )}
            <input readOnly={!techSpecsEditMode} value={sec.n} onChange={e=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,n:e.target.value}:s))} style={{flex:1,background:"transparent",border:"none",color:"#fff",fontSize:13,fontWeight:700,outline:"none",minWidth:0,pointerEvents:techSpecsEditMode?"auto":"none"}}/>
            {techSpecsEditMode&&techSpecs.length>1&&<button type="button" className="btn-icon-close" onClick={()=>setTechSpecs(p=>p.filter((_,i)=>i!==si))} style={{background:"none",border:"none",color:"#ffffff88",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>×</button>}
          </div>
          <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:`1px solid ${B.border}`,borderTop:"none"}}>
            <div style={{display:"flex",padding:"6px 16px",background:"#F8FAFC",borderBottom:`1px solid ${B.border}`}}>
              <div style={{flex:"0 0 40%",fontSize:10,fontWeight:700,color:B.steel,textTransform:"uppercase",letterSpacing:"0.5px"}}>Параметр</div>
              <div style={{flex:"1 1 60%",fontSize:10,fontWeight:700,color:B.steel,textTransform:"uppercase",letterSpacing:"0.5px",paddingLeft:16}}>Требование</div>
            </div>
            {sec.items.map((it,ii)=>
              <div key={ii} className="ts-item-row" style={{display:"flex",alignItems:"stretch",gap:8,padding:"0 16px",minHeight:40,borderTop:ii?`1px solid #F1F5F9`:"none"}}>
                <div className="ts-param-col" style={{position:"relative",flex:"0 0 40%",display:"flex",alignItems:"flex-start",padding:"8px 0",borderRight:`1px solid ${B.border}`,paddingRight:12}}>
                  {techSpecsEditMode&&(
                    <div style={{display:"flex",gap:3,marginRight:4,flexShrink:0,alignSelf:"flex-start",marginTop:3}}>
                      <button type="button" className="btn-icon" onClick={()=>moveTechItem(si,ii,-1)} disabled={ii===0} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===0?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===0?0.3:1,padding:0}}>↑</button>
                      <button type="button" className="btn-icon" onClick={()=>moveTechItem(si,ii,1)} disabled={ii===sec.items.length-1} style={{width:20,height:20,borderRadius:3,border:"0.5px solid #E5EAF0",background:"#fff",color:"#7B97B2",cursor:ii===sec.items.length-1?"not-allowed":"pointer",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:ii===sec.items.length-1?0.3:1,padding:0}}>↓</button>
                    </div>
                  )}
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n}
                    onChange={e=>{const v=e.target.value;setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((x,j)=>j===ii?{...x,n:v}:x)}:s));}}
                    minHeight={20}
                    placeholder="Параметр"
                    style={{flex:1,border:"none",background:"none",fontSize:12,color:B.graphite,outline:"none",resize:"none",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",padding:0,minWidth:0}}
                  />
                </div>
                <div className="ts-req-col" style={{flex:"1 1 60%",display:"flex",alignItems:"center",padding:"8px 0",paddingLeft:12,background:"transparent"}}>
                  <AutoSizeTextarea
                    readOnly={!techSpecsEditMode}
                    value={it.n2||""}
                    onChange={e=>{const v=e.target.value;setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((x,j)=>j===ii?{...x,n2:v}:x)}:s));}}
                    minHeight={36}
                    placeholder="Требование"
                    style={{flex:1,border:"none",background:"#EFF6FF",borderRadius:6,padding:"6px 10px",fontSize:12,color:B.steel,outline:"none",resize:"none",fontFamily:"Inter, system-ui, sans-serif",lineHeight:"1.4",minWidth:0}}
                  />
                </div>
                {techSpecsEditMode&&sec.items.length>1&&<button type="button" className="btn-icon-close ts-item-delete" onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s))} style={{background:"none",border:"none",color:B.steel,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",alignSelf:"center"}}>×</button>}
              </div>
            )}
            {techSpecsEditMode&&<button type="button" className="btn-secondary" onClick={()=>setTechSpecs(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,{n:"",n2:""}]}:s))} style={{width:"100%",padding:"8px",border:"none",borderTop:`1px solid #F1F5F9`,background:"none",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:"0 0 12px 12px",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>+ Добавить условие</button>}
          </div>
        </div>
      )}
    </div>}

        {view==="input"&&<ScoreEditor
      vendors={vendors}
      sections={sections}
      ALL={ALL}
      SEC_OFF={SEC_OFF}
      act={act}
      setAct={setAct}
      noteOpen={noteOpen}
      setNoteOpen={setNoteOpen}
      expImgs={expImgs}
      setExpImgs={setExpImgs}
      onScoreChange={setScore}
      onNoteChange={setNote}
      onImageAdd={addImage}
      onImageRemove={rmImage}
      isPortrait={isPortrait}
      onAddVendor={addV}
      onRemoveVendor={rmV}
      onVendorNameChange={setName}
      onExportVendorPDF={exportVendorPDF}
      onImport={importFile}
      onShowReset={()=>setShowReset(true)}
      infoPopup={infoPopup}
      setInfoPopup={setInfoPopup}
      getTechReq={getTechReq}
      onNavigateDashboard={()=>setView("dashboard")}
    />}

    {/* DASHBOARD */}
    {view==="dashboard"&&<Dashboard
      vendors={vendors}
      sections={sections}
      totals={totals}
      allSec={allSec}
      sortedIdx={sortedIdx}
      heatmapSort={heatmapSort}
      setHeatmapSort={setHeatmapSort}
      heatmapSelectedVendor={heatmapSelectedVendor}
      setHeatmapSelectedVendor={setHeatmapSelectedVendor}
      setNotePopup={setNotePopup}
      SEC_OFF={SEC_OFF}
      getAdvantages={getAdvantages}
    />}

    {/* Footer */}
    <footer data-footer="" style={{padding:"12px 24px",borderTop:`1px solid ${B.border}`,background:"#fff",display:"flex",justifyContent:"center",alignItems:"center",gap:6,fontSize:11,color:B.steel,flexShrink:0}}>
      <span>Авторы:</span>
      <a href="https://t.me/anezuf" target="_blank" rel="noreferrer" style={{color:B.blue,fontWeight:600,textDecoration:"none"}}>Трандафил Кирилл Антонович</a>
      <span>·</span>
      <span style={{color:B.graphite,fontWeight:500}}>Грачев Егор Алексеевич</span>
    </footer>
  </div>;
}
