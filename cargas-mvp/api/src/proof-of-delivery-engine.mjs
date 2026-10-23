import crypto from 'node:crypto';

export function buildProofOfDelivery({loadId,vehicleId=null,deliveredAt=new Date(),location=null,evidence=[],receiver=null,notes=null}={}){
 if(!loadId)throw new Error('loadId obligatorio');
 const pod={
  pod_id:crypto.randomUUID(),load_id:loadId,vehicle_id:vehicleId,
  delivered_at:new Date(deliveredAt).toISOString(),
  location:normalizeLocation(location),
  evidence:(evidence||[]).map(normalizeEvidence),
  receiver:normalizeReceiver(receiver),notes:notes||null,
  legal_status:'OPERATIONAL_EVIDENCE_ONLY',
  created_at:new Date().toISOString()
 };
 return{...pod,checksum:checksum(pod)};
}

export function verifyProofOfDelivery(pod={}){
 const {checksum:stored,...body}=pod;
 const current=checksum(body);
 const issues=[];
 if(!stored||stored!==current)issues.push('CHECKSUM_MISMATCH');
 if(!pod.delivered_at)issues.push('DELIVERY_TIME_MISSING');
 if(!(pod.evidence||[]).length)issues.push('EVIDENCE_MISSING');
 return{valid:issues.length===0,issues,checksum_match:stored===current,legal_status:pod.legal_status||'UNKNOWN'};
}

export function buildDeliveryEvidence({type,reference,observedAt=new Date(),metadata={}}={}){
 if(!type||!reference)throw new Error('type y reference obligatorios');
 return normalizeEvidence({type,reference,observed_at:observedAt,metadata});
}

function normalizeEvidence(e={}){return{type:String(e.type||'DOCUMENT').toUpperCase(),reference:String(e.reference||e.file_reference||''),observed_at:new Date(e.observed_at||e.observedAt||Date.now()).toISOString(),metadata:safeMetadata(e.metadata||{})};}
function normalizeReceiver(r){if(!r)return null;return{role:r.role||null,name_reference:r.name_reference||null,organization_reference:r.organization_reference||null,confirmation_method:r.confirmation_method||'MANUAL'};}
function normalizeLocation(l){if(!l)return null;const lat=Number(l.lat),lon=Number(l.lon);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon,source:l.source||'MANUAL'}:null;}
function safeMetadata(m){const blocked=new Set(['dni','document_number','phone','email','token','secret']);return Object.fromEntries(Object.entries(m).filter(([k])=>!blocked.has(String(k).toLowerCase())));}
function checksum(value){return crypto.createHash('sha256').update(stable(value)).digest('hex');}
function stable(value){if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;return JSON.stringify(value);}
