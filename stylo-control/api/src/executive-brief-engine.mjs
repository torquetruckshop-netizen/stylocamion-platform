import { buildMetricSnapshot } from './aggregation-engine.mjs';
import { detectMetricAnomalies } from './anomaly-detection-engine.mjs';
import { buildNetworkLiquidity } from './network-liquidity-engine.mjs';
import { buildAttributionReport } from './attribution-engine.mjs';

export function buildExecutiveBrief({facts=[],health=[],period='DAY',now=new Date()}={}){
  const snapshot=buildMetricSnapshot({facts,generatedAt:now});
  const anomalies=detectMetricAnomalies({facts,period,now}).anomalies;
  const liquidity=buildNetworkLiquidity({facts});
  const attribution=buildAttributionReport({facts,groupBy:'source'}).slice(0,3);
  const down=health.filter(x=>x.status==='DOWN');
  const degraded=health.filter(x=>x.status==='DEGRADED');
  const highlights=[];
  addMetric(highlights,snapshot,'loads_detected','Cargas detectadas');
  addMetric(highlights,snapshot,'loads_matched','Matches');
  addMetric(highlights,snapshot,'sales_inquiries','Consultas de Ventas');
  addMetric(highlights,snapshot,'payments_confirmed','Pagos confirmados');
  addMetric(highlights,snapshot,'gross_revenue','Ingresos confirmados');
  const actions=[];
  for(const a of anomalies.slice(0,5)) actions.push({priority:a.severity,title:`${a.label}: ${a.direction==='DROP'?'caída':'suba'} ${Math.abs(a.change_percent)}%`,action:a.action});
  for(const m of down) actions.push({priority:'CRITICAL',title:`${m.module} está caído`,action:'RESOLVE_MODULE_NOW'});
  for(const m of degraded) actions.push({priority:'WARNING',title:`${m.module} está degradado`,action:'REVIEW_MODULE'});
  if(liquidity.liquidity_status==='LOW_LIQUIDITY') actions.push({priority:'WARNING',title:'Liquidez baja en Cargas',action:'INCREASE_SUPPLY_OR_REVIEW_MATCHING'});
  return {
    generated_at:new Date(now).toISOString(),period:String(period).toUpperCase(),
    status:actions.some(x=>x.priority==='CRITICAL')?'CRITICAL':actions.length?'ATTENTION':'NORMAL',
    highlights,network_liquidity:liquidity,top_revenue_sources:attribution,
    priority_actions:actions.slice(0,8)
  };
}
function addMetric(out,snapshot,key,label){const m=snapshot.metrics[key];if(m)out.push({key,label,value:m.value,unit:m.unit||null});}
