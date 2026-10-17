const STAGE_ORDER=['VISIT','MODULE_VIEW','COMMERCIAL_ACTION','INQUIRY','PURCHASE','PAYMENT_CONFIRMED','REVENUE'];

export function buildUnifiedFunnel({facts=[],range={},groupBy='source'}={}){
 const selected=facts.filter(f=>inRange(f.occurred_at,range.start,range.end));
 const groups=new Map();
 for(const fact of selected){
  const key=dimensionFor(fact,groupBy) || 'UNKNOWN';
  if(!groups.has(key)) groups.set(key,emptyBucket(key));
  applyFact(groups.get(key),fact);
 }
 return [...groups.values()].map(finalizeBucket).sort((a,b)=>b.revenue-a.revenue || b.payments_confirmed-a.payments_confirmed);
}

export function buildGlobalFunnel({facts=[],range={}}={}){
 const bucket=emptyBucket('ALL');
 for(const fact of facts.filter(f=>inRange(f.occurred_at,range.start,range.end))) applyFact(bucket,fact);
 return finalizeBucket(bucket);
}

function applyFact(bucket,fact){
 const event=fact.event_type;
 if(event==='WEB_SESSION') bucket.visits++;
 if(event==='MODULE_VIEW'||event==='ARTICLE_READ') bucket.module_views++;
 if(event==='COMMERCIAL_ACTION'||event==='NEWS_COMMERCIAL_ACTION') bucket.commercial_actions++;
 if(event==='SALES_INQUIRY') bucket.inquiries++;
 if(event==='SALES_SERVICE_PURCHASED') bucket.purchases++;
 if(event==='PAYMENT_CONFIRMED') bucket.payments_confirmed++;
 if(event==='REVENUE_RECORDED') bucket.revenue+=Number(fact.value||0);
}
function emptyBucket(key){return{key,visits:0,module_views:0,commercial_actions:0,inquiries:0,purchases:0,payments_confirmed:0,revenue:0};}
function finalizeBucket(b){return{...b,visit_to_action_rate:pct(b.commercial_actions,b.visits),visit_to_inquiry_rate:pct(b.inquiries,b.visits),inquiry_to_purchase_rate:pct(b.purchases,b.inquiries),purchase_to_payment_rate:pct(b.payments_confirmed,b.purchases),visit_to_payment_rate:pct(b.payments_confirmed,b.visits),revenue_per_visit:b.visits?round(b.revenue/b.visits):0};}
function dimensionFor(fact,groupBy){
 const d=fact.dimensions||{};
 if(groupBy==='module') return d.module_name||d.target_module||fact.module||null;
 if(groupBy==='campaign') return d.campaign||null;
 if(groupBy==='country') return fact.country||d.country||null;
 if(groupBy==='channel') return fact.channel||d.channel||d.medium||null;
 return d.source||d.referrer||d.article_topic||fact.module||null;
}
function inRange(date,start,end){const ms=new Date(date).getTime();if(!Number.isFinite(ms))return false;if(start&&ms<new Date(start).getTime())return false;if(end&&ms>new Date(end).getTime())return false;return true;}
function pct(n,d){return d?round((n/d)*100):0;}
function round(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}
export const FUNNEL_STAGES=STAGE_ORDER;
