const APPROVED=new Set(['APPROVED','AUTHORIZED']);
const PENDING=new Set(['PENDING','IN_PROCESS','IN_MEDIATION']);
const REJECTED=new Set(['REJECTED','CANCELLED','REFUNDED','CHARGED_BACK']);

export function mercadoPagoPaymentToControlFacts(payment={}){
 const id=String(payment.id||payment.payment_id||'').trim();
 if(!id) throw new Error('payment id obligatorio');
 const status=String(payment.status||'').toUpperCase();
 const amount=numberOrNull(payment.transaction_amount??payment.amount);
 const currency=payment.currency_id||payment.currency||'ARS';
 const occurred=payment.date_approved||payment.date_last_updated||payment.occurred_at||new Date().toISOString();
 const product=payment.external_reference||payment.metadata?.product||payment.metadata?.service||null;
 const common={entity_type:'PAYMENT',entity_id:id,currency,occurred_at:occurred,dimensions:{provider:'MERCADO_PAGO',product,service:payment.metadata?.service||null,country:payment.metadata?.country||null}};
 if(APPROVED.has(status)) return [
  {module:'REVENUE',source_event_id:`mp:${id}:confirmed`,event_type:'PAYMENT_CONFIRMED',...common},
  {module:'REVENUE',source_event_id:`mp:${id}:revenue`,event_type:'REVENUE_RECORDED',value:amount||0,...common},
  {module:'REVENUE',source_event_id:`mp:${id}:gmv`,event_type:'GMV_RECORDED',value:amount||0,...common}
 ];
 if(PENDING.has(status)) return [{module:'REVENUE',source_event_id:`mp:${id}:pending`,event_type:'PAYMENT_PENDING',...common}];
 if(REJECTED.has(status)) return [{module:'REVENUE',source_event_id:`mp:${id}:rejected`,event_type:'PAYMENT_REJECTED',...common}];
 return [];
}

export function ingestMercadoPagoPayments({payments=[],controlService,role='ADMIN'}={}){
 if(!controlService) throw new Error('controlService obligatorio');
 let recorded=0;
 for(const payment of payments){for(const fact of mercadoPagoPaymentToControlFacts(payment)){controlService.recordFact({role,fact});recorded++;}}
 return {payments:payments.length,facts_recorded:recorded};
}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}
