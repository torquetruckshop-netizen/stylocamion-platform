import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorldClassKpis} from '../src/world-class-kpi-engine.mjs';

test('mide capacidades world-class por módulo',()=>{const facts=[
 {module:'CARGAS',event_type:'INSTANT_BOOK_PROPOSED',occurred_at:'2026-08-16T10:00:00Z'},
 {module:'CARGAS',event_type:'INSTANT_BOOK_CONFIRMED',occurred_at:'2026-08-16T10:10:00Z'},
 {module:'VENTAS',event_type:'WANT_TO_BUY_MATCH',occurred_at:'2026-08-16T10:20:00Z'},
 {module:'NOTICIAS',event_type:'CRITICAL_NEWS_ALERT',occurred_at:'2026-08-16T10:30:00Z'},
 {module:'TELEMATICS',event_type:'AVOIDABLE_IDLE_COST',value:5000,occurred_at:'2026-08-16T10:40:00Z'}
 ];const k=buildWorldClassKpis({facts});assert.equal(k.CARGAS.instant_book_conversion_percent,100);assert.equal(k.VENTAS.want_to_buy_matches,1);assert.equal(k.NOTICIAS.critical_alerts,1);assert.equal(k.TELEMATICS.avoidable_idle_cost,5000);});
