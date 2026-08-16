import test from 'node:test';
import assert from 'node:assert/strict';
import {findAffectedOperations,buildOperationalNewsAlert} from '../src/geofenced-impact-engine.mjs';
import {buildTopicTimeline,buildCanonicalNewsObject,missingRepresentations} from '../src/news-timeline-engine.mjs';

test('geofencing vincula noticia crítica con cargas y camiones cercanos',()=>{const article={id:'N',title:'Corte total cerca de Rosario',severity:'CRITICAL',lat:-32.94,lon:-60.65};const impact=findAffectedOperations({article,loads:[{id:'L',origin:'Rosario',destination:'Parana',origin_lat:-32.95,origin_lon:-60.65}],vehicles:[{id:'V',location:{lat:-32.96,lon:-60.64}}]});assert.equal(impact.affected_loads.length,1);assert.equal(impact.affected_vehicles.length,1);assert.equal(buildOperationalNewsAlert({article,impact}).priority,'CRITICAL');});

test('timeline ordena novedades de un tema',()=>{const rows=buildTopicTimeline([{id:'1',title:'Diesel A',topic:'combustible',published_at:'2026-08-15T00:00:00Z'},{id:'2',title:'Diesel B',tags:['combustible'],published_at:'2026-08-16T00:00:00Z'}],'combustible');assert.equal(rows[0].id,'2');});

test('objeto canónico identifica traducciones y audio faltantes',()=>{const n=buildCanonicalNewsObject({id:'1',title:'Test',languages:{es:'hola'}});const missing=missingRepresentations(n);assert.ok(missing.includes('PT_TRANSLATION'));assert.ok(missing.includes('EN_TRANSLATION'));assert.ok(missing.includes('ES_AUDIO'));});
