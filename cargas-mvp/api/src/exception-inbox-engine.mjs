export function buildExceptionInbox(events=[]){
 const dedupe=new Map();
 for(const event of events){
  const item=normalize(event);if(!item)continue;const key=item.dedupe_key||`${item.type}:${item.load_id||''}:${item.vehicle_id||''}`;
  const previous=dedupe.get(key);if(!previous||severityWeight(item.severity)>severityWeight(previous.severity)||new Date(item.observed_at)>new Date(previous.observed_at))dedupe.set(key,item);
 }
 return [...dedupe.values()].filter(x=>x.status!=='RESOLVED').sort((a,b)=>severityWeight(b.severity)-severityWeight(a.severity)||new Date(b.observed_at)-new Date(a.observed_at)).map((x,index)=>({...x,queue_position:index+1,next_action:actionFor(x)}));
}
export function summarizeExceptionInbox(items=[]){return{total:items.length,critical:items.filter(x=>x.severity==='CRITICAL').length,warning:items.filter(x=>x.severity==='WARNING').length,oldest_open_at:items.length?[...items].sort((a,b)=>new Date(a.observed_at)-new Date(b.observed_at))[0].observed_at:null};}
function normalize(e){if(!e?.type)return null;return{type:e.type,severity:String(e.severity||'WARNING').toUpperCase(),status:String(e.status||'OPEN').toUpperCase(),load_id:e.load_id||null,vehicle_id:e.vehicle_id||null,detail:e.detail||null,value:e.value??null,observed_at:e.observed_at||new Date().toISOString(),dedupe_key:e.dedupe_key||null};}
function actionFor(x){if(x.type==='VEHICLE_FAULT'||x.type==='TEMPERATURE_EXCEPTION')return'CONTACT_AND_RESOLVE_NOW';if(x.type.includes('ETA_DELAY'))return'REPLAN_AND_NOTIFY';if(x.type.includes('DWELL'))return'CONTACT_FACILITY_OR_DRIVER';if(x.type.includes('FUEL'))return'REVIEW_FUEL_EVENT';if(x.type.includes('GPS'))return'CHECK_TRACKING_SOURCE';return x.severity==='CRITICAL'?'RESOLVE_NOW':'REVIEW';}
function severityWeight(s){return s==='CRITICAL'?3:s==='WARNING'?2:1;}
