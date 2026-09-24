export function evaluateInstantBook({load,vehicle,match,intelligence={},rules={}}={}){
 const reasons=[];
 const minMatch=Number(rules.minimum_match_score??90);
 const minTrust=Number(rules.minimum_trust_score??80);
 const minAcceptance=Number(rules.minimum_acceptance_probability??65);
 if(load?.traffic_light!=='GREEN')reasons.push('LOAD_NOT_GREEN');
 if(vehicle?.document_state!=='GREEN')reasons.push('VEHICLE_DOCUMENTS');
 if(vehicle?.availability!=='AVAILABLE')reasons.push('VEHICLE_NOT_AVAILABLE');
 if(Number(match?.total_score||0)<minMatch)reasons.push('MATCH_TOO_LOW');
 if(intelligence.auto_transact_allowed===false)reasons.push('TRUST_GATE');
 if(intelligence.trust_score!=null&&Number(intelligence.trust_score)<minTrust)reasons.push('TRUST_TOO_LOW');
 if(intelligence.acceptance_probability!=null&&Number(intelligence.acceptance_probability)<minAcceptance)reasons.push('ACCEPTANCE_TOO_LOW');
 if(intelligence.facility_risk==='RED')reasons.push('FACILITY_RED');
 if(match?.distance_quality&&['LOW','UNUSABLE'].includes(match.distance_quality))reasons.push('DISTANCE_UNRELIABLE');
 if(load?.price_amount==null&&rules.require_price!==false)reasons.push('PRICE_MISSING');
 return{allowed:reasons.length===0,reasons,mode:reasons.length===0?'INSTANT_BOOK':'ASSISTED_OFFER',policy_version:'instant-book-v1'};
}

export function buildInstantBookProposal({load,vehicle,expiresMinutes=10,now=new Date()}={}){
 if(!load?.id||!vehicle?.id)throw new Error('load y vehicle obligatorios');
 return{proposal_id:`IB:${load.id}:${vehicle.id}:${new Date(now).getTime()}`,load_id:load.id,vehicle_id:vehicle.id,price_amount:load.price_amount??null,currency:load.price_currency||'ARS',created_at:new Date(now).toISOString(),expires_at:new Date(new Date(now).getTime()+Number(expiresMinutes)*60000).toISOString(),status:'PENDING_CONFIRMATION'};
}
