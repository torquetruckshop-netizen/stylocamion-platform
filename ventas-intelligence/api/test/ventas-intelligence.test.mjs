import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMarketPriceProfile,evaluateListingPrice,selectComparables} from '../src/market-price-engine.mjs';
import {evaluateListingQuality} from '../src/listing-quality-engine.mjs';
import {scoreBuyerIntent} from '../src/buyer-intent-engine.mjs';
import {buildNewListingAlerts,buildPriceChangeAlert} from '../src/search-alert-engine.mjs';
import {estimateFinancing,compareVehicles} from '../src/finance-comparator-engine.mjs';

test('price intelligence clasifica unidad contra comparables',()=>{
 const ref={brand:'Volvo',model:'FH',year:2022,country:'AR'};
 const comps=Array.from({length:10},(_,i)=>({id:`C${i}`,brand:'Volvo',model:'FH',year:2021+i%2,country:'AR',price_amount:100000+i*1000}));
 const selected=selectComparables(ref,comps);const p=buildMarketPriceProfile(selected);const e=evaluateListingPrice({priceAmount:140000,profile:p});
 assert.equal(p.status,'READY');assert.equal(e.market_position,'HIGH');
});

test('listing quality detecta publicación incompleta',()=>{
 const q=evaluateListingQuality({brand:'Scania',model:'R',year:2020,price_amount:100,photos:['1'],description:'corta'});
 assert.ok(q.quality_score<75);assert.ok(q.recommendations.length>0);
});

test('buyer intent prioriza WhatsApp financiación y guardado',()=>{
 const r=scoreBuyerIntent([{type:'VIEW'},{type:'SAVE'},{type:'FINANCING_CLICK'},{type:'WHATSAPP_CLICK'}]);
 assert.ok(r.intent_score>=50);assert.ok(['WARM','HOT'].includes(r.tier));
});

test('saved search y price drop generan alertas deduplicables',()=>{
 const listing={id:'L1',brand:'Volvo',model:'FH 540',year:2022,price_amount:120000,country:'AR'};
 const alerts=buildNewListingAlerts({listing,savedSearches:[{id:'S1',user_id:'U1',brand:'Volvo',model:'FH',year_min:2020}]});
 assert.equal(alerts.length,1);assert.equal(alerts[0].dedupe_key,'NEW_LISTING:S1:L1');
 const p=buildPriceChangeAlert({listingId:'L1',userId:'U1',oldPrice:120000,newPrice:105000});assert.equal(p.type,'PRICE_DROP');assert.equal(p.priority,'HIGH');
});

test('estimador financiero y comparador técnico funcionan sin inventar oferta',()=>{
 const f=estimateFinancing({price:100000,downPayment:20000,annualRatePercent:24,months:24});assert.equal(f.status,'ESTIMATE');assert.equal(f.disclaimer,'ESTIMACIÓN_NO_OFERTA');
 const c=compareVehicles([{id:'A',power_hp:500,km:300000,price_amount:100},{id:'B',power_hp:540,km:400000,price_amount:110}]);
 assert.equal(c.find(x=>x.field==='power_hp').best_vehicle_id,'B');assert.equal(c.find(x=>x.field==='km').best_vehicle_id,'A');
});
