import { buildMetricSnapshot } from './aggregation-engine.mjs';

export function periodRange(period='DAY', now=new Date()) {
  const end=new Date(now);
  const start=new Date(end);
  const p=String(period).toUpperCase();
  if (p==='DAY') start.setUTCDate(start.getUTCDate()-1);
  else if (p==='WEEK') start.setUTCDate(start.getUTCDate()-7);
  else if (p==='MONTH') start.setUTCMonth(start.getUTCMonth()-1);
  else throw new Error('period inválido');
  return {start:start.toISOString(),end:end.toISOString()};
}

export function previousRange(range={}) {
  const start=new Date(range.start).getTime();
  const end=new Date(range.end).getTime();
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new Error('range inválido');
  const span=end-start;
  return {start:new Date(start-span).toISOString(),end:new Date(start-1).toISOString()};
}

export function buildMetricComparison({facts=[],period='DAY',now=new Date(),visibility=null}={}) {
  const currentRange=periodRange(period,now);
  const priorRange=previousRange(currentRange);
  const current=buildMetricSnapshot({facts,range:currentRange,visibility,generatedAt:now});
  const previous=buildMetricSnapshot({facts,range:priorRange,visibility,generatedAt:now});
  const metrics={};
  for (const [key,item] of Object.entries(current.metrics)) {
    const currentValue=Number(item.value||0);
    const previousValue=Number(previous.metrics[key]?.value||0);
    metrics[key]={...item,current_value:currentValue,previous_value:previousValue,change:round(currentValue-previousValue),change_percent:percentChange(currentValue,previousValue)};
  }
  return {period:String(period).toUpperCase(),current_range:currentRange,previous_range:priorRange,metrics,generated_at:new Date(now).toISOString()};
}

export function buildDailySeries({facts=[],days=30,now=new Date(),visibility=null}={}) {
  const safeDays=Math.max(1,Math.min(366,Number(days)||30));
  const rows=[];
  const end=new Date(now); end.setUTCHours(23,59,59,999);
  for (let offset=safeDays-1;offset>=0;offset--) {
    const dayEnd=new Date(end); dayEnd.setUTCDate(dayEnd.getUTCDate()-offset);
    const dayStart=new Date(dayEnd); dayStart.setUTCHours(0,0,0,0);
    const snapshot=buildMetricSnapshot({facts,range:{start:dayStart.toISOString(),end:dayEnd.toISOString()},visibility,generatedAt:now});
    rows.push({date:dayStart.toISOString().slice(0,10),metrics:Object.fromEntries(Object.entries(snapshot.metrics).map(([k,v])=>[k,v.value]))});
  }
  return rows;
}

function percentChange(current,previous){ if(previous===0)return current===0?0:null; return round(((current-previous)/Math.abs(previous))*100); }
function round(value){ return Math.round((Number(value)+Number.EPSILON)*100)/100; }
