import { classifyOperationalImpact,scoreNewsForProfile,recommendedNewsAction } from './news-intelligence-engine.mjs';

export function buildNewsAlert({article,profile,minScore=65}={}){
 const impact=classifyOperationalImpact(article);
 const enriched={...article,...impact};
 const relevance=scoreNewsForProfile(enriched,profile||{});
 if(relevance.relevance_score<minScore&&!impact.critical)return null;
 return{
  type:impact.critical?'CRITICAL_NEWS':'RELEVANT_NEWS',
  article_id:article.id,
  relevance_score:relevance.relevance_score,
  severity:impact.severity,
  impact_tags:impact.impact_tags,
  actions:recommendedNewsAction(enriched),
  dedupe_key:`NEWS:${article.id}:${profile?.id||'ANON'}:${impact.severity}`,
  priority:impact.critical?'CRITICAL':relevance.relevance_score>=80?'HIGH':'NORMAL'
 };
}

export function matchWatchlist(article={},watchlist={}){
 const impact=article.impact_tags||classifyOperationalImpact(article).impact_tags;
 const text=normalize(`${article.title||''} ${article.summary||''} ${article.body||''}`);
 if(watchlist.country&&article.country&&!eq(watchlist.country,article.country))return false;
 if(watchlist.keywords?.length&&!watchlist.keywords.some(k=>text.includes(normalize(k))))return false;
 if(watchlist.impact_tags?.length&&!watchlist.impact_tags.some(t=>impact.includes(String(t).toUpperCase())))return false;
 return true;
}

export function buildDailyBrief({articles=[],profile={},limit=10}={}){
 const ranked=articles.map(article=>{const impact=classifyOperationalImpact(article);const enriched={...article,...impact};const rel=scoreNewsForProfile(enriched,profile);return{article:enriched,relevance_score:rel.relevance_score,actions:recommendedNewsAction(enriched)};}).sort((a,b)=>severityWeight(b.article.severity)-severityWeight(a.article.severity)||b.relevance_score-a.relevance_score);
 const critical=ranked.filter(x=>x.article.critical).slice(0,5);
 const regular=ranked.filter(x=>!x.article.critical).slice(0,Math.max(0,limit-critical.length));
 return{profile_id:profile.id||null,critical,items:[...critical,...regular],generated_at:new Date().toISOString()};
}

export function detectStructuredContradictions(claims=[]){
 const groups=new Map();
 for(const c of claims){const key=`${c.topic||''}|${c.metric||''}|${c.scope||''}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 return [...groups.entries()].flatMap(([key,items])=>{
  const values=[...new Set(items.map(x=>String(x.value)))];
  if(values.length<=1)return[];
  return[{claim_key:key,status:'CONTRADICTORY',values,sources:items.map(x=>({source:x.source,value:x.value,observed_at:x.observed_at||null}))}];
 });
}
function severityWeight(s){return s==='CRITICAL'?4:s==='HIGH'?3:s==='MEDIUM'?2:1;}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function eq(a,b){return normalize(a)===normalize(b);}
