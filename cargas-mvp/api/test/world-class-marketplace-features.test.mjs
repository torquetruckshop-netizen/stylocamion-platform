import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateInstantBook,buildInstantBookProposal} from '../src/instant-book-policy.mjs';
import {buildConditionalBid,evaluateConditionalBid,suggestCounterBid} from '../src/conditional-bid-engine.mjs';
import {buildMarketHeatmap,suggestRepositioning} from '../src/market-heatmap-engine.mjs';
import {buildExceptionInbox,summarizeExceptionInbox} from '../src/exception-inbox-engine.mjs';

test('Instant Book sólo habilita operación verde y confiable',()=>{const r=evaluateInstantBook({load:{traffic_light:'GREEN',price_amount:500000,id:'L1'},vehicle:{id:'V1',document_state:'GREEN',availability:'AVAILABLE'},match:{total_score:94,distance_quality:'HIGH'},intelligence:{auto_transact_allowed:true,trust_score:90,acceptance_probability:80,facility_risk:'GREEN'}});assert.equal(r.allowed,true);const p=buildInstantBookProposal({load:{id:'L1',price_amount:500000},vehicle:{id:'V1'},now:new Date('2026-08-16T12:00:00Z')});assert.equal(p.status,'PENDING_CONFIRMATION');});

test('trust bajo o planta roja bloquean Instant Book',()=>{const r=evaluateInstantBook({load:{traffic_light:'GREEN',price_amount:1},vehicle:{document_state:'GREEN',availability:'AVAILABLE'},match:{total_score:95,distance_quality:'HIGH'},intelligence:{auto_transact_allowed:false,trust_score:40,facility_risk:'RED'}});assert.equal(r.allowed,false);assert.ok(r.reasons.includes('TRUST_GATE'));});

test('Conditional Bid admite fecha/precio dentro de reglas y sugiere contraoferta',()=>{const load={id:'L',price_amount:500000,loaded_route_km:500,price_currency:'ARS',pickup_at:'2026-08-17T10:00:00Z'};const bid=buildConditionalBid({load,carrierId:'C',priceAmount:450000,pickupAt:'2026-08-17T14:00:00Z'});const e=evaluateConditionalBid({load,bid});assert.equal(e.acceptable,true);const counter=suggestCounterBid({load,rateProfile:{status:'READY',median_rate_per_km:1000,currency:'ARS'},preferenceScore:70});assert.ok(counter.price_amount>0);});

test('heatmap identifica zonas con alta demanda y reposicionamiento',()=>{const loads=[{origin_lat:-32.95,origin_lon:-60.65,weight_tn:20},{origin_lat:-32.96,origin_lon:-60.64,weight_tn:20}];const vehicles=[{id:'V',location:{lat:-31.73,lon:-60.52}}];const h=buildMarketHeatmap({loads,vehicles});assert.ok(h.some(x=>x.market_state==='HIGH_DEMAND'));const s=suggestRepositioning({vehicle:vehicles[0],heatmap:h});assert.ok(s.length>0);});

test('Exception Inbox deduplica y prioriza críticas',()=>{const items=buildExceptionInbox([{type:'ETA_DELAY',severity:'WARNING',vehicle_id:'V1',observed_at:'2026-08-16T10:00:00Z'},{type:'ETA_DELAY',severity:'CRITICAL',vehicle_id:'V1',observed_at:'2026-08-16T11:00:00Z'},{type:'GPS_STALE',severity:'WARNING',vehicle_id:'V2'}]);assert.equal(items[0].severity,'CRITICAL');assert.equal(items.length,2);assert.equal(summarizeExceptionInbox(items).critical,1);});
