import http from 'node:http';
import { URL } from 'node:url';
import { SupabaseStore } from './supabase-store.mjs';
import { normalizeIntake, scoreVehicle, haversineKm } from './engine.mjs';
import { createAutomaticRegistration, applyAdminReview, normalizePhone } from './registration-engine.mjs';
import { verifyGoogleCredential } from './google-identity.mjs';
import { createPersistentSession, hashSessionToken, isSessionUsable, touchPersistentSession, revokeSession } from './session-engine.mjs';
import { notificationDecision } from './notification-engine.mjs';

const store = new SupabaseStore();
const PORT = Number(process.env.STAGING_PORT || 8788);
const SESSION_COOKIE = 'sc_session';

function send(res, status, body, extraHeaders={}) {
  res.writeHead(status, {
    'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'content-type,authorization,x-admin-key',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    ...extraHeaders
  });
  res.end(JSON.stringify(body, null, 2));
}

async function body(req) {
  let raw='';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('JSON inválido'), { status:400 }); }
}

function requireAdmin(req) {
  const expected=process.env.ADMIN_API_KEY;
  if (!expected) throw Object.assign(new Error('Administración no configurada'),{status:503});
  if (req.headers['x-admin-key']!==expected) throw Object.assign(new Error('No autorizado'),{status:401});
}

function cookieValue(req, name) {
  const cookie=String(req.headers.cookie || '');
  for (const pair of cookie.split(';')) {
    const [key,...rest]=pair.trim().split('=');
    if (key===name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function persistentCookie(token, remember=true) {
  const maxAge=remember ? Number(process.env.SESSION_IDLE_DAYS || 365) * 86400 : 7 * 86400;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function issueSession(user, input={}) {
  const { token, session } = createPersistentSession(user.id, {
    remember: input.remember !== false,
    device_label: input.device_label,
    platform: input.platform
  });
  await store.addSession(session);
  return { token, session };
}

async function authenticate(req) {
  const auth=String(req.headers.authorization || '');
  const bearer=auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const token=bearer || cookieValue(req,SESSION_COOKIE);
  if (!token) throw Object.assign(new Error('Sesión requerida'),{status:401});
  const session=await store.getSessionByTokenHash(hashSessionToken(token));
  if (!isSessionUsable(session)) throw Object.assign(new Error('Sesión vencida o revocada'),{status:401});
  const user=await store.getUser(session.user_id);
  if (!user || user.access_status!=='ACTIVE') {
    if (session && !session.revoked_at) await store.updateSession(session.id,revokeSession(session,'ACCOUNT_NOT_ACTIVE'));
    throw Object.assign(new Error('Cuenta sin acceso'),{status:403});
  }
  const touched=touchPersistentSession(session);
  await store.updateSession(session.id,{last_seen_at:touched.last_seen_at,expires_at:touched.expires_at});
  return { user, session:touched, token };
}

function originCoordinates(origin='') {
  const x=origin.toLowerCase();
  if (x.includes('rafaela')) return {lat:-31.2503,lon:-61.4867};
  if (x.includes('paraná') || x.includes('parana')) return {lat:-31.73197,lon:-60.5238};
  if (x.includes('rosario')) return {lat:-32.9442,lon:-60.6505};
  if (x.includes('córdoba') || x.includes('cordoba')) return {lat:-31.4201,lon:-64.1888};
  if (x.includes('malabrigo')) return {lat:-29.3464,lon:-59.9696};
  return null;
}

const server=http.createServer(async (req,res)=>{
  if (req.method==='OPTIONS') return send(res,204,{});
  const url=new URL(req.url,`http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method==='GET' && url.pathname==='/health') {
      return send(res,200,{ok:true,service:'stylo-cargas-staging-api',persistence:'SUPABASE',version:'0.2.0'});
    }

    if (req.method==='POST' && url.pathname==='/users/register') {
      const input=await body(req);
      if (!input.phone) return send(res,400,{error:'phone es obligatorio'});
      const phone=normalizePhone(input.phone);
      let user=await store.getUserByPhone(phone);
      const alreadyRegistered=Boolean(user);
      if (!user) {
        user=createAutomaticRegistration({...input,phone,auth_methods:['PHONE']});
        await store.addUser(user);
        await store.addEvent({user_id:user.id,type:'USER_REGISTERED_AUTOMATICALLY',actor:'SYSTEM',created_at:new Date().toISOString(),payload:{method:'PHONE'}});
      }
      const session=await issueSession(user,input);
      return send(res,alreadyRegistered?200:201,{user,already_registered:alreadyRegistered,access_granted:true,session:session.session,session_token:input.return_token===true?session.token:undefined},{'set-cookie':persistentCookie(session.token,session.session.remember)});
    }

    if (req.method==='POST' && url.pathname==='/users/register/google') {
      const input=await body(req);
      if (!input.phone) return send(res,400,{error:'phone es obligatorio para Cargas'});
      const phone=normalizePhone(input.phone);
      const profile=await verifyGoogleCredential(input.credential);
      const byGoogle=await store.getUserByGoogleSub(profile.subject);
      const byPhone=await store.getUserByPhone(phone);
      if (byGoogle && byPhone && byGoogle.id!==byPhone.id) return send(res,409,{error:'identity_conflict'});
      let user=byGoogle || byPhone;
      const alreadyRegistered=Boolean(user);
      if (byGoogle && byGoogle.phone!==phone) return send(res,409,{error:'phone_conflict'});
      if (!user) {
        user=createAutomaticRegistration({phone,name:profile.name,email:profile.email,email_verified:profile.email_verified,avatar_url:profile.picture,company:input.company,country:input.country,role:input.role,auth_methods:['GOOGLE','PHONE']});
        await store.addUser(user);
      }
      user=await store.linkGoogleIdentity(user.id,profile);
      await store.addEvent({user_id:user.id,type:alreadyRegistered?'USER_GOOGLE_IDENTITY_LINKED':'USER_REGISTERED_WITH_GOOGLE',actor:'SYSTEM',created_at:new Date().toISOString(),payload:{email:profile.email,email_verified:profile.email_verified}});
      const session=await issueSession(user,input);
      return send(res,alreadyRegistered?200:201,{user,already_registered:alreadyRegistered,google_linked:true,access_granted:true,session:session.session,session_token:input.return_token===true?session.token:undefined},{'set-cookie':persistentCookie(session.token,session.session.remember)});
    }

    if (req.method==='GET' && url.pathname==='/me') {
      const auth=await authenticate(req);
      return send(res,200,{user:auth.user,session:{id:auth.session.id,last_seen_at:auth.session.last_seen_at,expires_at:auth.session.expires_at,device_label:auth.session.device_label}},{'set-cookie':persistentCookie(auth.token,auth.session.remember)});
    }

    if (req.method==='POST' && url.pathname==='/session/logout') {
      const auth=await authenticate(req);
      await store.updateSession(auth.session.id,revokeSession(auth.session,'USER_LOGOUT'));
      return send(res,200,{logged_out:true},{'set-cookie':clearSessionCookie()});
    }

    if (req.method==='POST' && url.pathname==='/intake/messages') {
      const auth=await authenticate(req);
      const input=await body(req);
      if (!input.source || !input.raw_text || !input.received_at) return send(res,400,{error:'source, raw_text y received_at son obligatorios'});
      const load=normalizeIntake({...input,sender_id:input.sender_id || auth.user.id});
      const saved=await store.addLoad(load);
      await store.addEvent({load_id:saved.id,type:'INTAKE_CLASSIFIED',actor:'AI',created_at:new Date().toISOString(),payload:{missing_fields:saved.missing_fields,user_id:auth.user.id}});
      return send(res,202,{load:saved});
    }

    const matchPath=url.pathname.match(/^\/loads\/([^/]+)\/match$/);
    if (req.method==='POST' && matchPath) {
      await authenticate(req);
      const load=await store.getLoad(matchPath[1]);
      if (!load) return send(res,404,{error:'Carga no encontrada'});
      if (load.traffic_light==='RED') return send(res,422,{error:'Carga bloqueada por compliance'});
      const cfg=await body(req);
      const maxRadius=Number(cfg.max_radius_km || process.env.STYLO_MAX_RADIUS_KM || 300);
      const origin=originCoordinates(load.origin);
      const candidates=await store.listAvailableVehicles();
      const ranking=candidates.map(({vehicle,carrier})=>scoreVehicle(load,vehicle,carrier,haversineKm(origin,vehicle.location)))
        .filter(m=>m.distance_km<=maxRadius && m.equipment_score===100 && m.documents_score>0 && m.availability_score===100)
        .sort((a,b)=>b.total_score-a.total_score);
      await store.saveMatches(load,ranking);
      await store.updateLoad(load.id,{status:'BUSCANDO'});
      const best=ranking[0] || null;
      const notification=best ? notificationDecision({type:'MATCH_STRONG',score:best.total_score,load_id:load.id,vehicle_id:best.vehicle_id,detail:`${load.origin} → ${load.destination} · match ${best.total_score}%`}) : notificationDecision({type:'NO_MATCH'});
      await store.addEvent({load_id:load.id,type:'MATCHING_COMPLETED',actor:'SYSTEM',created_at:new Date().toISOString(),payload:{candidates:ranking.length,best_score:best?.total_score || null,notification_channel:notification.channel}});
      return send(res,200,{load_id:load.id,ranking,notification});
    }

    if (req.method==='GET' && url.pathname==='/admin/users') {
      requireAdmin(req);
      const items=await store.listUsers({review_status:url.searchParams.get('review_status'),access_status:url.searchParams.get('access_status')});
      return send(res,200,{items});
    }

    const adminPath=url.pathname.match(/^\/admin\/users\/([^/]+)\/review$/);
    if (req.method==='POST' && adminPath) {
      requireAdmin(req);
      const user=await store.getUser(adminPath[1]);
      if (!user) return send(res,404,{error:'Usuario no encontrado'});
      const input=await body(req);
      const updated=applyAdminReview(user,input);
      const saved=await store.updateUser(user.id,updated);
      if (['SUSPENDED','DEACTIVATED'].includes(saved.access_status)) {
        for (const session of await store.listUserSessions(saved.id)) {
          if (!session.revoked_at) await store.updateSession(session.id,revokeSession(session,`ACCOUNT_${saved.access_status}`));
        }
      }
      await store.addEvent({user_id:saved.id,type:'USER_ADMIN_REVIEW',actor:input.reviewed_by || 'STYLO_ADMIN',created_at:new Date().toISOString(),payload:{from:user.review_status,to:saved.review_status}});
      return send(res,200,{user:saved});
    }

    return send(res,404,{error:'Ruta no encontrada'});
  } catch (err) {
    console.error(err);
    return send(res,err.status || 500,{error:err.message || 'Error interno'});
  }
});

server.listen(PORT,()=>console.log(`Stylo Cargas staging API en http://localhost:${PORT}`));
