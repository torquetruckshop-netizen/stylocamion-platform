export function answerFleetQuestion({question,vehicles=[]}={}){
 const text=normalize(question);
 if(text.includes('consum')||text.includes('gasto'))return rank(vehicles,'consumption_l_per_100km','DESC','Consumo L/100 km');
 if(text.includes('ralenti')||text.includes('ralentí'))return rank(vehicles,'avoidable_idle_minutes','DESC','Ralentí evitable');
 if(text.includes('km')&&text.includes('recorr'))return rank(vehicles,'distance_km','DESC','Kilómetros recorridos');
 if(text.includes('mantenimiento')||text.includes('service'))return vehicles.filter(v=>['ACTION_REQUIRED','ATTENTION'].includes(v.maintenance_status)).map(v=>({vehicle_id:v.id,value:v.maintenance_status,label:'Mantenimiento'}));
 if(text.includes('disponible')||text.includes('disponibilidad'))return vehicles.filter(v=>v.availability==='AVAILABLE').map(v=>({vehicle_id:v.id,value:v.expected_available_location||v.location||null,label:'Disponible'}));
 return{status:'NEEDS_CLARIFICATION',message:'Consulta de flota no reconocida'};
}
function rank(vehicles,field,direction,label){const rows=vehicles.map(v=>({vehicle_id:v.id,value:numberOrNull(v[field]),label})).filter(x=>x.value!=null).sort((a,b)=>direction==='DESC'?b.value-a.value:a.value-b.value);return{status:'ANSWERED',metric:field,rows};}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}
