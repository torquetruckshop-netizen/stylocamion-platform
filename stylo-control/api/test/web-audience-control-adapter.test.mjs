import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryControlStore} from '../src/control-store.mjs';
import {createControlService} from '../src/control-service.mjs';
import {ingestWebAudienceEvents} from '../src/adapters/web-audience-control-adapter.mjs';

test('audiencia registra sesiones, visitantes, módulos y acciones comerciales',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestWebAudienceEvents({controlService:service,events:[
  {event_id:'e1',type:'SESSION_START',session_id:'s1',visitor_id:'v1'},
  {event_id:'e2',type:'PAGE_VIEW',session_id:'s1',visitor_id:'v1',path:'/ventas'},
  {event_id:'e3',type:'WHATSAPP_CLICK',session_id:'s1',visitor_id:'v1',path:'/ventas'},
  {event_id:'e4',type:'SESSION_START',session_id:'s2',visitor_id:'v1'},
  {event_id:'e5',type:'PAGE_VIEW',session_id:'s2',visitor_id:'v1',path:'/cargas'},
  {event_id:'e6',type:'SESSION_START',session_id:'s3',visitor_id:'v2'},
  {event_id:'e7',type:'PAGE_VIEW',session_id:'s3',visitor_id:'v2',path:'/noticias'}
 ]});
 const o=service.adminOverview({role:'ADMIN'});
 assert.equal(o.sections.AUDIENCE.web_sessions.value,3);
 assert.equal(o.sections.AUDIENCE.web_visitors_observed.value,2);
 assert.equal(o.sections.AUDIENCE.module_visits_ventas.value,1);
 assert.equal(o.sections.AUDIENCE.module_visits_cargas.value,1);
 assert.equal(o.sections.AUDIENCE.module_visits_noticias.value,1);
 assert.equal(o.sections.AUDIENCE.commercial_clicks.value,1);
});

test('reintento del mismo evento web no duplica métricas',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 const e={event_id:'same',type:'SESSION_START',session_id:'s1',visitor_id:'v1'};
 ingestWebAudienceEvents({controlService:service,events:[e,e]});
 assert.equal(service.adminOverview({role:'ADMIN'}).sections.AUDIENCE.web_sessions.value,1);
});

test('Investor View sólo expone audiencia agregada permitida',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestWebAudienceEvents({controlService:service,events:[{event_id:'1',type:'SESSION_START',session_id:'s1',visitor_id:'v1'}]});
 const inv=service.investorSnapshot({role:'INVESTOR'});
 assert.equal(inv.sections.AUDIENCE.web_sessions.value,1);
 assert.equal('web_visitors_observed' in inv.sections.AUDIENCE,false);
 assert.equal('commercial_clicks' in inv.sections.AUDIENCE,false);
});
