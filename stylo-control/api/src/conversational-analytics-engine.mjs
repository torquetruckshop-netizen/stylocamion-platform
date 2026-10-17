import { buildMetricSnapshot } from './aggregation-engine.mjs';

const ALIASES=[
  {keys:['carga','cargas','oportunidad'],metric:'loads_detected'},
  {keys:['match','matching','coincidencia'],metric:'loads_matched'},
  {keys:['km vacio','km vacío','kilometros vacios','kilómetros vacíos'],metric:'empty_km_avoided'},
  {keys:['venta','ventas','operaciones de venta'],metric:'sales_deals_closed'},
  {keys:['consulta','consultas'],metric:'sales_inquiries'},
  {keys:['ingreso','ingresos','facturacion','facturación'],metric:'gross_revenue'},
  {keys:['pago','pagos'],metric:'payments_confirmed'},
  {keys:['visita','visitas','sesiones'],metric:'web_sessions'},
  {keys:['noticia','noticias'],metric:'news_views'},
  {keys:['usuario','usuarios'],metric:'users_total'},
  {keys:['ia','decisiones ia','decisiones automáticas'],metric:'ai_decisions'}
];

export function interpretControlQuestion(question=''){
  const text=normalize(question);
  const alias=ALIASES.find(a=>a.keys.some(k=>text.includes(normalize(k))));
  const period=text.includes('hoy')?'DAY':text.includes('semana')?'WEEK':text.includes('mes')?'MONTH':'ALL';
  return {metric_key:alias?.metric||null,period,intent:text.includes('compar')||text.includes('sub')||text.includes('baj')?'COMPARE':'VALUE'};
}

export function answerControlQuestion({question,facts=[],now=new Date()}={}){
  const parsed=interpretControlQuestion(question);
  if(!parsed.metric_key) return {status:'NEEDS_CLARIFICATION',message:'No pude identificar una métrica de Stylo Control en la consulta.',parsed};
  const range=rangeFor(parsed.period,now);
  const snapshot=buildMetricSnapshot({facts,range,generatedAt:now});
  const metric=snapshot.metrics[parsed.metric_key];
  if(!metric) return {status:'METRIC_NOT_AVAILABLE',metric_key:parsed.metric_key};
  return {status:'ANSWERED',metric_key:parsed.metric_key,label:metric.label,value:metric.value,unit:metric.unit||null,period:parsed.period,range:snapshot.range,generated_at:snapshot.generated_at};
}

function rangeFor(period,now){
  if(period==='ALL') return {};
  const end=new Date(now),start=new Date(now);
  if(period==='DAY') start.setHours(0,0,0,0);
  if(period==='WEEK'){const d=start.getDay()||7;start.setDate(start.getDate()-d+1);start.setHours(0,0,0,0);}
  if(period==='MONTH'){start.setDate(1);start.setHours(0,0,0,0);}
  return {start:start.toISOString(),end:end.toISOString()};
}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
