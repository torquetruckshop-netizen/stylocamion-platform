export function buildMarketPriceProfile(comparables=[]){
  const values=comparables.map(x=>Number(x.price_amount)).filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
  if(values.length<3)return{status:'INSUFFICIENT_DATA',sample_count:values.length,confidence:'LOW'};
  const median=percentile(values,.5),p25=percentile(values,.25),p75=percentile(values,.75);
  return{status:'READY',sample_count:values.length,p25:round(p25),median:round(median),p75:round(p75),average:round(values.reduce((s,x)=>s+x,0)/values.length),confidence:values.length>=20?'HIGH':values.length>=8?'MEDIUM':'LOW'};
}
export function evaluateListingPrice({priceAmount,profile}={}){
  const price=Number(priceAmount);if(!(price>0)||profile?.status!=='READY')return{status:'INSUFFICIENT_DATA'};
  const position=price<profile.p25?'LOW':price>profile.p75?'HIGH':'FAIR';
  return{status:'EVALUATED',market_position:position,price_amount:price,vs_median_percent:round(((price-profile.median)/profile.median)*100,2),recommended_range:{min:profile.p25,max:profile.p75},confidence:profile.confidence};
}
export function comparableScore(reference={},candidate={}){
 let score=0;
 if(eq(reference.brand,candidate.brand))score+=25;
 if(eq(reference.model,candidate.model))score+=25;
 if(reference.year&&candidate.year)score+=Math.max(0,20-Math.abs(Number(reference.year)-Number(candidate.year))*5);
 if(reference.km!=null&&candidate.km!=null){const d=Math.abs(Number(reference.km)-Number(candidate.km));score+=Math.max(0,15-d/50000*5);}
 if(eq(reference.configuration,candidate.configuration))score+=10;
 if(eq(reference.country,candidate.country))score+=5;
 return round(Math.min(100,score),1);
}
export function selectComparables(reference,candidates=[],limit=20){return candidates.map(x=>({...x,comparable_score:comparableScore(reference,x)})).filter(x=>x.comparable_score>=45).sort((a,b)=>b.comparable_score-a.comparable_score).slice(0,limit);}
function eq(a,b){return a&&b&&String(a).trim().toLowerCase()===String(b).trim().toLowerCase();}
function percentile(sorted,p){const i=(sorted.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?sorted[l]:sorted[l]+(sorted[h]-sorted[l])*(i-l);}
function round(n,d=0){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
