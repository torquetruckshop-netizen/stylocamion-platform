export function buildAttributionReport({facts=[],range={},groupBy='source'}={}){
 const selected=facts.filter(f=>inRange(f.occurred_at,range.start,range.end));
 const groups=new Map();
 for(const fact of selected){
  const key=dimensionFor(fact,groupBy)||'UNKNOWN';
  if(!groups.has(key))groups.set(key,{key,visits:0,inquiries:0,purchases:0,payments:0,revenue:0});
  const g=groups.get(key);
  if(fact.event_type==='WEB_SESSION')g.visits++;
  if(fact.event_type==='SALES_INQUIRY')g.inquiries++;
  if(fact.event_type==='SALES_SERVICE_PURCHASED')g.purchases++;
  if(fact.event_type==='PAYMENT_CONFIRMED')g.payments++;
  if(fact.event_type==='REVENUE_RECORDED')g.revenue+=Number(fact.value||0);
 }
 const totalRevenue=[...groups.values()].reduce((s,g)=>s+g.revenue,0);
 return [...groups.values()].map(g=>({
  ...g,
  revenue_share_percent:totalRevenue?pct(g.revenue,totalRevenue):0,
  revenue_per_visit:g.visits?round(g.revenue/g.visits):0,
  payment_conversion_percent:g.visits?pct(g.payments,g.visits):0,
  inquiry_conversion_percent:g.visits?pct(g.inquiries,g.visits):0
 })).sort((a,b)=>b.revenue-a.revenue||b.payments-a.payments||b.visits-a.visits);
}

function dimensionFor(fact,groupBy){const d=fact.dimensions||{};if(groupBy==='module')return d.module_name||d.target_module||fact.module||null;if(groupBy==='campaign')return d.campaign||null;if(groupBy==='channel')return fact.channel||d.channel||d.medium||null;if(groupBy==='country')return fact.country||d.country||null;return d.source||d.referrer||d.article_topic||fact.module||null;}
function inRange(date,start,end){const ms=new Date(date).getTime();if(!Number.isFinite(ms))return false;if(start&&ms<new Date(start).getTime())return false;if(end&&ms>new Date(end).getTime())return false;return true;}
function pct(n,d){return d?round((n/d)*100):0;}
function round(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}
