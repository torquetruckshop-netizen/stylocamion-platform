import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDistanceResolver, vehicleLocationState } from '../src/distance-service.mjs';
import { runPriorityMatching } from '../src/network-matching-engine.mjs';

test('detecta ubicación de vehículo vencida', () => {
  const vehicle = { location:{lat:-31.25,lon:-61.49}, location_updated_at:'2026-08-15T10:00:00Z' };
  const state = vehicleLocationState(vehicle, new Date('2026-08-15T16:00:00Z'), 240);
  assert.equal(state.status,'STALE');
});

test('usa distancia de ruta como alta confianza cuando está disponible', async () => {
  const resolve = createEmptyDistanceResolver({
    now:() => new Date('2026-08-15T16:00:00Z'),
    roadDistanceProvider:async () => ({km:82.4,source:'ROUTER_TEST'})
  });
  const result = await resolve({
    load:{origin_lat:-31.63,origin_lon:-60.70},
    vehicle:{location:{lat:-31.25,lon:-61.49},location_updated_at:'2026-08-15T15:30:00Z'}
  });
  assert.equal(result.quality,'HIGH');
  assert.equal(result.source,'ROUTER_TEST');
  assert.equal(result.km,82.4);
});

test('degrada a baja confianza si la ubicación del camión está vencida', async () => {
  const resolve = createEmptyDistanceResolver({ now:() => new Date('2026-08-15T20:00:00Z'), staleAfterMinutes:120 });
  const result = await resolve({
    load:{origin_lat:-31.63,origin_lon:-60.70},
    vehicle:{location:{lat:-31.25,lon:-61.49},location_updated_at:'2026-08-15T10:00:00Z'}
  });
  assert.equal(result.quality,'LOW');
  assert.equal(result.source,'STALE_LOCATION_ESTIMATE');
});

test('matching autónomo rechaza una distancia de baja confianza', async () => {
  const result = await runPriorityMatching({
    load:{id:'L1',traffic_light:'GREEN',missing_fields:[],equipment_required:'sider',weight_tn:20},
    ownFleet:[{
      vehicle:{id:'V1',carrier_id:'C1',equipment_type:'sider',capacity_tn:28,availability:'AVAILABLE',document_state:'GREEN'},
      carrier:{id:'C1',status:'ACTIVE',reputation_score:5}
    }],
    privateNetwork:[],
    styloNetwork:[],
    allowPrivateNetwork:false,
    allowStyloNetwork:false,
    distanceResolver:async () => ({km:5,quality:'LOW',source:'STALE_LOCATION_ESTIMATE'})
  });
  assert.equal(result.status,'NO_ELIGIBLE_MATCH');
  assert.ok(result.trace[0].rejection_reasons[0].reasons.includes('LOW_DISTANCE_CONFIDENCE'));
});
