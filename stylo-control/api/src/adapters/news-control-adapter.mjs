export function newsEventToControlFacts(event={}){
 const type=String(event.type||event.event_type||'').toUpperCase();
 const id=String(event.event_id||event.id||'').trim();
 if(!id) throw new Error('event_id obligatorio');
 const articleId=String(event.article_id||event.news_id||event.slug||'').trim()||null;
 const at=event.occurred_at||event.timestamp||new Date().toISOString();
 const common={module:'NOTICIAS',source_event_id:`news:${id}`,entity_type:'ARTICLE',entity_id:articleId||id,occurred_at:at,country:event.country||null,dimensions:{topic:event.topic||null,source:event.source||null,author:event.author||null,target:normalizeTarget(event.target||event.destination||null),campaign:event.campaign||null}};
 if(type==='ARTICLE_PUBLISHED'||type==='NEWS_ARTICLE_PUBLISHED') return [{...common,event_type:'NEWS_ARTICLE_PUBLISHED'}];
 if(type==='ARTICLE_VIEW'||type==='NEWS_ARTICLE_VIEW') return [{...common,event_type:'NEWS_ARTICLE_VIEW'}];
 if(type==='ARTICLE_ENGAGED'||type==='NEWS_ARTICLE_ENGAGED'||type==='READ_50'||type==='READ_75'||type==='READ_COMPLETE') return [{...common,event_type:'NEWS_ARTICLE_ENGAGED'}];
 if(type==='COMMERCIAL_CLICK'||type==='NEWS_COMMERCIAL_CLICK'||type==='CTA_CLICK') return [{...common,event_type:'NEWS_COMMERCIAL_CLICK',channel:event.channel||null}];
 return [];
}

export function ingestNewsEvents({events=[],controlService,role='ADMIN'}={}){
 if(!controlService) throw new Error('controlService obligatorio');
 let recorded=0;
 for(const event of events){for(const fact of newsEventToControlFacts(event)){controlService.recordFact({role,fact});recorded++;}}
 return {events:events.length,facts_recorded:recorded};
}

function normalizeTarget(value){const t=String(value||'').toUpperCase();if(t.includes('VENT'))return'VENTAS';if(t.includes('CARG'))return'CARGAS';if(t.includes('WHATS'))return'WHATSAPP';if(t.includes('PAGO')||t.includes('PAY'))return'PAYMENT';return t||null;}
