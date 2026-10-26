import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomaticRegistration, applyAdminReview, canAccessCargas, normalizePhone } from '../src/registration-engine.mjs';
import { MemoryStore } from '../src/store.mjs';

test('alta automatica queda activa y pendiente de revision',()=>{
  const user=createAutomaticRegistration({phone:'343 555 1234',name:'Usuario Piloto'},new Date('2026-08-15T10:00:00Z'));
  assert.equal(user.phone,'+3435551234');
  assert.equal(user.access_status,'ACTIVE');
  assert.equal(user.review_status,'PENDING_REVIEW');
  assert.equal(canAccessCargas(user),true);
});

test('normaliza telefono y permite detectar duplicado por numero',()=>{
  const store=new MemoryStore({users:[]});
  const user=createAutomaticRegistration({phone:'+54 9 343 555 1234'});
  store.addUser(user);
  assert.equal(store.getUserByPhone(normalizePhone('+54 9 343 555 1234')).id,user.id);
});

test('aprobacion manual no interrumpe acceso',()=>{
  const user=createAutomaticRegistration({phone:'3435551234'});
  const approved=applyAdminReview(user,{review_status:'APPROVED',reviewed_by:'STYLO_ADMIN'});
  assert.equal(approved.access_status,'ACTIVE');
  assert.equal(approved.review_status,'APPROVED');
  assert.equal(canAccessCargas(approved),true);
});

test('Stylo puede suspender posteriormente al usuario',()=>{
  const user=createAutomaticRegistration({phone:'3435551234'});
  const suspended=applyAdminReview(user,{review_status:'SUSPENDED',reviewed_by:'STYLO_ADMIN',review_note:'Revisión administrativa'});
  assert.equal(suspended.access_status,'SUSPENDED');
  assert.equal(suspended.review_status,'SUSPENDED');
  assert.equal(canAccessCargas(suspended),false);
});

test('Stylo puede dar de baja posteriormente al usuario',()=>{
  const user=createAutomaticRegistration({phone:'3435551234'});
  const off=applyAdminReview(user,{review_status:'DEACTIVATED',reviewed_by:'STYLO_ADMIN'});
  assert.equal(off.access_status,'DEACTIVATED');
  assert.equal(canAccessCargas(off),false);
});
