export function estimateVehicleTco(input={}){
 const years=Math.max(1,Number(input.years)||3),annualKm=Math.max(0,Number(input.annual_km)||0),purchase=Math.max(0,Number(input.purchase_price)||0);
 const fuelConsumption=Math.max(0,Number(input.fuel_consumption_l_per_100km)||0),fuelPrice=Math.max(0,Number(input.fuel_price_per_liter)||0);
 const maintenancePerKm=Math.max(0,Number(input.maintenance_cost_per_km)||0),insurance=Math.max(0,Number(input.insurance_per_year)||0),taxes=Math.max(0,Number(input.taxes_per_year)||0),other=Math.max(0,Number(input.other_costs_per_year)||0);
 const residual=Math.max(0,Number(input.residual_value)||0),financing=Math.max(0,Number(input.financing_cost_total)||0);
 const totalKm=annualKm*years;
 const fuelLiters=totalKm*fuelConsumption/100;
 const fuelCost=fuelLiters*fuelPrice;
 const maintenance=totalKm*maintenancePerKm;
 const recurring=(insurance+taxes+other)*years;
 const depreciation=Math.max(0,purchase-residual);
 const total=depreciation+financing+fuelCost+maintenance+recurring;
 return{status:'ESTIMATE',years,annual_km:annualKm,total_km:round(totalKm,0),purchase_price:purchase,residual_value:residual,depreciation:round(depreciation),financing_cost:round(financing),fuel_liters:round(fuelLiters,1),fuel_cost:round(fuelCost),maintenance_cost:round(maintenance),insurance_tax_other:round(recurring),total_cost_of_ownership:round(total),tco_per_km:totalKm?round(total/totalKm,2):null,currency:input.currency||'ARS',assumptions:{fuel_consumption_l_per_100km:fuelConsumption,fuel_price_per_liter:fuelPrice,maintenance_cost_per_km:maintenancePerKm},disclaimer:'ESTIMACIÓN_TCO_NO_GARANTIZA_COSTOS_FUTUROS'};
}
export function compareVehicleTco(items=[]){return items.filter(x=>x?.vehicle_id&&x?.tco).map(x=>({vehicle_id:x.vehicle_id,...x.tco})).sort((a,b)=>Number(a.total_cost_of_ownership)-Number(b.total_cost_of_ownership)).map((x,i)=>({...x,rank:i+1}));}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
