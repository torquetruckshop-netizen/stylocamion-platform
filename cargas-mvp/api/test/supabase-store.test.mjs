import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLoadToRow, mapLoadRow, mapVehicleRow } from '../src/supabase-store.mjs';

test('mapea una carga del motor al esquema Postgres y vuelve sin perder campos críticos',()=>{
  const load={
    id:'SC-ABC12345',source:'GROUP_FORWARD',sender_id:'USR-1',raw_text:'Rosario -> Paraná, sider 28 tn',
    origin:'Rosario',destination:'Paraná',cargo_type:'carga general',weight_tn:28,equipment_required:'sider',
    pickup_at:'2026-08-15T17:00:00.000Z',status:'PUBLICADA',traffic_light:'GREEN',missing_fields:[],
    created_at:'2026-08-15T12:00:00.000Z',assigned_vehicle_id:null,assigned_carrier_id:null
  };
  const row=mapLoadToRow(load);
  assert.equal(row.public_id,'SC-ABC12345');
  assert.equal(row.origin_name,'Rosario');
  assert.equal(row.destination_name,'Paraná');
  const restored=mapLoadRow({...row,id:'11111111-1111-1111-1111-111111111111'});
  assert.equal(restored.id,load.id);
  assert.equal(restored.db_id,'11111111-1111-1111-1111-111111111111');
  assert.equal(restored.weight_tn,28);
});

test('mapea ubicación y capacidad de unidad persistida',()=>{
  const vehicle=mapVehicleRow({
    id:'22222222-2222-2222-2222-222222222222',carrier_id:'33333333-3333-3333-3333-333333333333',plate:'TEST001',
    equipment_type:'sider',capacity_tn:'28.00',availability:'AVAILABLE',lat:'-31.420100',lon:'-64.188800',
    location_source:'TELEMATICS',location_updated_at:'2026-08-15T12:00:00Z',document_state:'GREEN'
  });
  assert.equal(vehicle.capacity_tn,28);
  assert.deepEqual(vehicle.location,{lat:-31.4201,lon:-64.1888});
});
