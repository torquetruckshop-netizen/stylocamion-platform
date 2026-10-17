import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryControlStore} from '../src/control-store.mjs';
import {createControlService} from '../src/control-service.mjs';
import {ingestNewsEvents} from '../src/adapters/news-control-adapter.mjs';

test('Noticias mide publicaciones, lecturas, interacción y derivaciones comerciales',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestNewsEvents({controlService:service,events:[
  {event_id:'p1',type:'ARTICLE_PUBLISHED',article_id:'a1',topic:'tasas'},
  {event_id:'v1',type:'ARTICLE_VIEW',article_id:'a1',topic:'tasas'},
  {event_id:'v2',type:'ARTICLE_VIEW',article_id:'a1',topic:'tasas'},
  {event_id:'e1',type:'READ_75',article_id:'a1',topic:'tasas'},
  {event_id:'c1',type:'CTA_CLICK',article_id:'a1',target:'ventas'},
  {event_id:'c2',type:'CTA_CLICK',article_id:'a1',target:'cargas'}
 ]});
 const o=service.adminOverview({role:'ADMIN'});
 assert.equal(o.sections.NOTICIAS.news_articles_published.value,1);
 assert.equal(o.sections.NOTICIAS.news_article_views.value,2);
 assert.equal(o.sections.NOTICIAS.news_engaged_reads.value,1);
 assert.equal(o.sections.NOTICIAS.news_commercial_clicks.value,2);
 assert.equal(o.sections.NOTICIAS.news_to_commercial_rate.value,100);
 assert.equal(o.sections.NOTICIAS.news_to_ventas_clicks.value,1);
 assert.equal(o.sections.NOTICIAS.news_to_cargas_clicks.value,1);
});

test('Investor View sólo expone volumen editorial agregado',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestNewsEvents({controlService:service,events:[
  {event_id:'p1',type:'ARTICLE_PUBLISHED',article_id:'a1'},
  {event_id:'v1',type:'ARTICLE_VIEW',article_id:'a1'},
  {event_id:'c1',type:'CTA_CLICK',article_id:'a1',target:'ventas'}
 ]});
 const inv=service.investorSnapshot({role:'INVESTOR'});
 assert.equal(inv.sections.NOTICIAS.news_articles_published.value,1);
 assert.equal(inv.sections.NOTICIAS.news_article_views.value,1);
 assert.equal('news_commercial_clicks' in inv.sections.NOTICIAS,false);
});

test('reintento editorial no duplica métricas',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 const event={event_id:'same',type:'ARTICLE_VIEW',article_id:'a1'};
 ingestNewsEvents({controlService:service,events:[event,event]});
 assert.equal(service.adminOverview({role:'ADMIN'}).sections.NOTICIAS.news_article_views.value,1);
});
