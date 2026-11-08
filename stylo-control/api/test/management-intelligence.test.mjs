import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRetentionCohorts} from '../src/cohort-engine.mjs';
import {buildUnitEconomics} from '../src/unit-economics-engine.mjs';
import {buildNetworkLiquidity} from '../src/network-liquidity-engine.mjs';
import {buildExecutiveBrief} from '../src/executive-brief-engine.mjs';
import {buildModuleQualityScores} from '../src/module-quality-engine.mjs';

test('cohortes calculan retención mensual por usuario',()=>{
 const facts=[
  {module:'PLATFORM',event_type:'USER_REGISTERED',entity_type:'USER',entity_id:'U1',occurred_at:'2026-06-01T10:00:00Z'},
  {module:'PLATFORM',event_type:'USER_REGISTERED',entity_type:'USER',entity_id:'U2',occurred_at:'2026-06-02T10:00:00Z'},
  {module:'AUDIENCE',event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:'S1',occurred_at:'2026-07-10T10:00:00Z',dimensions:{user_id:'U1'}}
 ];
 const rows=buildRetentionCohorts({facts,cohort:'MONTH',periods:2});
 assert.equal(rows[0].size,2);
 assert.equal(rows[0].retention[1].active_users,1);
 assert.equal(rows[0].retention[1].retention_percent,50);
});

test('unit economics calcula contribución y margen por producto',()=>{
 const facts=[
  {module:'REVENUE',event_type:'REVENUE_RECORDED',value:100000,occurred_at:'2026-08-01T00:00:00Z',dimensions:{product:'VENTA_ASISTIDA',customer_id:'C1'}},
  {module:'REVENUE',event_type:'COST_RECORDED',value:30000,occurred_at:'2026-08-01T00:00:00Z',dimensions:{product:'VENTA_ASISTIDA',customer_id:'C1'}},
  {module:'VENTAS',event_type:'SALES_SERVICE_PURCHASED',occurred_at:'2026-08-01T00:00:00Z',dimensions:{product:'VENTA_ASISTIDA',customer_id:'C1'}}
 ];
 const row=buildUnitEconomics({facts,groupBy:'product'})[0];
 assert.equal(row.revenue,100000);
 assert.equal(row.direct_cost,30000);
 assert.equal(row.contribution,70000);
 assert.equal(row.contribution_margin_percent,70);
});

test('liquidez de Cargas resume fill y tiempo a match',()=>{
 const facts=[
  {module:'CARGAS',event_type:'LOAD_DETECTED',occurred_at:'2026-08-01T00:00:00Z'},
  {module:'CARGAS',event_type:'LOAD_DETECTED',occurred_at:'2026-08-01T01:00:00Z'},
  {module:'CARGAS',event_type:'LOAD_MATCHED',occurred_at:'2026-08-01T02:00:00Z',dimensions:{time_to_match_minutes:12}},
  {module:'CARGAS',event_type:'LOAD_MATCHED',occurred_at:'2026-08-01T03:00:00Z',dimensions:{time_to_match_minutes:20}},
  {module:'CARGAS',event_type:'AVAILABLE_VEHICLES',value:10,occurred_at:'2026-08-01T04:00:00Z'},
  {module:'CARGAS',event_type:'OPEN_LOADS',value:12,occurred_at:'2026-08-01T04:00:00Z'}
 ];
 const r=buildNetworkLiquidity({facts});
 assert.equal(r.match_rate_percent,100);
 assert.equal(r.median_time_to_match_minutes,16);
 assert.equal(r.liquidity_status,'HEALTHY');
});

test('quality score penaliza módulo caído o datos viejos',()=>{
 const rows=buildModuleQualityScores({health:[{module:'CARGAS',status:'HEALTHY',latency_ms:200},{module:'VENTAS',status:'DOWN',latency_ms:9000}],facts:[{module:'CARGAS',event_type:'LOAD_DETECTED',occurred_at:'2026-08-16T10:00:00Z'}],now:new Date('2026-08-16T12:00:00Z')});
 const cargas=rows.find(x=>x.module==='CARGAS');
 const ventas=rows.find(x=>x.module==='VENTAS');
 assert.ok(cargas.quality_score>ventas.quality_score);
 assert.equal(cargas.grade,'A');
});

test('brief ejecutivo prioriza módulos caídos',()=>{
 const r=buildExecutiveBrief({facts:[],health:[{module:'VENTAS',status:'DOWN'}],now:new Date('2026-08-16T12:00:00Z')});
 assert.equal(r.status,'CRITICAL');
 assert.equal(r.priority_actions[0].action,'RESOLVE_MODULE_NOW');
});
