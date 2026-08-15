import http from 'node:http';
import { URL } from 'node:url';
import { MemoryStore, seed } from './store.mjs';
import { normalizeIntake, scoreVehicle, haversineKm } from './engine.mjs';
import { createAutomaticRegistration, applyAdminReview, normalizePhone } from './registration-engine.mjs';

const store = new MemoryStore(seed);
const PORT = Number(process.env.PORT || 8787);

function send(res, status, body){
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-admin-key','access-control-allow-methods':'GET,POST,OPTIONS'});
  res.end(JSON.stringify(body, null, 2));
}

async function body(req){
  let raw='';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('JSON inválido'), {status:400}); }
}

function requireAdmin(req){
  const expected=process.env.ADMIN_API_KEY;
  if (!expected) throw Object.assign(new Error('Administración no configurada'),{status:503});
  if (req.headers['x-admin-key']!==expected) throw Object.assign(new Error('No autorizado'),{status:401});
}

function originCoordinates(origin=''){
  const x=origin.toLowerCase();
  if (x.includes('rafaela')) return {lat:-31.2503,lon:-61.4867};
  if (x.includes('paraná') || x.includes('parana')) return {lat:-31.73197,lon:-60.5238};
  if (x.includes('rosario')) return {lat:-32.9442,lon:-60.6505};
  return null;
}

const server = http.createServer(async (req,res)=>{
  if (req.method==='OPTIONS') return send(res,204,{});
  const url=new URL(req.url,`http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method==='GET' && url.pathname==='/health') return send(res,200,{ok:true,service:'stylo-cargas-mvp-api',version:'0.2.0'});

    if (req.method==='POST' && url.pathname==='/users/register'){
      const input=await body(req);
      if (!input.phone) return send(res,400,{error:'phone es obligatorio'});
      const phone=normalizePhone(input.phone);
      const existing=store.getUserByPhone(phone);
      if (existing) return send(res,200,{user:existing,already_registered:true});
      const user=createAutomaticRegistration({...input,phone});
      store.addUser(user);
      store.addEvent({user_id:user.id,type:'USER_REGISTERED_AUTOMATICALLY',actor:'SYSTEM',created_at:new Date().toISOString(),payload:{review_status:user.review_status,access_status:user.access_status}});
      return send(res,201,{user,already_registered:false,access_granted:true});
    }

    if (req.method==='GET' && url.pathname==='/admin/users'){
      requireAdmin(req);
      return send(res,200,{items:store.listUsers({review_status:url.searchParams.get('review_status'),access_status:url.searchParams.get('access_status')})});
    }

    const adminUserPath=url.pathname.match(/^\/admin\/users\/([^/]+)\/review$/);
    if (req.method==='POST' && adminUserPath){
      requireAdmin(req);
      const user=store.getUser(adminUserPath[1]);
      if (!user) return send(res,404,{error:'Usuario no encontrado'});
      const input=await body(req);
      const updated=applyAdminReview(user,input);
      store.updateUser(user.id,updated);
      store.addEvent({user_id:user.id,type:'USER_ADMIN_REVIEW',actor:input.reviewed_by || 'STYLO_ADMIN',created_at:new Date().toISOString(),payload:{from:user.review_status,to:updated.review_status,note:updated.review_note}});
      return send(res,200,{user:updated});
    }

    if (req.method==='POST' && url.pathname==='/intake/messages'){
      const input=await body(req);
      if (!input.source || !input.raw_text || !input.received_at) return send(res,400,{error:'source, raw_text y received_at son obligatorios'});
      const load=normalizeIntake(input);
      store.addLoad(load);
      store.addEvent({load_id:load.id,type:'INTAKE_CLASSIFIED',actor:'AI',created_at:new Date().toISOString(),payload:{missing_fields:load.missing_fields}});
      return send(res,202,{load});
    }

    if (req.method==='GET' && url.pathname==='/loads'){
      return send(res,200,{items:store.listLoads({status:url.searchParams.get('status'),traffic_light:url.searchParams.get('traffic_light')})});
    }

    const matchPath=url.pathname.match(/^\/loads\/([^/]+)\/match$/);
    if (req.method==='POST' && matchPath){
      const load=store.getLoad(matchPath[1]);
      if (!load) return send(res,404,{error:'Carga no encontrada'});
      if (load.traffic_light==='RED') return send(res,422,{error:'Carga bloqueada por compliance'});
      const cfg=await body(req);
      const maxRadius=Number(cfg.max_radius_km || 300);
      const origin=originCoordinates(load.origin);
      const ranking=store.listVehicles().map(vehicle=>{
        const carrier=store.getCarrier(vehicle.carrier_id);
        const distance=haversineKm(origin,vehicle.location);
        return scoreVehicle(load,vehicle,carrier,distance);
      }).filter(m=>m.distance_km<=maxRadius && m.equipment_score===100 && m.documents_score>0 && m.availability_score===100).sort((a,b)=>b.total_score-a.total_score);
      store.saveMatches(load.id,ranking);
      store.updateLoad(load.id,{status:'BUSCANDO'});
      store.addEvent({load_id:load.id,type:'MATCHING_COMPLETED',actor:'SYSTEM',created_at:new Date().toISOString(),payload:{candidates:ranking.length}});
      return send(res,200,{load_id:load.id,ranking});
    }

    const assignPath=url.pathname.match(/^\/loads\/([^/]+)\/assign$/);
    if (req.method==='POST' && assignPath){
      const load=store.getLoad(assignPath[1]);
      if (!load) return send(res,404,{error:'Carga no encontrada'});
      const input=await body(req);
      const vehicle=store.getVehicle(input.vehicle_id);
      if (!vehicle || vehicle.availability!=='AVAILABLE') return send(res,409,{error:'Unidad no disponible'});
      if (vehicle.document_state==='RED' || load.traffic_light==='RED') return send(res,422,{error:'Falló una regla crítica de compliance'});
      const carrier=store.getCarrier(vehicle.carrier_id);
      const updated=store.updateLoad(load.id,{status:'ADJUDICADA',assigned_vehicle_id:vehicle.id,assigned_carrier_id:carrier.id});
      const updatedVehicle=store.updateVehicle(vehicle.id,{availability:'BUSY'});
      store.addEvent({load_id:load.id,type:'LOAD_ASSIGNED',actor:input.mode==='MANUAL'?'STYLO':'SYSTEM',created_at:new Date().toISOString(),payload:{vehicle_id:vehicle.id,carrier_id:carrier.id,mode:input.mode || 'ASSISTED'}});
      return send(res,200,{load:updated,vehicle:updatedVehicle,carrier});
    }

    const eventPath=url.pathname.match(/^\/loads\/([^/]+)\/events$/);
    if (req.method==='POST' && eventPath){
      if (!store.getLoad(eventPath[1])) return send(res,404,{error:'Carga no encontrada'});
      const input=await body(req);
      const event={load_id:eventPath[1],...input};
      store.addEvent(event);
      return send(res,201,{event});
    }

    const locPath=url.pathname.match(/^\/vehicles\/([^/]+)\/location$/);
    if (req.method==='POST' && locPath){
      const vehicle=store.getVehicle(locPath[1]);
      if (!vehicle) return send(res,404,{error:'Unidad no encontrada'});
      const input=await body(req);
      const updated=store.updateVehicle(vehicle.id,{location:{lat:Number(input.lat),lon:Number(input.lon)},location_source:input.source,location_updated_at:input.captured_at});
      return send(res,202,{vehicle:updated});
    }

    if (req.method==='GET' && url.pathname==='/exceptions') return send(res,200,{items:store.listExceptions()});

    return send(res,404,{error:'Ruta no encontrada'});
  } catch (err){
    return send(res,err.status || 500,{error:err.message || 'Error interno'});
  }
});

server.listen(PORT,()=>console.log(`Stylo Cargas MVP API en http://localhost:${PORT}`));
