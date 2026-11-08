const REQUIRED=['brand','model','year','price_amount','country','location','description'];
export function evaluateListingQuality(listing={}){
  const missing=REQUIRED.filter(k=>listing[k]==null||String(listing[k]).trim()==='');
  const photos=Array.isArray(listing.photos)?listing.photos.length:Number(listing.photo_count||0);
  const docs=Array.isArray(listing.documents)?listing.documents.length:Number(listing.document_count||0);
  let score=100-missing.length*8;
  if(photos<4)score-=18;else if(photos<8)score-=8;
  const descriptionLength=String(listing.description||'').length;if(descriptionLength<100)score-=10;
  if(!listing.specs||Object.keys(listing.specs).length<4)score-=12;
  if(docs===0)score-=8;
  if(!listing.contact_channel)score-=8;
  score=Math.max(0,Math.min(100,Math.round(score)));
  const recommendations=[];
  if(missing.length)recommendations.push(`Completar: ${missing.join(', ')}`);
  if(photos<8)recommendations.push('Subir al menos 8 fotos claras: frente, laterales, cabina, chasis, neumáticos y tablero.');
  if(descriptionLength<100)recommendations.push('Agregar una descripción técnica más completa.');
  if(!listing.specs||Object.keys(listing.specs).length<4)recommendations.push('Completar potencia, configuración, kilometraje, caja y equipamiento.');
  if(docs===0)recommendations.push('Agregar documentación/verificación disponible.');
  return{quality_score:score,grade:score>=90?'A':score>=75?'B':score>=60?'C':'D',missing_fields:missing,recommendations,ready_for_featured:score>=80&&photos>=6};
}
