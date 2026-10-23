import { worldClassDecisionScore } from './candidate-intelligence-service.mjs';

export async function rankEligibleCandidatesWorldClass({load,candidates=[],candidateIntelligenceResolver=null}={}){
 const ranked=[];
 for(const candidate of candidates){
  const baseScore=Number(candidate.match?.total_score??candidate.total_score??0);
  let intelligence=null,error=null;
  if(candidateIntelligenceResolver){try{intelligence=await candidateIntelligenceResolver({load,vehicle:candidate.vehicle,carrier:candidate.carrier,match:candidate.match});}catch(e){error=e?.message||'candidate_intelligence_failed';}}
  const trustBlocked=intelligence?.auto_transact_allowed===false;
  ranked.push({...candidate,intelligence,intelligence_error:error,world_class_score:intelligence?worldClassDecisionScore(baseScore,intelligence):baseScore,world_class_eligible:!trustBlocked,world_class_reasons:trustBlocked?['COUNTERPARTY_TRUST_BLOCK']:[]});
 }
 return ranked.sort((a,b)=>Number(b.world_class_eligible)-Number(a.world_class_eligible)||b.world_class_score-a.world_class_score||Number(b.match?.total_score||0)-Number(a.match?.total_score||0));
}

export function worldClassTrace(candidate={}){
 const i=candidate.intelligence||{};
 return{vehicle_id:candidate.vehicle?.id||null,base_score:candidate.match?.total_score??candidate.total_score??null,world_class_score:candidate.world_class_score??null,preference_score:i.preference_score??null,acceptance_probability:i.acceptance_probability??null,facility_risk:i.facility_risk??null,rate_position:i.rate_position??null,trust_score:i.trust_score??null,auto_transact_allowed:i.auto_transact_allowed??null,reasons:candidate.world_class_reasons||[]};
}
