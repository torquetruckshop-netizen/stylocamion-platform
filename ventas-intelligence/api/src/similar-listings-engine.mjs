import { comparableScore } from './market-price-engine.mjs';

export function recommendSimilarListings(reference={},candidates=[],limit=8){
 return candidates
  .filter(x=>x.id!==reference.id)
  .map(x=>({...x,similarity_score:similarity(reference,x)}))
  .filter(x=>x.similarity_score>=40)
  .sort((a,b)=>b.similarity_score-a.similarity_score)
  .slice(0,limit);
}
export function similarity(a,b){
 let score=comparableScore(a,b)*.7;
 if(a.category&&eq(a.category,b.category))score+=10;
 if(a.body_type&&eq(a.body_type,b.body_type))score+=5;
 if(a.transmission&&eq(a.transmission,b.transmission))score+=4;
 if(a.fuel_type&&eq(a.fuel_type,b.fuel_type))score+=3;
 const priceA=Number(a.price_amount),priceB=Number(b.price_amount);
 if(priceA>0&&priceB>0){const diff=Math.abs(priceA-priceB)/priceA;score+=Math.max(0,8-diff*20);}
 return Math.round(Math.max(0,Math.min(100,score))*10)/10;
}
function eq(a,b){return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();}
