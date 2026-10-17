const EVENT_MAP=Object.freeze({
  LISTING_CREATED:'SALES_LISTING_CREATED',
  LISTINGS_ACTIVE:'SALES_LISTINGS_ACTIVE',
  INQUIRY_CREATED:'SALES_INQUIRY',
  SERVICE_PURCHASED:'SALES_SERVICE_PURCHASED',
  DEAL_CLOSED:'SALES_DEAL_CLOSED'
});

export function ventasEventToControlFacts(event={}) {
  const type=String(event.type || event.event_type || '').toUpperCase();
  const mapped=EVENT_MAP[type];
  if (!mapped) return [];
  const occurredAt=event.occurred_at || event.created_at || new Date().toISOString();
  const sourceEventId=event.source_event_id || event.id || `${type}:${event.entity_id || event.listing_id || occurredAt}`;
  const entityId=event.entity_id || event.listing_id || event.inquiry_id || event.deal_id || event.service_id || sourceEventId;
  const channel=event.channel ? String(event.channel).toUpperCase() : null;
  const base={
    module:'VENTAS',
    source_event_id:String(sourceEventId),
    event_type:mapped,
    entity_type:entityTypeFor(mapped),
    entity_id:String(entityId),
    value:event.value == null ? (event.amount == null ? null : Number(event.amount)) : Number(event.value),
    currency:event.currency || null,
    status:event.status || null,
    channel,
    country:event.country || null,
    occurred_at:occurredAt,
    dimensions:{
      service_type:event.service_type || null,
      listing_type:event.listing_type || null,
      lead_source:event.lead_source || channel || null,
      vehicle_category:event.vehicle_category || null
    }
  };
  return [base];
}

export function ingestVentasEvents({events=[],recordFact}={}) {
  if (typeof recordFact!=='function') throw new Error('recordFact es obligatorio');
  const facts=[];
  for (const event of events) {
    for (const fact of ventasEventToControlFacts(event)) facts.push(recordFact(fact));
  }
  return facts;
}

function entityTypeFor(eventType){
  if (eventType==='SALES_INQUIRY') return 'INQUIRY';
  if (eventType==='SALES_SERVICE_PURCHASED') return 'SERVICE';
  if (eventType==='SALES_DEAL_CLOSED') return 'DEAL';
  return 'LISTING';
}
