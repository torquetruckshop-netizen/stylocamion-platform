import { CONTROL_METRIC_CATALOG_VERSION, METRICS, MetricVisibility } from './metric-catalog.mjs';

function finite(value){ const n=Number(value); return Number.isFinite(n) ? n : 0; }
function inRange(date,start,end){
  const ms=new Date(date).getTime();
  if (!Number.isFinite(ms)) return false;
  if (start && ms < new Date(start).getTime()) return false;
  if (end && ms > new Date(end).getTime()) return false;
  return true;
}

function matchesWhere(fact, where={}){
  return Object.entries(where).every(([key,value]) => fact[key]===value || fact.dimensions?.[key]===value);
}

function factsForMetric(metric,facts,{start=null,end=null}={}){
  return facts.filter(fact => {
    if (start || end) {
      if (!inRange(fact.occurred_at,start,end)) return false;
    }
    if (metric.event && fact.event_type!==metric.event) return false;
    if (metric.entity && fact.entity_type!==metric.entity) return false;
    if (metric.where && !matchesWhere(fact,metric.where)) return false;
    return true;
  });
}

export function calculateMetric(metric,facts,range={}){
  if (metric.aggregation==='RATIO') {
    const numerator=facts.filter(f=>inMetricRange(f,range) && f.event_type===metric.numeratorEvent).length;
    const denominator=facts.filter(f=>inMetricRange(f,range) && f.event_type===metric.denominatorEvent).length;
    return denominator ? round((numerator/denominator)*100) : 0;
  }
  const selected=factsForMetric(metric,facts,range);
  switch(metric.aggregation){
    case 'COUNT': return selected.length;
    case 'COUNT_DISTINCT': return new Set(selected.map(x=>x.entity_id).filter(Boolean)).size;
    case 'SUM': return round(selected.reduce((sum,x)=>sum+finite(x[metric.valueField] ?? x.value),0));
    case 'GAUGE': {
      const latest=[...selected].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))[0];
      return latest ? round(finite(latest[metric.valueField] ?? latest.value)) : 0;
    }
    default: throw new Error(`Agregación no soportada: ${metric.aggregation}`);
  }
}

export function buildMetricSnapshot({facts=[],range={},visibility=null,generatedAt=new Date()}={}){
  const catalog=visibility ? METRICS.filter(x=>x.visibility===visibility) : METRICS;
  const metrics=Object.fromEntries(catalog.map(metric=>[
    metric.key,
    {
      value:calculateMetric(metric,facts,range),
      label:metric.label,
      section:metric.section,
      visibility:metric.visibility,
      unit:metric.aggregation==='RATIO'?'PERCENT':undefined
    }
  ]));
  return {
    catalog_version:CONTROL_METRIC_CATALOG_VERSION,
    generated_at:new Date(generatedAt).toISOString(),
    range:{start:range.start || null,end:range.end || null},
    metrics
  };
}

export function buildInvestorSnapshot({facts=[],range={},generatedAt=new Date()}={}){
  const snapshot=buildMetricSnapshot({facts,range,visibility:MetricVisibility.INVESTOR,generatedAt});
  return {view:'INVESTOR',...snapshot,privacy:'AGGREGATED_ONLY'};
}

export function groupMetricsBySection(snapshot={}){
  const sections={};
  for (const [key,metric] of Object.entries(snapshot.metrics || {})) (sections[metric.section] ||= {})[key]=metric;
  return sections;
}

function inMetricRange(fact,range={}){ return inRange(fact.occurred_at,range.start || null,range.end || null); }
function round(value){ return Math.round((Number(value)+Number.EPSILON)*100)/100; }
