import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryControlStore} from '../src/control-store.mjs';
import {createControlService} from '../src/control-service.mjs';
import {ingestMercadoPagoPayments} from '../src/adapters/mercadopago-control-adapter.mjs';

test('pago aprobado registra confirmación ingreso y GMV sin duplicar reintentos',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 const payment={id:'MP-1',status:'approved',transaction_amount:65000,currency_id:'ARS',date_approved:'2026-08-16T12:00:00Z',external_reference:'PUBLICACION_DESTACADA'};
 ingestMercadoPagoPayments({payments:[payment,payment],controlService:service});
 const overview=service.adminOverview({role:'ADMIN'});
 assert.equal(overview.sections.REVENUE.payments_confirmed.value,1);
 assert.equal(overview.sections.REVENUE.gross_revenue.value,65000);
 assert.equal(overview.sections.REVENUE.gmv.value,65000);
});

test('pendientes y rechazados alimentan embudo y tasa de aprobación',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestMercadoPagoPayments({payments:[
  {id:'1',status:'approved',transaction_amount:100},
  {id:'2',status:'rejected',transaction_amount:100},
  {id:'3',status:'pending',transaction_amount:100}
 ],controlService:service});
 const overview=service.adminOverview({role:'ADMIN'});
 assert.equal(overview.sections.REVENUE.payments_confirmed.value,1);
 assert.equal(overview.sections.REVENUE.payments_rejected.value,1);
 assert.equal(overview.sections.REVENUE.payments_pending.value,1);
 assert.equal(overview.sections.REVENUE.payment_approval_rate.value,50);
});

test('Investor View ve GMV pero no ingreso neto ni estado de cobros',()=>{
 const store=new MemoryControlStore();const service=createControlService({store});
 ingestMercadoPagoPayments({payments:[{id:'1',status:'approved',transaction_amount:350000}],controlService:service});
 const investor=service.investorSnapshot({role:'INVESTOR'});
 assert.equal(investor.sections.REVENUE.gmv.value,350000);
 assert.equal('gross_revenue' in investor.sections.REVENUE,false);
 assert.equal('payments_confirmed' in investor.sections.REVENUE,false);
});
