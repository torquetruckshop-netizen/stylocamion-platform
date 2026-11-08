import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContinuousMovePlan} from '../src/continuous-move-engine.mjs';

test('encadena cargas compatibles priorizando menos vacío y mejor contribución',async()=>{
 const vehicle={id:'V1',equipment_type:'sider',capacity_tn:30,expected_available_location:'ROSARIO'};
 const loads=[
  {id:'L1',origin:'ROSARIO',destination:'PARANA',equipment_required:'sider',weight_tn:25,traffic_light:'GREEN',loaded_route_km:180,price_amount:500000,variable_cost:150000,pickup_at:'2026-08-16T15:00:00Z'},
  {id:'L2',origin:'PARANA',destination:'SANTA FE',equipment_required:'sider',weight_tn:20,traffic_light:'GREEN',loaded_route_km:35,price_amount:200000,variable_cost:60000,pickup_at:'2026-08-16T18:00:00Z'}
 ];
 const dist=async({from,to})=>String(from).includes('ROSARIO')&&String(to).includes('ROSARIO')?0:10;
 const plan=await buildContinuousMovePlan({vehicle,candidateLoads:loads,distanceResolver:dist,maxLegs:2,now:new Date('2026-08-16T14:00:00Z')});
 assert.equal(plan.status,'PLAN_FOUND');
 assert.equal(plan.legs.length,2);
 assert.equal(plan.total_revenue,700000);
 assert.ok(plan.empty_km_percent<10);
});
