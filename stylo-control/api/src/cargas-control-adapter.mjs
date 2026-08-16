const EVENT_MAP=Object.freeze({
  LOAD_CREATED:'LOAD_DETECTED',
  INTAKE_CLASSIFIED:'LOAD_DETECTED',
  AI_MATCH_DECISION:'LOAD_MATCHED',
  LOAD_MATCHED:'LOAD_MATCHED',
  LOAD_AWARDED:'LOAD_AWARDED',
  LOAD_ASSIGNED:'LOAD_AWARDED',
  LOAD_COMPLETED:'LOAD_COMPLETED',
  LOAD_DELIVERED:'LOAD_COMPLETED',
  EMPTY_KM_AVOIDED:'EMPTY_KM_AVOIDED',
  AI_EXCEPTION:'AI_EXCEPTION',
  AI_REVIEW_REQUIRED:'AI_EXCEPTION'
});

export function cargasEventToControlFacts(event={}){
  const type=String(event.type || event.event_type || '').toUpperCase();
  const occurredAt=event.created_at || event.occurred_at || new Date().toISOString();
  const loadId=event.load_id || event.public_id || event.entity_id || null;
  const payload=event.payload || {};
  const channel=String(payload.channel || event.channel || '').toUpperCase() || null;
  const facts=[];

  const mapped=EVENT_MAP[type];
  if (mapped) facts.push(baseFact({event,type:mapped,occurredAt,loadId,channel,payload}));

  if (type==='AI_MATCH_DECISION') {
    facts.push({
      ...baseFact({event,type:'AI_DECISION',occurredAt,loadId,channel,payload}),
      source_event_id:sourceId(event,'AI_DECISION')
    });
    const emptyKm=numberOrNull(payload.empty_km_avoided ?? payload.avoided_empty_km);
    if (emptyKm!=null && emptyKm>0) facts.push({
      ...baseFact({event,type:'EMPTY_KM_AVOIDED',occurredAt,loadId,channel,payload}),
      source_event_id:sourceId(event,'EMPTY_KM_AVOIDED'),
      value:emptyKm
    });
  }

  if (['AUDIO_TRANSCRIBED','AI_AUDIO_TRANSCRIBED'].includes(type)) facts.push({
    ...baseFact({event,type:'AI_AUDIO_TRANSCRIBED',occurredAt,loadId,channel,payload}),
    source_event_id:sourceId(event,'AI_AUDIO_TRANSCRIBED')
  });

  if (['INTAKE_CLASSIFIED','AI_MESSAGE_PROCESSED'].includes(type)) facts.push({
    ...baseFact({event,type:'AI_MESSAGE_PROCESSED',occurredAt,loadId,channel,payload}),
    source_event_id:sourceId(event,'AI_MESSAGE_PROCESSED')
  });

  return dedupeFacts(facts);
}

function baseFact({event,type,occurredAt,loadId,channel,payload}){
  return {
    module:type.startsWith('AI_') ? 'AI' : 'CARGAS',
    event_type:type,
    entity_type:'LOAD',
    entity_id:loadId,
    source_event_id:sourceId(event,type),
    channel:channel || inferChannel(event,payload),
    country:payload.country_code || payload.country || event.country || null,
    occurred_at:new Date(occurredAt).toISOString(),
    dimensions:{
      source:String(event.source || payload.source || '').toUpperCase() || undefined,
      network_level:payload.network_level || undefined,
      decision_status:payload.status || payload.decision_status || undefined
    }
  };
}

function sourceId(event,suffix){
  const id=event.id || event.event_id || event.external_event_id || [event.load_id,event.type,event.created_at].filter(Boolean).join(':');
  return id ? `${id}:${suffix}` : null;
}
function inferChannel(event,payload){
  const source=String(event.source || payload.source || '').toUpperCase();
  return source.includes('WHATSAPP') ? 'WHATSAPP' : null;
}
function numberOrNull(value){ const n=Number(value); return Number.isFinite(n)?n:null; }
function dedupeFacts(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=item.source_event_id || JSON.stringify([item.event_type,item.entity_id,item.occurred_at]);
    if(seen.has(key)) return false; seen.add(key); return true;
  });
}
