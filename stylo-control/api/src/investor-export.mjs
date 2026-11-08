import crypto from 'node:crypto';

export function buildInvestorExport({snapshot,generatedBy='STYLO_CONTROL',expiresAt=null}={}){
 if(!snapshot||snapshot.view!=='INVESTOR') throw new Error('snapshot Investor obligatorio');
 const payload={
  schema:'stylo-investor-export-v1',
  generated_by:generatedBy,
  generated_at:snapshot.generated_at||new Date().toISOString(),
  expires_at:expiresAt||null,
  catalog_version:snapshot.catalog_version,
  range:snapshot.range,
  privacy:'AGGREGATED_ONLY',
  sections:snapshot.sections||{}
 };
 return {...payload,checksum:checksum(payload)};
}

export function verifyInvestorExport(document={}){
 const {checksum:expected,...payload}=document;
 return Boolean(expected)&&expected===checksum(payload)&&payload.privacy==='AGGREGATED_ONLY';
}
function checksum(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
