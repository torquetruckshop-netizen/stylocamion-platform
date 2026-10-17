export function webEventToControlFacts(event={}){
 const type=String(event.type||event.event_type||'').toUpperCase();
 const id=String(event.event_id||event.id||'').trim();
 if(!id) throw new Error('event_id obligatorio');
 const at=event.occurred_at||event.timestamp||new Date().toISOString();
 const session=event.session_id?String(event.session_id):null;
 const visitor=event.visitor_id?String(event.visitor_id):null;
 const moduleName=normalizeModule(event.module_name||event.module||event.section||event.path);
 const common={module:'AUDIENCE',source_event_id:`web:${id}`,occurred_at:at,country:event.country||null,dimensions:{visitor_id:visitor,module_name:moduleName,source:event.source||null,medium:event.medium||null,campaign:event.campaign||null,device:event.device||null}};
 if(type==='SESSION_START'||type==='WEB_SESSION') return [{...common,event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:session||id}];
 if(type==='PAGE_VIEW'||type==='MODULE_VIEW') return [{...common,event_type:'MODULE_VIEW',entity_type:'SESSION',entity_id:session||id}];
 if(type==='COMMERCIAL_ACTION'||type==='CTA_CLICK'||type==='WHATSAPP_CLICK'||type==='PAYMENT_CLICK') return [{...common,event_type:'COMMERCIAL_ACTION',entity_type:'SESSION',entity_id:session||id,channel:type==='WHATSAPP_CLICK'?'WHATSAPP':null,dimensions:{...common.dimensions,action:type}}];
 return [];
}

export function ingestWebAudienceEvents({events=[],controlService,role='ADMIN'}={}){
 if(!controlService) throw new Error('controlService obligatorio');
 let recorded=0;for(const event of events){for(const fact of webEventToControlFacts(event)){controlService.recordFact({role,fact});recorded++;}}
 return {events:events.length,facts_recorded:recorded};
}

function normalizeModule(value){const text=String(value||'').toUpperCase();if(text.includes('CARG'))return'CARGAS';if(text.includes('VENT'))return'VENTAS';if(text.includes('NOTIC')||text.includes('BLOG'))return'NOTICIAS';if(text.includes('EVENT')||text.includes('FERIA'))return'EVENTO';if(text.includes('CLUB'))return'CLUB';return text||'HOME';}
