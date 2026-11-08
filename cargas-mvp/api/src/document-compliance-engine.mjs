export function evaluateOperationDocuments({requirements=[],documents=[],now=new Date()}={}){
 const byType=new Map(documents.map(d=>[String(d.type||'').toUpperCase(),d]));
 const checks=requirements.map(req=>{
  const type=String(req.type||'').toUpperCase();const doc=byType.get(type);const reasons=[];
  if(!doc)reasons.push('MISSING');
  if(doc?.status&&String(doc.status).toUpperCase()!=='VALID')reasons.push('NOT_VALID');
  if(doc?.expires_at&&new Date(doc.expires_at)<new Date(now))reasons.push('EXPIRED');
  if(req.verified_required&&doc?.verified!==true)reasons.push('NOT_VERIFIED');
  return{type,required:req.required!==false,document_id:doc?.id||null,ok:reasons.length===0,reasons};
 });
 const blocking=checks.filter(x=>x.required&&!x.ok);
 return{status:blocking.length?'BLOCKED':'CLEAR',checks,blocking_count:blocking.length,missing_types:blocking.map(x=>x.type),can_load:blocking.length===0};
}

export function documentRequirementsForOperation({country='AR',cargoType='',equipmentType='',hazardous=false,refrigerated=false}={}){
 const req=[
  {type:'VEHICLE_REGISTRATION',required:true,verified_required:true},
  {type:'INSURANCE',required:true,verified_required:true},
  {type:'DRIVER_LICENSE',required:true,verified_required:true}
 ];
 if(hazardous)req.push({type:'HAZMAT_AUTHORIZATION',required:true,verified_required:true});
 if(refrigerated)req.push({type:'COLD_CHAIN_CERTIFICATE',required:true,verified_required:false});
 if(String(cargoType).toLowerCase().includes('grain')||String(cargoType).toLowerCase().includes('cereal'))req.push({type:'CARGO_DOCUMENT',required:true,verified_required:false});
 return{country,equipment_type:equipmentType||null,requirements:req,rule_version:'document-compliance-v1',legal_review_required:true};
}
