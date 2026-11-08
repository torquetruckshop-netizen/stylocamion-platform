import { cargasEventToControlFacts } from './cargas-control-adapter.mjs';

export function createCargasIngestionService({controlService,now=()=>new Date(),staleAfterMinutes=30}={}){
  if(!controlService) throw new Error('controlService es obligatorio');
  let lastReceivedAt=null;

  return {
    ingest({role='ADMIN',events=[]}={}){
      if(!Array.isArray(events)) throw new Error('events debe ser array');
      const recorded=[];
      let duplicates=0;
      for(const event of events){
        for(const fact of cargasEventToControlFacts(event)){
          const before=fact.source_event_id;
          const saved=controlService.recordFact({role,fact});
          recorded.push(saved);
          if(before && saved?.source_event_id===before && saved?.duplicate===true) duplicates++;
        }
      }
      if(events.length){
        lastReceivedAt=new Date(now()).toISOString();
        controlService.updateModuleHealth({role,health:{module:'CARGAS',status:'HEALTHY',detail:`${events.length} eventos recibidos`,last_success_at:lastReceivedAt,checked_at:lastReceivedAt}});
      }
      return {events_received:events.length,facts_processed:recorded.length,duplicates,last_received_at:lastReceivedAt};
    },

    heartbeat({role='ADMIN'}={}){
      const checkedAt=new Date(now());
      let status='UNKNOWN'; let detail='Aún no se recibieron eventos de Cargas';
      if(lastReceivedAt){
        const age=(checkedAt-new Date(lastReceivedAt))/60000;
        status=age>staleAfterMinutes?'DEGRADED':'HEALTHY';
        detail=status==='HEALTHY'?`Último evento hace ${Math.round(age)} min`:`Sin eventos de Cargas hace ${Math.round(age)} min`;
      }
      return controlService.updateModuleHealth({role,health:{module:'CARGAS',status,detail,last_success_at:lastReceivedAt,checked_at:checkedAt.toISOString()}});
    }
  };
}
