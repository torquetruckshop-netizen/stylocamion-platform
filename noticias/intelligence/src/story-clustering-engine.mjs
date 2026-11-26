export function clusterStories(articles=[]){
 const clusters=[];
 for(const article of articles){
  const tokens=keywords(article);
  let best=null,bestScore=0;
  for(const cluster of clusters){const score=jaccard(tokens,cluster.tokens);if(score>bestScore){bestScore=score;best=cluster;}}
  if(best&&bestScore>=.45){best.items.push(article);best.tokens=union(best.tokens,tokens);best.updated_at=maxDate(best.updated_at,article.published_at);best.sources=[...new Set([...best.sources,sourceName(article)])];}
  else clusters.push({cluster_id:`STORY-${clusters.length+1}`,tokens,items:[article],sources:[sourceName(article)],updated_at:article.published_at||null});
 }
 return clusters.map(c=>({cluster_id:c.cluster_id,item_count:c.items.length,sources:c.sources,updated_at:c.updated_at,lead_article:selectLead(c.items),article_ids:c.items.map(x=>x.id),topic:dominantTopic(c.items)}));
}

export function assessFreshness(article={},now=new Date()){
 const published=new Date(article.published_at||article.updated_at||0).getTime();if(!Number.isFinite(published))return{status:'UNKNOWN',age_hours:null};
 const age=Math.max(0,(new Date(now).getTime()-published)/3600000);const ttl=ttlHours(article);
 return{status:age<=ttl?'FRESH':age<=ttl*2?'AGING':'STALE',age_hours:round(age,1),ttl_hours:ttl,expires_at:new Date(published+ttl*3600000).toISOString()};
}

export function buildProvenance(article={}){
 return{article_id:article.id||null,source:article.source||null,source_type:article.source_type||null,source_url:article.source_url||null,original_document_url:article.original_document_url||null,published_at:article.published_at||null,fetched_at:article.fetched_at||null,last_verified_at:article.last_verified_at||null,corrections:(article.corrections||[]).map(c=>({at:c.at,reason:c.reason,fields:c.fields||[],by:c.by||'SYSTEM'}))};
}
export function applyCorrection(article={},correction={}){const allowed=['title','summary','body','severity','impact_tags','published_at'];const patch={};for(const k of allowed)if(k in correction.patch)patch[k]=correction.patch[k];return{...article,...patch,updated_at:new Date(correction.at||Date.now()).toISOString(),corrections:[...(article.corrections||[]),{at:new Date(correction.at||Date.now()).toISOString(),reason:correction.reason||'CORRECTION',fields:Object.keys(patch),by:correction.by||'SYSTEM'}]};}

function selectLead(items){return [...items].sort((a,b)=>trust(b)-trust(a)||new Date(b.published_at||0)-new Date(a.published_at||0))[0]||null;}function trust(a){return Number(a.source_trust_score||0);}function dominantTopic(items){const m=new Map();for(const a of items){const t=a.topic||'GENERAL';m.set(t,(m.get(t)||0)+1);}return[...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'GENERAL';}
function keywords(a){return new Set(normalize(`${a.title||''} ${a.summary||''}`).split(/\s+/).filter(x=>x.length>4&&!STOP.has(x)).slice(0,30));}const STOP=new Set(['para','desde','sobre','entre','hasta','como','este','esta','estos','estas','transport','camion']);
function jaccard(a,b){const i=[...a].filter(x=>b.has(x)).length,u=new Set([...a,...b]).size;return u?i/u:0;}function union(a,b){return new Set([...a,...b]);}function sourceName(a){return a.source?.name||a.source||'UNKNOWN';}function maxDate(a,b){return new Date(a||0)>new Date(b||0)?a:b;}function ttlHours(a){const tags=a.impact_tags||[];if(tags.includes('ROUTES')||tags.includes('WEATHER'))return 6;if(tags.includes('FUEL')||tags.includes('RATES'))return 24;if(tags.includes('REGULATION'))return 72;return 168;}function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ');}function round(n,d=1){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
