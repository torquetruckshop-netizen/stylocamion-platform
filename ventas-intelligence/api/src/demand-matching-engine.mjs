export function scoreListingForRequest(request={},listing={}){
 let score=0;const reasons=[];
 if(request.category&&eq(request.category,listing.category)){score+=15;reasons.push('CATEGORY');}
 if(request.brand&&eq(request.brand,listing.brand)){score+=20;reasons.push('BRAND');}
 if(request.model&&contains(listing.model,request.model)){score+=15;reasons.push('MODEL');}
 if(inRange(listing.year,request.year_min,request.year_max)){score+=10;reasons.push('YEAR');}
 if(inRange(listing.price_amount,request.price_min,request.price_max)){score+=15;reasons.push('PRICE');}
 if(request.country&&eq(request.country,listing.country)){score+=10;reasons.push('COUNTRY');}
 if(request.configuration&&eq(request.configuration,listing.configuration)){score+=10;reasons.push('CONFIGURATION');}
 if(request.power_hp_min&&Number(listing.power_hp)>=Number(request.power_hp_min)){score+=5;reasons.push('POWER');}
 return{listing_id:listing.id,request_id:request.id||null,match_score:Math.min(100,score),reasons};
}
export function findListingsForRequest(request,listings=[],limit=20){return listings.map(l=>({...l,...scoreListingForRequest(request,l)})).filter(x=>x.match_score>=40).sort((a,b)=>b.match_score-a.match_score).slice(0,limit);}
export function buildBuyerRequestAlert({request,listing}={}){const s=scoreListingForRequest(request,listing);if(s.match_score<60)return null;return{type:'WANT_TO_BUY_MATCH',request_id:request.id,listing_id:listing.id,user_id:request.user_id,match_score:s.match_score,dedupe_key:`WTB:${request.id}:${listing.id}`,priority:s.match_score>=80?'HIGH':'NORMAL'};}
function eq(a,b){return String(a||'').toLowerCase()===String(b||'').toLowerCase();}function contains(a,b){return String(a||'').toLowerCase().includes(String(b||'').toLowerCase());}function inRange(v,min,max){const n=Number(v);if(!Number.isFinite(n))return false;if(min!=null&&n<Number(min))return false;if(max!=null&&n>Number(max))return false;return true;}
