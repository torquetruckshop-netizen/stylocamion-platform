import http from 'node:http';
import { URL } from 'node:url';
import { MemoryControlStore } from './control-store.mjs';
import { createControlService } from './control-service.mjs';
import { requireControlIdentity } from './http-auth.mjs';

const PORT=Number(process.env.CONTROL_PORT || 8795);
const store=new MemoryControlStore();
const service=createControlService({store});
function send(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body,null,2));}
async function readJson(req){let raw='';for await(const chunk of req)raw+=chunk;if(!raw)return{};try{return JSON.parse(raw);}catch{const e=new Error('JSON inválido');e.status=400;throw e;}}
function rangeFromUrl(url){return{start:url.searchParams.get('start')||null,end:url.searchParams.get('end')||null};}
function trendArgs(url){return{period:url.searchParams.get('period')||'DAY',days:Number(url.searchParams.get('days')||30)};}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
 try{
  if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'stylo-control',version:'0.8.0'});
  const identityNeeded=()=>requireControlIdentity(req.headers);
  if(req.method==='GET'&&url.pathname==='/admin/overview'){const i=identityNeeded();return send(res,200,service.adminOverview({role:i.role,range:rangeFromUrl(url)}));}
  if(req.method==='GET'&&url.pathname==='/admin/trends'){const i=identityNeeded();return send(res,200,service.trends({role:i.role,...trendArgs(url)}));}
  if(req.method==='GET'&&url.pathname==='/admin/funnel'){const i=identityNeeded();return send(res,200,service.funnel({role:i.role,range:rangeFromUrl(url),groupBy:url.searchParams.get('group_by')||'source'}));}
  if(req.method==='GET'&&url.pathname==='/admin/attribution'){const i=identityNeeded();return send(res,200,service.attribution({role:i.role,range:rangeFromUrl(url),groupBy:url.searchParams.get('group_by')||'source'}));}
  if(req.method==='GET'&&url.pathname==='/admin/alerts'){const i=identityNeeded();return send(res,200,service.healthAlerts({role:i.role}));}
  if(req.method==='GET'&&url.pathname==='/admin/anomalies'){const i=identityNeeded();return send(res,200,service.anomalies({role:i.role,period:url.searchParams.get('period')||'DAY'}));}
  if(req.method==='GET'&&url.pathname==='/admin/cohorts'){const i=identityNeeded();return send(res,200,service.cohorts({role:i.role,cohort:url.searchParams.get('cohort')||'MONTH',periods:Number(url.searchParams.get('periods')||6)}));}
  if(req.method==='GET'&&url.pathname==='/admin/unit-economics'){const i=identityNeeded();return send(res,200,service.unitEconomics({role:i.role,range:rangeFromUrl(url),groupBy:url.searchParams.get('group_by')||'module'}));}
  if(req.method==='GET'&&url.pathname==='/admin/network-liquidity'){const i=identityNeeded();return send(res,200,service.networkLiquidity({role:i.role,range:rangeFromUrl(url)}));}
  if(req.method==='GET'&&url.pathname==='/admin/module-quality'){const i=identityNeeded();return send(res,200,service.moduleQuality({role:i.role}));}
  if(req.method==='GET'&&url.pathname==='/admin/executive-brief'){const i=identityNeeded();return send(res,200,service.executiveBrief({role:i.role,period:url.searchParams.get('period')||'DAY'}));}
  if(req.method==='GET'&&url.pathname==='/admin/world-class-kpis'){const i=identityNeeded();return send(res,200,service.worldClassKpis({role:i.role,range:rangeFromUrl(url)}));}
  if(req.method==='POST'&&url.pathname==='/admin/ask'){const i=identityNeeded();const input=await readJson(req);if(!input.question)return send(res,400,{error:'question es obligatorio'});return send(res,200,service.ask({role:i.role,question:input.question}));}
  if(req.method==='GET'&&url.pathname==='/investor/snapshot'){const i=identityNeeded();return send(res,200,service.investorSnapshot({role:i.role,range:rangeFromUrl(url)}));}
  if(req.method==='GET'&&url.pathname==='/investor/trends'){const i=identityNeeded();return send(res,200,service.trends({role:i.role,...trendArgs(url),investor:true}));}
  if(req.method==='GET'&&url.pathname==='/investor/export'){const i=identityNeeded();return send(res,200,service.investorExport({role:i.role,range:rangeFromUrl(url),expiresAt:url.searchParams.get('expires_at')||null}));}
  if(req.method==='POST'&&url.pathname==='/internal/facts'){const i=identityNeeded();const fact=await readJson(req);return send(res,201,{fact:service.recordFact({role:i.role,fact})});}
  if(req.method==='POST'&&url.pathname==='/internal/modules/health'){const i=identityNeeded();const health=await readJson(req);return send(res,200,{health:service.updateModuleHealth({role:i.role,health})});}
  return send(res,404,{error:'Ruta no encontrada'});
 }catch(error){return send(res,error.status||500,{error:error.message||'Error interno',code:error.code||null});}
});
server.listen(PORT,()=>console.log(`STYLO CONTROL API en http://localhost:${PORT}`));
