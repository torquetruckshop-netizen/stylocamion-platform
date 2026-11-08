import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTrafficDay, buildTimeline } from '../src/day-simulation.mjs';

test('resume una jornada con flota propia y red privada', () => {
  const events = [
    {time:'07:00', type:'WHATSAPP_MESSAGE', classification:'LOAD'},
    {time:'07:01', type:'WHATSAPP_MESSAGE', classification:'IGNORE'},
    {time:'07:10', type:'ASSIGNMENT', mode:'AUTONOMOUS'},
    {time:'07:20', type:'ASSIGNMENT', mode:'PRIVATE_NETWORK'},
    {time:'08:00', type:'KPI_UPDATE', metrics:{empty_km_avoided:120, management_minutes_saved:40}}
  ];
  const x = summarizeTrafficDay(events);
  assert.equal(x.messages_processed, 2);
  assert.equal(x.loads_detected, 1);
  assert.equal(x.ignored, 1);
  assert.equal(x.assignments, 2);
  assert.equal(x.own_fleet_assignments, 1);
  assert.equal(x.private_network_assignments, 1);
  assert.equal(x.empty_km_avoided, 120);
});

test('ordena la jornada por hora', () => {
  const events = [{time:'10:00'}, {time:'07:00'}, {time:'18:00'}];
  assert.deepEqual(buildTimeline(events).map(x => x.time), ['07:00','10:00','18:00']);
});
