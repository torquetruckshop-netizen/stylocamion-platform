export function buildShipmentDigitalTwin({load,vehicle=null,carrier=null,documents=null,economics=null,telematics=null,eta=null,exceptions=[],facility=null,trust=null,pod=null,now=new Date()}={}){
 if(!load?.id)throw new Error('load obligatorio');
 const twin={
  twin_version:'shipment-digital-twin-v1',
  load_id:load.id,
  operational_state:load.status||'UNKNOWN',
  route:{origin:location(load,'origin'),destination:location(load,'destination')},
  cargo:{type:load.cargo_type||null,weight_tn:num(load.weight_tn),equipment_required:load.equipment_required||null},
  vehicle:vehicle?{id:vehicle.id,plate_reference:vehicle.plate_reference||null,equipment_type:vehicle.equipment_type||null,availability:vehicle.availability||null,location:vehicle.location||null}:null,
  carrier:carrier?{id:carrier.id,trust_score:trust?.trust_score??null,trust_tier:trust?.tier??null}:null,
  compliance:documents||null,
  economics:economics||null,
  telemetry:telematics||null,
  eta:eta||null,
  facility:facility?{risk:facility.risk||'UNKNOWN',average_rating:facility.average_rating??null,median_wait_minutes:facility.median_wait_minutes??null}:null,
  exceptions:(exceptions||[]).filter(x=>x.status!=='RESOLVED'),
  delivery:pod?{pod_id:pod.pod_id,delivered_at:pod.delivered_at,checksum:pod.checksum,legal_status:pod.legal_status}:null,
  updated_at:new Date(now).toISOString()
 };
 twin.health=deriveHealth(twin);
 twin.next_actions=deriveActions(twin);
 return twin;
}

export function deriveShipmentTwinEvent(previous,current){
 if(!previous)return{type:'TWIN_CREATED',changes:['ALL']};
 const changes=[];
 for(const key of ['operational_state','health'])if(JSON.stringify(previous[key])!==JSON.stringify(current[key]))changes.push(key);
 if(JSON.stringify(previous.eta)!==JSON.stringify(current.eta))changes.push('eta');
 if(JSON.stringify(previous.exceptions)!==JSON.stringify(current.exceptions))changes.push('exceptions');
 if(JSON.stringify(previous.economics)!==JSON.stringify(current.economics))changes.push('economics');
 return{type:changes.length?'TWIN_UPDATED':'NO_CHANGE',changes};
}
function deriveHealth(t){if(t.exceptions.some(x=>x.severity==='CRITICAL'))return'CRITICAL';if(t.compliance?.status==='BLOCKED')return'BLOCKED';if(t.exceptions.length)return'ATTENTION';if(t.eta?.status==='UNAVAILABLE')return'INCOMPLETE';return'HEALTHY';}
function deriveActions(t){const out=[];if(t.compliance?.status==='BLOCKED')out.push('RESOLVE_DOCUMENTS');if(t.exceptions.some(x=>x.severity==='CRITICAL'))out.push('RESOLVE_CRITICAL_EXCEPTION');if(t.operational_state==='ENTREGADA'&&!t.delivery)out.push('CAPTURE_POD');if(t.operational_state==='EN_TRANSITO'&&t.eta?.status==='UNAVAILABLE')out.push('RESTORE_TRACKING_OR_ETA');return out;}
function location(l,p){return{name:l[`${p}`]||null,lat:num(l[`${p}_lat`]),lon:num(l[`${p}_lon`]),confidence:num(l[`${p}_location_confidence`])};}function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
