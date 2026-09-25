export function buildUnitEconomics({facts=[],range={},groupBy='module'}={}){
  const selected=facts.filter(f=>inRange(f.occurred_at,range.start,range.end));
  const groups=new Map();
  for(const f of selected){
    const key=groupKey(f,groupBy)||'UNKNOWN';
    if(!groups.has(key))groups.set(key,{key,revenue:0,direct_cost:0,payments:0,customers:new Set(),operations:0});
    const g=groups.get(key);
    if(f.event_type==='REVENUE_RECORDED')g.revenue+=Number(f.value||0);
    if(f.event_type==='COST_RECORDED')g.direct_cost+=Number(f.value||0);
    if(f.event_type==='PAYMENT_CONFIRMED')g.payments++;
    if(['LOAD_COMPLETED','SALES_DEAL_CLOSED','SALES_SERVICE_PURCHASED'].includes(f.event_type))g.operations++;
    const customer=f.dimensions?.customer_id||f.dimensions?.organization_id||null;if(customer)g.customers.add(customer);
  }
  return [...groups.values()].map(g=>{
    const contribution=g.revenue-g.direct_cost;
    return {key:g.key,revenue:round(g.revenue),direct_cost:round(g.direct_cost),contribution:round(contribution),contribution_margin_percent:g.revenue?round(contribution/g.revenue*100,2):0,payments:g.payments,operations:g.operations,customers:g.customers.size,revenue_per_customer:g.customers.size?round(g.revenue/g.customers.size):null,revenue_per_operation:g.operations?round(g.revenue/g.operations):null};
  }).sort((a,b)=>b.contribution-a.contribution);
}
function groupKey(f,by){const d=f.dimensions||{};if(by==='product')return d.product||d.service||null;if(by==='customer')return d.customer_id||d.organization_id||null;if(by==='country')return f.country||d.country||null;return d.module_name||d.target_module||f.module||null;}
function inRange(date,start,end){const ms=new Date(date).getTime();if(!Number.isFinite(ms))return false;if(start&&ms<new Date(start).getTime())return false;if(end&&ms>new Date(end).getTime())return false;return true;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
