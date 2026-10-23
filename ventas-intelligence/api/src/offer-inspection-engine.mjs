export function buildConditionalVehicleOffer({listing,buyerId,amount,conditions=[],expiresMinutes=60,now=new Date()}={}){
 if(!listing?.id||!buyerId||!(Number(amount)>0))throw new Error('listing buyerId amount obligatorios');
 return{offer_id:`OFFER:${listing.id}:${buyerId}:${new Date(now).getTime()}`,listing_id:listing.id,buyer_id:buyerId,amount:Number(amount),currency:listing.currency||'ARS',conditions:[...conditions],status:'OPEN',created_at:new Date(now).toISOString(),expires_at:new Date(new Date(now).getTime()+Number(expiresMinutes)*60000).toISOString()};
}
export function evaluateVehicleOffer({listing,offer,minPercentOfAsk=80}={}){const ask=Number(listing?.price_amount),amount=Number(offer?.amount);const reasons=[];if(!(amount>0))reasons.push('INVALID_AMOUNT');if(ask>0&&amount<ask*Number(minPercentOfAsk)/100)reasons.push('TOO_LOW');return{acceptable:reasons.length===0,reasons,offer_vs_ask_percent:ask?round(amount/ask*100,2):null};}

const CHECKS=['identity','ownership','vin_chassis','engine','odometer','documents','liens','photos','tyres','cab','powertrain'];
export function evaluateInspection(checklist={}){
 const missing=[],issues=[];for(const key of CHECKS){const value=checklist[key];if(value==null)missing.push(key);else if(value===false||String(value).toUpperCase()==='ISSUE')issues.push(key);}
 let score=100-missing.length*5-issues.length*12;score=Math.max(0,Math.min(100,score));
 return{inspection_score:score,status:issues.length?'ISSUES_FOUND':missing.length?'INCOMPLETE':'VERIFIED',missing_checks:missing,issues,ready_for_verified_badge:score>=90&&!issues.length&&!missing.length};
}
function round(n,d=2){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
