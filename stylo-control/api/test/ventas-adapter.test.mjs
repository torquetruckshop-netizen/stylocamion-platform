import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryControlStore } from '../src/control-store.mjs';
import { createControlService } from '../src/control-service.mjs';
import { ingestVentasEvents } from '../src/ventas-adapter.mjs';

test('Ventas alimenta publicaciones consultas servicios cierres y conversión',()=>{
  const store=new MemoryControlStore();
  const service=createControlService({store});
  const recordFact=fact=>service.recordFact({role:'ADMIN',fact});
  ingestVentasEvents({recordFact,events:[
    {id:'E1',type:'LISTINGS_ACTIVE',value:12,occurred_at:'2026-08-16T10:00:00Z'},
    {id:'E2',type:'LISTING_CREATED',listing_id:'L1',occurred_at:'2026-08-16T10:01:00Z'},
    {id:'E3',type:'INQUIRY_CREATED',inquiry_id:'I1',listing_id:'L1',channel:'WHATSAPP',occurred_at:'2026-08-16T10:02:00Z'},
    {id:'E4',type:'INQUIRY_CREATED',inquiry_id:'I2',listing_id:'L1',channel:'WEB',occurred_at:'2026-08-16T10:03:00Z'},
    {id:'E5',type:'SERVICE_PURCHASED',service_id:'S1',service_type:'VENTA_ASISTIDA',occurred_at:'2026-08-16T10:04:00Z'},
    {id:'E6',type:'DEAL_CLOSED',deal_id:'D1',amount:42000000,currency:'ARS',occurred_at:'2026-08-16T10:05:00Z'}
  ]});
  const result=service.adminOverview({role:'ADMIN'});
  assert.equal(result.sections.VENTAS.sales_listings_active.value,12);
  assert.equal(result.sections.VENTAS.sales_listings_created.value,1);
  assert.equal(result.sections.VENTAS.sales_inquiries.value,2);
  assert.equal(result.sections.VENTAS.sales_contacts_whatsapp.value,1);
  assert.equal(result.sections.VENTAS.sales_services_purchased.value,1);
  assert.equal(result.sections.VENTAS.sales_deals_closed.value,1);
  assert.equal(result.sections.VENTAS.sales_gmv.value,42000000);
  assert.equal(result.sections.VENTAS.sales_conversion_rate.value,50);
});

test('reintento de evento de venta no duplica métricas',()=>{
  const store=new MemoryControlStore();
  const service=createControlService({store});
  const recordFact=fact=>service.recordFact({role:'ADMIN',fact});
  const event={id:'DUP-1',type:'INQUIRY_CREATED',inquiry_id:'I1',occurred_at:'2026-08-16T10:00:00Z'};
  ingestVentasEvents({recordFact,events:[event,event]});
  const result=service.adminOverview({role:'ADMIN'});
  assert.equal(result.sections.VENTAS.sales_inquiries.value,1);
});
