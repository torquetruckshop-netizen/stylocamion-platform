import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTrustProfile,classifyOperationalImpact,scoreNewsForProfile,recommendedNewsAction} from '../src/news-intelligence-engine.mjs';
import {buildNewsAlert,matchWatchlist,buildDailyBrief,detectStructuredContradictions} from '../src/news-alert-engine.mjs';
import {clusterStories,assessFreshness,buildProvenance,applyCorrection} from '../src/story-clustering-engine.mjs';

test('fuente oficial recibe trust muy alto',()=>{const p=sourceTrustProfile({type:'OFFICIAL',identified_author:true,original_document_url:'x'});assert.equal(p.trust_level,'VERY_HIGH');assert.ok(p.trust_score>=95);});

test('corte total de ruta se clasifica crítico y accionable',()=>{const a={title:'Corte total en Ruta 34 por inundación',country:'AR'};const i=classifyOperationalImpact(a);assert.equal(i.critical,true);assert.ok(i.impact_tags.includes('ROUTES'));assert.ok(recommendedNewsAction({...a,...i}).includes('CHECK_ACTIVE_LOADS'));});

test('perfil regional prioriza noticia relevante',()=>{const a={title:'Peaje y corte en Ruta 34',country:'AR',region:'Santa Fe',summary:'corte de ruta',severity:'HIGH',impact_tags:['ROUTES']};const s=scoreNewsForProfile(a,{country:'AR',provinces:['Santa Fe'],impact_tags:['ROUTES']});assert.ok(s.relevance_score>=80);});

test('watchlist y alertas relevantes son deduplicables',()=>{const a={id:'N1',title:'Suben tasas de créditos para transporte',country:'AR'};assert.equal(matchWatchlist(a,{country:'AR',keywords:['tasas']}),true);const alert=buildNewsAlert({article:a,profile:{id:'U1',country:'AR',impact_tags:['RATES']}});assert.ok(alert);assert.match(alert.dedupe_key,/NEWS:N1:U1/);});

test('brief pone críticas primero y detecta claims contradictorios',()=>{const brief=buildDailyBrief({articles:[{id:'1',title:'Mercado estable'},{id:'2',title:'Corte total de ruta por inundación'}],profile:{}});assert.equal(brief.items[0].article.id,'2');const c=detectStructuredContradictions([{topic:'diesel',metric:'price',scope:'AR',value:100,source:'A'},{topic:'diesel',metric:'price',scope:'AR',value:110,source:'B'}]);assert.equal(c.length,1);});

test('clustering agrupa historias equivalentes y prioriza la fuente más confiable',()=>{const rows=clusterStories([{id:'A',title:'Corte total Ruta 34 por inundación',summary:'tránsito interrumpido en Santa Fe',source:'Medio',source_trust_score:70,published_at:'2026-08-16T10:00:00Z'},{id:'B',title:'Ruta 34 corte total por inundación',summary:'tránsito interrumpido en Santa Fe',source:'Vialidad',source_trust_score:95,published_at:'2026-08-16T09:00:00Z'}]);assert.equal(rows.length,1);assert.equal(rows[0].lead_article.id,'B');});

test('freshness y correcciones preservan trazabilidad',()=>{const fresh=assessFreshness({published_at:'2026-08-16T00:00:00Z',impact_tags:['ROUTES']},new Date('2026-08-16T13:00:00Z'));assert.equal(fresh.status,'STALE');const corrected=applyCorrection({id:'N',title:'Anterior',source:'Oficial'},{patch:{title:'Actualizado'},reason:'Actualización',at:'2026-08-16T12:00:00Z',by:'EDITOR'});assert.equal(corrected.title,'Actualizado');assert.equal(buildProvenance(corrected).corrections[0].by,'EDITOR');});
