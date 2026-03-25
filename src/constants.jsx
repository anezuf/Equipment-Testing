const IconNo=({c="#EF4444",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><line x1="4" y1="4" x2="12" y2="12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/><line x1="12" y1="4" x2="4" y2="12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>;
const IconMid=({c="#F59E0B",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke={c} strokeWidth="2.4" strokeLinecap="round"/></svg>;
const IconYes=({c="#10B981",s=14})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none"><polyline points="3,8.5 6.5,12 13,4.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;

export const B={blue:"#2F9AFF",steel:"#7B97B2",graphite:"#334155",neon:"#3045E6",amethyst:"#8B47FF",sea:"#00C2B3",raspberry:"#FF4785",pumpkin:"#FF8C42",lilac:"#D875D6",bg:"#F5F8FB",white:"#fff",border:"#E5EAF0"};
export const VC=[B.blue,B.neon,B.sea,B.amethyst,B.raspberry,B.pumpkin,B.lilac,B.steel,B.graphite,"#1ABC9C"];
export const ICO=[IconNo,IconMid,IconYes];
export const SM=[{v:0,l:"Нет",c:"#EF4444",bg:"#FEE2E2",d:"Не соответствует"},{v:1,l:"Частично",c:"#F59E0B",bg:"#FEF3C7",d:"Есть замечания"},{v:2,l:"Да",c:"#10B981",bg:"#D1FAE5",d:"Полностью ОК"}];
export const WL={0:"Преимущество",1:"Требование",2:"Требование"};
export const WC={0:{bg:"#DBEAFE",c:B.blue,bc:B.blue},1:{bg:"#FEE2E2",c:"#DC2626",bc:"#DC2626"},2:{bg:"#FEE2E2",c:"#DC2626",bc:"#DC2626"}};
