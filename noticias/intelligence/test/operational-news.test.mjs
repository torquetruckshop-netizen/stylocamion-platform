import test from 'node:test';
import assert from 'node:assert/strict';
import {findAffectedOperations,buildOperationalNewsAlert} from '../src/geofenced-impact-engine.mjs';
import {buildTopicTimeline,buildCanonicalNewsObject,missingRepresentations} from '../src/news-timeline-engine.mjs';
import {buildDecisionCard} from '../src/decision-card-engine.mjs';

test('geofencing vincula noticia crítica con cargas y camiones cercanos',()=>{const article={id:'N',title:'Corte total cerca de Rosario',severity:'CRITICAL',lat:-32.94,lon:-60.65};const impact=findAffectedOperations({article,loads:[{id:'L',origin:'Rosario',destination:'Parana',origin_lat:-32.95,origin_lon:-60.65}],vehicles:[{id:'V',location:{lat:-32.96,lon:-60.64}}]});assert.equal(impact.affected_loads.length,1);assert.equal(impact.affected_vehicles.length,1);assert.equal(buildOperationalNewsAlert({article,impact}).priority,'CRITICAL');});

test('timeline ordena novedades de un tema',()=>{const rows=buildTopicTimeline([{id:'1',title:'Diesel A',topic:'combustible',published_at:'2026-08-15T00:00:00Z'},{id:'2',title:'Diesel B',tags:['combustible'],published_at:'2026-08-16T00:00:00Z'}],'combustible');assert.equal(rows[0].id,'2');});

test('objeto canónico identifica traducciones y audio faltantes',()=>{const n=buildCanonicalNewsObject({id:'1',title:'Test',languages:{es:'hola'}});const missing=missingRepresentations(n);assert.ok(missing.includes('PT_TRANSLATION'));assert.ok(missing.includes('EN_TRANSLATION'));assert.ok(missing.includes('ES_AUDIO'));});

test('Decision Card combina impacto fuente frescura y acciones',()=>{const article={id:'N2',title:'Corte total en Ruta 34',summary:'Ruta cerrada por inundación',published_at:'2026-08-16T10:00:00Z',source_url:'https://example.invalid'};const card=buildDecisionCard({article,source:{type:'OFFICIAL',identified_author:true},affectedOperations:{affected_loads:[{load_id:'L'}],affected_vehicles:[]},now:new Date('2026-08-16T12:00:00Z')});assert.equal(card.severity,'CRITICAL');assert.equal(card.who_is_affected.loads,1);assert.ok(card.recommended_actions.includes('CHECK_ACTIVE_LOADS'));assert.equal(card.publishable,true);});
