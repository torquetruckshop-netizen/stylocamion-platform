import { buildMetricComparison } from './trend-engine.mjs';

const DEFAULT_RULES=Object.freeze({
  loads_detected:{drop:-35,rise:80,severity:'WARNING'},
  loads_matched:{drop:-35,rise:100,severity:'WARNING'},
  sales_inquiries:{drop:-40,rise:120,severity:'WARNING'},
  payments_confirmed:{drop:-35,rise:120,severity:'CRITICAL'},
  gross_revenue:{drop:-40,rise:150,severity:'CRITICAL'},
  web_sessions:{drop:-45,rise:150,severity:'WARNING'},
  ai_exceptions:{rise:100,severity:'WARNING'}
});

export function detectMetricAnomalies({facts=[],period='DAY',now=new Date(),rules=DEFAULT_RULES}={}){
  const comparison=buildMetricComparison({facts,period,now});
  const anomalies=[];
  for(const [key,rule] of Object.entries(rules)){
    const metric=comparison.metrics[key];
    if(!metric) continue;
    const change=metric.change_percent;
    if(change==null) continue;
    if(rule.drop!=null&&change<=rule.drop){
      anomalies.push(buildAnomaly(key,metric,'DROP',rule.severity||'WARNING'));
    } else if(rule.rise!=null&&change>=rule.rise){
      anomalies.push(buildAnomaly(key,metric,'SPIKE',rule.severity||'WARNING'));
    }
  }
  anomalies.sort((a,b)=>severityWeight(b.severity)-severityWeight(a.severity)||Math.abs(b.change_percent)-Math.abs(a.change_percent));
  return {
    status:anomalies.length?'ANOMALIES_DETECTED':'NORMAL',
    period:String(period).toUpperCase(),
    generated_at:new Date(now).toISOString(),
    anomalies,
    comparison_ranges:{current:comparison.current_range,previous:comparison.previous_range}
  };
}

export function anomalyAction(anomaly={}){
  if(anomaly.severity==='CRITICAL') return 'INVESTIGATE_NOW';
  if(anomaly.severity==='WARNING') return 'REVIEW_TODAY';
  return 'MONITOR';
}

function buildAnomaly(key,metric,direction,severity){
  return {
    metric_key:key,
    label:metric.label,
    direction,
    severity,
    current_value:metric.current_value,
    previous_value:metric.previous_value,
    change_percent:metric.change_percent,
    action:anomalyAction({severity})
  };
}
function severityWeight(s){return s==='CRITICAL'?3:s==='WARNING'?2:1;}
export { DEFAULT_RULES as DEFAULT_ANOMALY_RULES };
