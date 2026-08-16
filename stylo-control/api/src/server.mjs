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
  if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'stylo-control',version:'0.3.0'});
  if(req.method==='GET'&&url.pathname==='/admin/overview'){const identity=requireControlIdentity(req.headers);return send(res,200,service.adminOverview({role:identity.role,range:rangeFromUrl(url)}));}
  if(req.method==='GET'&&url.pathname==='/admin/trends'){const identity=requireControlIdentity(req.headers);return send(res,200,service.trends({role:identity.role,...trendArgs(url)}));}
  if(req.method==='GET'&&url.pathname==='/admin/funnel'){const identity=requireControlIdentity(req.headers);return send(res,200,service.funnel({role:identity.role,range:rangeFromUrl(url),groupBy:url.searchParams.get('group_by')||'source'}));}
  if(req.method==='GET'&&url.pathname==='/investor/snapshot'){const identity=requireControlIdentity(req.headers);return send(res,200,service.investorSnapshot({role:identity.role,range:rangeFromUrl(url)}));}
  if(req.method==='GET'&&url.pathname==='/investor/trends'){const identity=requireControlIdentity(req.headers);return send(res,200,service.trends({role:identity.role,...trendArgs(url),investor:true}));}
  if(req.method==='POST'&&url.pathname==='/internal/facts'){const identity=requireControlIdentity(req.headers);const fact=await readJson(req);return send(res,201,{fact:service.recordFact({role:identity.role,fact})});}
  if(req.method==='POST'&&url.pathname==='/internal/modules/health'){const identity=requireControlIdentity(req.headers);const health=await readJson(req);return send(res,200,{health:service.updateModuleHealth({role:identity.role,health})});}
  return send(res,404,{error:'Ruta no encontrada'});
 }catch(error){return send(res,error.status||500,{error:error.message||'Error interno',code:error.code||null});}
});
server.listen(PORT,()=>console.log(`STYLO CONTROL API en http://localhost:${PORT}`));
