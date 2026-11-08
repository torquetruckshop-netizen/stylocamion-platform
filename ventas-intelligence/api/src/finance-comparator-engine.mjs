export function estimateFinancing({price,downPayment=0,annualRatePercent,months,fees=0,currency='ARS'}={}){
 const principal=Math.max(0,Number(price)-Number(downPayment)+Number(fees||0));const n=Number(months),annual=Number(annualRatePercent);
 if(!(principal>=0)||!(n>0)||!Number.isFinite(annual))return{status:'INVALID_INPUT'};
 const monthly=annual/100/12;const payment=monthly===0?principal/n:principal*(monthly*(1+monthly)**n)/((1+monthly)**n-1);
 const total=payment*n+Number(downPayment||0);
 return{status:'ESTIMATE',principal:round(principal),monthly_payment:round(payment),months:n,annual_rate_percent:annual,total_estimated_paid:round(total),financing_cost:round(total-Number(price)),currency,disclaimer:'ESTIMACIÓN_NO_OFERTA'};
}

export function compareVehicles(vehicles=[]){
 const fields=['year','km','power_hp','torque_nm','gvw_kg','payload_kg','engine_displacement_l','fuel_tank_l','price_amount'];
 return fields.map(field=>{
  const values=vehicles.map(v=>({id:v.id,value:numberOrNull(v[field])})).filter(x=>x.value!=null);
  if(!values.length)return null;
  const direction=['km','price_amount'].includes(field)?'LOWER_BETTER':'HIGHER_BETTER';
  const best=[...values].sort((a,b)=>direction==='LOWER_BETTER'?a.value-b.value:b.value-a.value)[0];
  return{field,direction,best_vehicle_id:best.id,values};
 }).filter(Boolean);
}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
