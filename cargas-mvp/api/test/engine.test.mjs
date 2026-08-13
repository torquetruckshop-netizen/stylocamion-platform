import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIntake, scoreVehicle } from '../src/engine.mjs';

test('normaliza una carga típica de WhatsApp',()=>{
  const load=normalizeIntake({source:'WHATSAPP_DIRECT',raw_text:'Rafaela -> Rosario, 28 tn maíz, chasis + acoplado mañana 08:00',received_at:'2026-08-13T02:00:00-03:00'}, new Date('2026-08-13T02:00:00-03:00'));
  assert.equal(load.origin,'Rafaela');
  assert.equal(load.destination,'Rosario');
  assert.equal(load.weight_tn,28);
  assert.equal(load.cargo_type,'maíz');
  assert.equal(load.equipment_required,'chasis + acoplado');
  assert.equal(load.pickup_at,'2026-08-14T11:00:00.000Z');
  assert.equal(load.status,'PUBLICADA');
  assert.equal(load.traffic_light,'GREEN');
});

test('marca amarillo cuando faltan datos críticos',()=>{
  const load=normalizeIntake({source:'GROUP_FORWARD',raw_text:'Tengo 28 tn de maíz mañana',received_at:'2026-08-13T02:00:00-03:00'});
  assert.equal(load.status,'EN_VALIDACION');
  assert.equal(load.traffic_light,'YELLOW');
  assert.ok(load.missing_fields.includes('origin'));
});

test('ranking premia compatibilidad documental y cercanía',()=>{
  const load={id:'SC-X',equipment_required:'sider'};
  const carrier={id:'C1',reputation_score:4.8};
  const vehicle={id:'V1',carrier_id:'C1',equipment_type:'sider',availability:'AVAILABLE',document_state:'GREEN'};
  const m=scoreVehicle(load,vehicle,carrier,10);
  assert.ok(m.total_score>=90);
});

test('entiende texto natural en X para Y',()=>{
  const load=normalizeIntake({source:'WHATSAPP_DIRECT',raw_text:'Tengo 28 tn de maíz en Rafaela para Rosario mañana 08:00, chasis + acoplado',received_at:'2026-08-13T02:00:00-03:00'});
  assert.equal(load.origin,'Rafaela');
  assert.equal(load.destination,'Rosario');
});
