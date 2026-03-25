import { B } from "../constants";

const fmt=(v)=>{if(v==null)return "—";return v%1===0?v.toFixed(0):v.toFixed(1);};

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

export default Gauge;
