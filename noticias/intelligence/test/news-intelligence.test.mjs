import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTrustProfile,classifyOperationalImpact,scoreNewsForProfile,recommendedNewsAction} from '../src/news-intelligence-engine.mjs';
import {buildNewsAlert,matchWatchlist,buildDailyBrief,detectStructuredContradictions} from '../src/news-alert-engine.mjs';

test('fuente oficial recibe trust muy alto',()=>{const p=sourceTrustProfile({type:'OFFICIAL',identified_author:true,original_document_url:'x'});assert.equal(p.trust_level,'VERY_HIGH');assert.ok(p.trust_score>=95);});

test('corte total de ruta se clasifica crítico y accionable',()=>{const a={title:'Corte total en Ruta 34 por inundación',country:'AR'};const i=classifyOperationalImpact(a);assert.equal(i.critical,true);assert.ok(i.impact_tags.includes('ROUTES'));assert.ok(recommendedNewsAction({...a,...i}).includes('CHECK_ACTIVE_LOADS'));});

test('perfil regional prioriza noticia relevante',()=>{const a={title:'Peaje y corte en Ruta 34',country:'AR',region:'Santa Fe',summary:'corte de ruta',severity:'HIGH',impact_tags:['ROUTES']};const s=scoreNewsForProfile(a,{country:'AR',provinces:['Santa Fe'],impact_tags:['ROUTES']});assert.ok(s.relevance_score>=80);});

test('watchlist y alertas relevantes son deduplicables',()=>{const a={id:'N1',title:'Suben tasas de créditos para transporte',country:'AR'};assert.equal(matchWatchlist(a,{country:'AR',keywords:['tasas']}),true);const alert=buildNewsAlert({article:a,profile:{id:'U1',country:'AR',impact_tags:['RATES']}});assert.ok(alert);assert.match(alert.dedupe_key,/NEWS:N1:U1/);});

test('brief pone críticas primero y detecta claims contradictorios',()=>{const brief=buildDailyBrief({articles:[{id:'1',title:'Mercado estable'},{id:'2',title:'Corte total de ruta por inundación'}],profile:{}});assert.equal(brief.items[0].article.id,'2');const c=detectStructuredContradictions([{topic:'diesel',metric:'price',scope:'AR',value:100,source:'A'},{topic:'diesel',metric:'price',scope:'AR',value:110,source:'B'}]);assert.equal(c.length,1);});
