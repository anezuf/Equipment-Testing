export const coeff=[0,0.5,1]; // score 0,1,2 → coefficient
export function calcTotal(sc,all){
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
export function calcSec(sc,si,secs,offs){
  const off=offs[si];let earned=0,maxPts=0;
  secs[si].items.forEach((it,ii)=>{const v=sc[off+ii];
    if(it.w<1)return;
    maxPts+=it.w; // always count towards max
    if(v==null)return;
    earned+=it.w*coeff[v];
  });
  return maxPts===0?0:earned/maxPts*10;
}
export function hasFail(sc,all){return all.some((it,i)=>it.w>=1&&sc[i]===0);}
