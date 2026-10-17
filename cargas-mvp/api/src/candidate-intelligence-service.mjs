import { scoreLoadPreference } from './carrier-preference-engine.mjs';
import { evaluateOfferedRate,estimateAcceptanceProbability } from './rate-intelligence-engine.mjs';
import { canAutoTransact } from './counterparty-trust-engine.mjs';

export function createCandidateIntelligenceResolver({
  preferenceProfileResolver=null,
  facilityProfileResolver=null,
  rateProfileResolver=null,
  trustProfileResolver=null
}={}){
 return async function resolve({load,vehicle,carrier}={}){
  const preferenceProfile=preferenceProfileResolver?await preferenceProfileResolver({carrier,vehicle,load}):null;
  const preference=preferenceProfile?scoreLoadPreference(load,preferenceProfile):{preference_score:50,confidence:'LOW'};
  const facility=facilityProfileResolver?await facilityProfileResolver({load,vehicle,carrier}):null;
  const rateProfile=rateProfileResolver?await rateProfileResolver({load,vehicle,carrier}):null;
  const rate=rateProfile?evaluateOfferedRate({amount:load.price_amount,loadedKm:load.loaded_route_km,profile:rateProfile}):{status:'INSUFFICIENT_DATA'};
  const acceptance=estimateAcceptanceProbability({rateEvaluation:rate,preferenceScore:preference.preference_score,facilityRisk:facility?.risk||'UNKNOWN'});
  const trust=trustProfileResolver?await trustProfileResolver({load,vehicle,carrier}):null;
  const trustGate=trust?canAutoTransact(trust):{allowed:true,reason:'NOT_EVALUATED'};
  return{
    preference_score:preference.preference_score,
    preference_confidence:preference.confidence,
    facility_risk:facility?.risk||'UNKNOWN',
    facility_rating:facility?.average_rating??null,
    facility_wait_minutes:facility?.median_wait_minutes??null,
    rate_position:rate.market_position||null,
    rate_vs_median_percent:rate.vs_median_percent??null,
    acceptance_probability:acceptance.probability_percent??null,
    acceptance_confidence:acceptance.confidence||'LOW',
    trust_score:trust?.trust_score??null,
    trust_tier:trust?.tier??null,
    auto_transact_allowed:trustGate.allowed,
    trust_reason:trustGate.reason
  };
 };
}

export function worldClassDecisionScore(baseScore,intelligence={}){
  const base=Number(baseScore)||0;
  if(!intelligence||Object.keys(intelligence).length===0)return base;
  const preference=numberOr(intelligence.preference_score,50);
  const acceptance=numberOr(intelligence.acceptance_probability,50);
  const trust=numberOr(intelligence.trust_score,70);
  const facilityPenalty=intelligence.facility_risk==='RED'?8:intelligence.facility_risk==='YELLOW'?3:0;
  return round(Math.max(0,Math.min(100,base*.75+preference*.10+acceptance*.10+trust*.05-facilityPenalty)),1);
}
function numberOr(v,f){const n=Number(v);return Number.isFinite(n)?n:f;}
function round(n,d=1){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
