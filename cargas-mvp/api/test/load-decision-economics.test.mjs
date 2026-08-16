import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createLoadDecisionOrchestrator } from '../src/load-decision-orchestrator.mjs';
import { createTripEconomicsService } from '../src/trip-economics-service.mjs';

function candidate() {
  return {
    vehicle:{
      id:'VEH-ECO-1',
      carrier_id:'CAR-ECO-1',
      equipment_type:'chasis + acoplado',
      capacity_tn:30,
      fuel_consumption_l_per_100km:30,
      availability:'AVAILABLE',
      document_state:'GREEN'
    },
    carrier:{id:'CAR-ECO-1',status:'ACTIVE',reputation_score:5}
  };
}

test('match adjunta combustible peajes y resultado preliminar', async () => {
  const load={
    id:'SC-ECO-MATCH-1',
    traffic_light:'GREEN',
    missing_fields:[],
    equipment_required:'chasis + acoplado',
    weight_tn:28,
    price_amount:1000000,
    price_currency:'ARS'
  };
  const store=new MemoryStore({loads:[load]});
  const tripEconomicsEstimator=createTripEconomicsService();
  const decide=createLoadDecisionOrchestrator({
    store,
    distanceResolver:async () => 50,
    tripEconomicsEstimator
  });

  const result=await decide({
    load,
    ownFleet:[candidate()],
    targetUserId:'11111111-1111-1111-1111-111111111111',
    loadedKm:500,
    fuelPricePerLiter:1500,
    estimatedTollCount:3,
    averageTollAmount:10000
  });

  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.economics_status,'CALCULATED');
  assert.equal(result.economics.total_km,550);
  assert.equal(result.economics.estimated_liters,165);
  assert.equal(result.economics.variable_cost,277500);
  assert.equal(result.economics.preliminary_contribution,722500);
  assert.match(result.alert.body,/Costo variable ARS 277500/);

  const decisionEvent=store.events.find(x=>x.type==='AI_MATCH_DECISION');
  assert.equal(decisionEvent.payload.economics.variable_cost,277500);
});

test('si falta distancia cargada el matching continúa y la economía queda pendiente', async () => {
  const load={
    id:'SC-ECO-MATCH-2',
    traffic_light:'GREEN',
    missing_fields:[],
    equipment_required:'chasis + acoplado',
    weight_tn:28
  };
  const store=new MemoryStore({loads:[load]});
  const decide=createLoadDecisionOrchestrator({
    store,
    distanceResolver:async () => 20,
    tripEconomicsEstimator:createTripEconomicsService()
  });

  const result=await decide({load,ownFleet:[candidate()]});
  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.economics_status,'WAITING_ROUTE_DISTANCE');
  assert.equal(result.economics,null);
});
