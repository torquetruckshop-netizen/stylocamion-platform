import test from 'node:test';
import assert from 'node:assert/strict';
import {findListingsForRequest,buildBuyerRequestAlert} from '../src/demand-matching-engine.mjs';
import {evaluateInventoryRotation,sellerFunnel} from '../src/inventory-rotation-engine.mjs';
import {buildConditionalVehicleOffer,evaluateVehicleOffer,evaluateInspection} from '../src/offer-inspection-engine.mjs';
import {estimateVehicleShipping,compareShippingQuotes} from '../src/shipping-quote-engine.mjs';
import {buildSellerTrustProfile,listingTrustGate} from '../src/seller-trust-engine.mjs';
import {recommendSimilarListings} from '../src/similar-listings-engine.mjs';

test('Want-to-Buy encuentra inventario compatible',()=>{const request={id:'R1',user_id:'U1',brand:'Volvo',model:'FH',year_min:2020,price_max:150000,country:'AR'};const listings=[{id:'L1',brand:'Volvo',model:'FH 540',year:2022,price_amount:120000,country:'AR'},{id:'L2',brand:'Scania',model:'R',year:2022,price_amount:120000,country:'AR'}];const found=findListingsForRequest(request,listings);assert.equal(found[0].id,'L1');assert.ok(buildBuyerRequestAlert({request,listing:listings[0]}));});

test('rotación recomienda revisar precio si unidad cara envejece',()=>{const r=evaluateInventoryRotation({listing:{id:'L',created_at:'2026-06-01T00:00:00Z'},metrics:{views:200,contacts:1,offers:0},marketEvaluation:{market_position:'HIGH'},now:new Date('2026-08-16T00:00:00Z')});assert.equal(r.rotation_status,'STALE');assert.ok(r.recommended_actions.includes('REVIEW_PRICE'));});

test('seller funnel calcula conversiones',()=>{const f=sellerFunnel([{type:'IMPRESSION'},{type:'IMPRESSION'},{type:'VIEW'},{type:'WHATSAPP_CONTACT'},{type:'OFFER'},{type:'SOLD'}]);assert.equal(f.view_rate,50);assert.equal(f.close_rate,100);});

test('oferta condicionada respeta piso y expiración',()=>{const listing={id:'L',price_amount:100000,currency:'USD'};const offer=buildConditionalVehicleOffer({listing,buyerId:'B',amount:90000,conditions:['INSPECTION_OK'],now:new Date('2026-08-16T12:00:00Z')});assert.equal(evaluateVehicleOffer({listing,offer}).acceptable,true);assert.equal(offer.status,'OPEN');});

test('inspección completa habilita verified badge',()=>{const checks={identity:true,ownership:true,vin_chassis:true,engine:true,odometer:true,documents:true,liens:true,photos:true,tyres:true,cab:true,powertrain:true};const r=evaluateInspection(checks);assert.equal(r.status,'VERIFIED');assert.equal(r.ready_for_verified_badge,true);});

test('cotización logística suma traslado y adicionales sin presentarse como vinculante',()=>{const q=estimateVehicleShipping({distanceKm:500,baseRatePerKm:1000,loadingFee:20000,tolls:10000,insurance:5000});assert.equal(q.total_estimated,535000);assert.equal(q.disclaimer,'ESTIMACIÓN_LOGÍSTICA_NO_COTIZACIÓN_VINCULANTE');const ranked=compareShippingQuotes([q,{...q,total_estimated:600000}]);assert.equal(ranked[0].rank,1);});

test('seller trust e inspección habilitan publicación verificada',()=>{const seller=buildSellerTrustProfile({completed_sales:30,cancellations:0,disputes:0,identity_verified:true,company_verified:true,documents_verified:true,average_response_minutes:20});const inspection=evaluateInspection({identity:true,ownership:true,vin_chassis:true,engine:true,odometer:true,documents:true,liens:true,photos:true,tyres:true,cab:true,powertrain:true});const gate=listingTrustGate({sellerProfile:seller,inspection});assert.equal(gate.allowed,true);assert.equal(gate.verified_listing,true);});

test('recomendador prioriza unidades realmente similares',()=>{const ref={id:'R',brand:'Volvo',model:'FH',year:2022,km:300000,country:'AR',category:'TRACTOR',price_amount:100000};const rows=recommendSimilarListings(ref,[{id:'A',brand:'Volvo',model:'FH',year:2021,km:320000,country:'AR',category:'TRACTOR',price_amount:105000},{id:'B',brand:'Scania',model:'P',year:2015,km:900000,country:'AR',category:'RIGID',price_amount:50000}]);assert.equal(rows[0].id,'A');});
