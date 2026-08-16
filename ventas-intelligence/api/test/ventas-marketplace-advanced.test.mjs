import test from 'node:test';
import assert from 'node:assert/strict';
import {findListingsForRequest,buildBuyerRequestAlert} from '../src/demand-matching-engine.mjs';
import {evaluateInventoryRotation,sellerFunnel} from '../src/inventory-rotation-engine.mjs';
import {buildConditionalVehicleOffer,evaluateVehicleOffer,evaluateInspection} from '../src/offer-inspection-engine.mjs';

test('Want-to-Buy encuentra inventario compatible',()=>{const request={id:'R1',user_id:'U1',brand:'Volvo',model:'FH',year_min:2020,price_max:150000,country:'AR'};const listings=[{id:'L1',brand:'Volvo',model:'FH 540',year:2022,price_amount:120000,country:'AR'},{id:'L2',brand:'Scania',model:'R',year:2022,price_amount:120000,country:'AR'}];const found=findListingsForRequest(request,listings);assert.equal(found[0].id,'L1');assert.ok(buildBuyerRequestAlert({request,listing:listings[0]}));});

test('rotación recomienda revisar precio si unidad cara envejece',()=>{const r=evaluateInventoryRotation({listing:{id:'L',created_at:'2026-06-01T00:00:00Z'},metrics:{views:200,contacts:1,offers:0},marketEvaluation:{market_position:'HIGH'},now:new Date('2026-08-16T00:00:00Z')});assert.equal(r.rotation_status,'STALE');assert.ok(r.recommended_actions.includes('REVIEW_PRICE'));});

test('seller funnel calcula conversiones',()=>{const f=sellerFunnel([{type:'IMPRESSION'},{type:'IMPRESSION'},{type:'VIEW'},{type:'WHATSAPP_CONTACT'},{type:'OFFER'},{type:'SOLD'}]);assert.equal(f.view_rate,50);assert.equal(f.close_rate,100);});

test('oferta condicionada respeta piso y expiración',()=>{const listing={id:'L',price_amount:100000,currency:'USD'};const offer=buildConditionalVehicleOffer({listing,buyerId:'B',amount:90000,conditions:['INSPECTION_OK'],now:new Date('2026-08-16T12:00:00Z')});assert.equal(evaluateVehicleOffer({listing,offer}).acceptable,true);assert.equal(offer.status,'OPEN');});

test('inspección completa habilita verified badge',()=>{const checks={identity:true,ownership:true,vin_chassis:true,engine:true,odometer:true,documents:true,liens:true,photos:true,tyres:true,cab:true,powertrain:true};const r=evaluateInspection(checks);assert.equal(r.status,'VERIFIED');assert.equal(r.ready_for_verified_badge,true);});
