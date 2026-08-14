import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFleetDashboard } from '../src/fleet-dashboard-service.mjs';

test('Mi Flota Hoy prioriza la mejor oportunidad por continuidad', () => {
  const vehicles = [{ id:'V1', plate:'AB123CD', equipment_type:'sider', availability:'BUSY', document_state:'GREEN' }];
  const availability = [{ vehicle_id:'V1', available_from:'2026-08-14T15:00:00-03:00', expected_location_name:'Córdoba', preferred_destinations:['Santa Fe'] }];
  const opportunitiesByVehicle = {
    V1: [
      { load_id:'L1', matchScore:90, emptyKm:70, waitMinutes:40, destinationPreference:false },
      { load_id:'L2', matchScore:95, emptyKm:15, waitMinutes:20, destinationPreference:true }
    ]
  };
  const [row] = buildFleetDashboard({ vehicles, availability, opportunitiesByVehicle });
  assert.equal(row.best_opportunity.load_id, 'L2');
  assert.equal(row.opportunity_count, 2);
  assert.equal(row.attention, 'GREEN');
});

test('unidad sin oportunidad queda amarilla', () => {
  const [row] = buildFleetDashboard({
    vehicles:[{ id:'V2', plate:'AC456EF', equipment_type:'chasis + acoplado', availability:'AVAILABLE', document_state:'GREEN' }]
  });
  assert.equal(row.attention, 'YELLOW');
});
