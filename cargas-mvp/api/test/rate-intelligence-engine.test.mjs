import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLaneRateProfile,forecastLaneRate,evaluateOfferedRate,estimateAcceptanceProbability} from '../src/rate-intelligence-engine.mjs';

test('perfil de tarifa calcula mediana tendencia y forecast',()=>{
 const samples=[]; for(let i=0;i<12;i++) samples.push({amount:(1000+i*20)*500,loaded_km:500,currency:'ARS',occurred_at:new Date(2026,0,i+1)});
 const p=buildLaneRateProfile(samples); assert.equal(p.status,'READY'); assert.equal(p.confidence,'MEDIUM'); assert.ok(p.trend_percent>0);
 const f=forecastLaneRate(p,7); assert.equal(f.status,'FORECAST'); assert.ok(f.forecast_rate_per_km>=p.recent_average_rate_per_km);
});

test('oferta alta y preferencia fuerte elevan probabilidad de aceptación',()=>{
 const p=buildLaneRateProfile(Array.from({length:10},(_,i)=>({amount:500000+i*1000,loaded_km:500,occurred_at:new Date(2026,0,i+1)})));
 const e=evaluateOfferedRate({amount:650000,loadedKm:500,profile:p});
 assert.equal(e.status,'EVALUATED'); assert.equal(e.market_position,'HIGH');
 const a=estimateAcceptanceProbability({rateEvaluation:e,preferenceScore:85,facilityRisk:'GREEN'});
 assert.ok(a.probability_percent>60);
});
