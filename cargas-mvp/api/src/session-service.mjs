import { createPersistentSession, hashSessionToken, isSessionUsable, touchPersistentSession, revokeSession } from './session-engine.mjs';

export function issueUserSession(store,user,input={}) {
  if (!user || user.access_status!=='ACTIVE') throw Object.assign(new Error('Usuario sin acceso'),{status:403});
  const issued=createPersistentSession(user.id,{
    remember:input.remember !== false,
    device_label:input.device_label || null,
    platform:input.platform || null
  });
  store.addSession(issued.session);
  store.addEvent({
    user_id:user.id,
    session_id:issued.session.id,
    type:'USER_SESSION_CREATED',
    actor:'SYSTEM',
    created_at:new Date().toISOString(),
    payload:{remember:issued.session.remember,device_label:issued.session.device_label,platform:issued.session.platform}
  });
  return issued;
}

export function resolveUserSession(store,token,now=new Date()) {
  if (!token) throw Object.assign(new Error('Sesión requerida'),{status:401});
  const session=store.getSessionByTokenHash(hashSessionToken(token));
  if (!isSessionUsable(session,now)) throw Object.assign(new Error('Sesión inválida o vencida'),{status:401});
  const user=store.getUser(session.user_id);
  if (!user || user.access_status!=='ACTIVE') throw Object.assign(new Error('Acceso suspendido'),{status:403});
  const touched=touchPersistentSession(session,now);
  store.updateSession(session.id,touched);
  return {user,session:touched};
}

export function revokeUserSession(store,token,reason='USER_LOGOUT') {
  const session=store.getSessionByTokenHash(hashSessionToken(token));
  if (!session) return null;
  const revoked=revokeSession(session,reason);
  store.updateSession(session.id,revoked);
  store.addEvent({
    user_id:session.user_id,
    session_id:session.id,
    type:'USER_SESSION_REVOKED',
    actor:'SYSTEM',
    created_at:new Date().toISOString(),
    payload:{reason}
  });
  return revoked;
}

export function bearerToken(req) {
  const value=String(req.headers.authorization || '');
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : null;
}
