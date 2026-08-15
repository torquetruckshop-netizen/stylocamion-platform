import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistentSession, hashSessionToken, isSessionUsable, touchPersistentSession, revokeSession } from '../src/session-engine.mjs';

test('sesion recordada queda activa por largo plazo',()=>{
  const now=new Date('2026-08-15T12:00:00Z');
  const {token,session}=createPersistentSession('USR-1',{remember:true,device_label:'iPhone'},now);
  assert.ok(token.length>30);
  assert.equal(session.token_hash,hashSessionToken(token));
  assert.equal(isSessionUsable(session,now),true);
  assert.equal(session.remember,true);
});

test('actividad renueva silenciosamente la expiracion',()=>{
  const now=new Date('2026-08-15T12:00:00Z');
  const {session}=createPersistentSession('USR-1',{remember:true},now);
  const later=new Date('2026-10-15T12:00:00Z');
  const touched=touchPersistentSession(session,later);
  assert.equal(touched.last_seen_at,later.toISOString());
  assert.ok(new Date(touched.expires_at)>new Date(session.expires_at));
});

test('logout revoca la sesion',()=>{
  const {session}=createPersistentSession('USR-1',{remember:true});
  const revoked=revokeSession(session,'USER_LOGOUT');
  assert.equal(isSessionUsable(revoked),false);
  assert.equal(revoked.revoke_reason,'USER_LOGOUT');
});
