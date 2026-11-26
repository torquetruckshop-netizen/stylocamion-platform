import { classifyOperationalImpact, recommendedNewsAction, sourceTrustProfile } from './news-intelligence-engine.mjs';
import { assessFreshness } from './story-clustering-engine.mjs';

export function buildDecisionCard({article,source={},affectedOperations=null,now=new Date()}={}){
 const impact=classifyOperationalImpact(article);
 const trust=sourceTrustProfile(source);
 const freshness=assessFreshness({...article,impact_tags:impact.impact_tags},now);
 const card={
  article_id:article.id||null,
  title:article.title||'',
  what_changed:article.summary||article.title||'',
  severity:impact.severity,
  impact_tags:impact.impact_tags,
  who_is_affected:affectedOperations?{loads:affectedOperations.affected_loads?.length||0,vehicles:affectedOperations.affected_vehicles?.length||0}:null,
  recommended_actions:recommendedNewsAction({...article,...impact}),
  source_trust:{score:trust.trust_score,level:trust.trust_level,type:trust.source_type},
  freshness,
  confidence:decisionConfidence(trust,freshness,impact),
  source_url:article.source_url||null,
  generated_at:new Date(now).toISOString()
 };
 card.publishable=card.source_trust.score>=60&&freshness.status!=='STALE';
 return card;
}
function decisionConfidence(trust,freshness,impact){let score=trust.trust_score;if(freshness.status==='AGING')score-=15;if(freshness.status==='STALE')score-=35;if(!impact.operationally_relevant)score-=10;return score>=85?'HIGH':score>=65?'MEDIUM':'LOW';}
