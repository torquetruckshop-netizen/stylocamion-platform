import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore, seed } from '../src/store.mjs';
import { createAutomaticRegistration, canAccessCargas } from '../src/registration-engine.mjs';
import { googleProfileFromClaims, googlePatch } from '../src/google-identity.mjs';
import { createPersistentSession, isSessionUsable } from '../src/session-engine.mjs';
import { normalizeIntake, scoreVehicle, haversineKm } from '../src/engine.mjs';
import { notificationDecision } from '../src/notification-engine.mjs';

test('circuito maestro: identidad -> sesion -> carga -> match -> alerta -> adjudicacion',()=>{
  const store=new MemoryStore(seed);
  const now=new Date('2026-08-15T11:00:00-03:00');

  const google=googleProfileFromClaims({
    sub:'google-pilot-001',
    email:'piloto@example.com',
    email_verified:true,
    name:'Usuario Piloto',
    picture:'https://example.com/avatar.jpg'
  });

  const user=createAutomaticRegistration({
    phone:'+54 9 343 555 1234',
    country:'AR',
    role:'TRANSPORTISTA',
    auth_methods:['GOOGLE','PHONE'],
    ...googlePatch(google)
  },now);
  store.addUser(user);
  assert.equal(canAccessCargas(user),true);
  assert.deepEqual(user.auth_methods,['GOOGLE','PHONE']);

  const issued=createPersistentSession(user.id,{remember:true,device_label:'iPhone piloto',platform:'iOS'},now);
  store.addSession(issued.session);
  assert.equal(isSessionUsable(issued.session,now),true);

  const load=normalizeIntake({
    source:'GROUP_FORWARD',
    raw_text:'Rafaela -> Rosario, 28 tn maíz, chasis + acoplado hoy 15:00',
    received_at:now.toISOString()
  },now);
  store.addLoad(load);
  assert.equal(load.traffic_light,'GREEN');

  const origin={lat:-31.2503,lon:-61.4867};
  const ranking=store.listVehicles().map(vehicle=>{
    const carrier=store.getCarrier(vehicle.carrier_id);
    const distance=haversineKm(origin,vehicle.location);
    return scoreVehicle(load,vehicle,carrier,distance);
  }).filter(x=>x.equipment_score===100 && x.documents_score>0 && x.availability_score===100)
    .sort((a,b)=>b.total_score-a.total_score);

  assert.ok(ranking.length>0);
  assert.ok(ranking[0].total_score>=90);
  store.saveMatches(load.id,ranking);

  const alert=notificationDecision({
    type:'MATCH_STRONG',
    score:ranking[0].total_score,
    target_user_id:user.id,
    load_id:load.id,
    vehicle_id:ranking[0].vehicle_id,
    detail:`Match ${ranking[0].total_score}% para carga Rafaela -> Rosario`
  });
  assert.equal(alert.channel,'PUSH');
  assert.equal(alert.notify,true);

  const vehicle=store.getVehicle(ranking[0].vehicle_id);
  const assigned=store.updateLoad(load.id,{status:'ADJUDICADA',assigned_vehicle_id:vehicle.id,assigned_carrier_id:vehicle.carrier_id});
  store.updateVehicle(vehicle.id,{availability:'BUSY'});
  assert.equal(assigned.status,'ADJUDICADA');
  assert.equal(store.getVehicle(vehicle.id).availability,'BUSY');
});
