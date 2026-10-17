export async function buildContinuousMovePlan({vehicle,currentLoad=null,candidateLoads=[],distanceResolver,now=new Date(),maxLegs=3,maxEmptyKm=250}={}){
  if(!vehicle?.id) throw new Error('vehicle es obligatorio');
  if(!distanceResolver) throw new Error('distanceResolver es obligatorio');
  const remaining=[...candidateLoads];
  const legs=[];
  let position=availabilityPoint(vehicle,currentLoad);
  let availableAt=new Date(currentLoad?.expected_unload_at||vehicle.available_at||now);
  let totalEmptyKm=0,totalLoadedKm=0,totalRevenue=0,totalVariableCost=0;

  while(legs.length<maxLegs&&remaining.length){
    const scored=[];
    for(const load of remaining){
      if(!compatible(vehicle,load)) continue;
      const empty=Number(await distanceResolver({from:position,to:load.origin_location||load.origin,vehicle,load,type:'EMPTY'}));
      if(!Number.isFinite(empty)||empty<0||empty>maxEmptyKm) continue;
      const pickup=new Date(load.pickup_at||availableAt);
      const waitHours=Math.max(0,(pickup-availableAt)/3600000);
      const loadedKm=Number(load.loaded_route_km||0);
      const revenue=Number(load.price_amount||0);
      const variable=Number(load.variable_cost||load.estimated_variable_cost||0);
      const contribution=revenue-variable;
      const score=round(100-Math.min(45,empty*.15)-Math.min(25,waitHours*3)+Math.min(20,Math.max(0,contribution)/100000),2);
      scored.push({load,empty_km:round(empty,1),wait_hours:round(waitHours,2),loaded_km:Number.isFinite(loadedKm)?loadedKm:0,revenue:Number.isFinite(revenue)?revenue:0,variable_cost:Number.isFinite(variable)?variable:0,score});
    }
    scored.sort((a,b)=>b.score-a.score||a.empty_km-b.empty_km);
    const best=scored[0]; if(!best) break;
    legs.push({...best,sequence:legs.length+1});
    totalEmptyKm+=best.empty_km; totalLoadedKm+=best.loaded_km; totalRevenue+=best.revenue; totalVariableCost+=best.variable_cost;
    availableAt=new Date(best.load.expected_unload_at||best.load.delivery_at||best.load.pickup_at||availableAt);
    position=best.load.destination_location||best.load.destination||position;
    remaining.splice(remaining.findIndex(x=>x===best.load),1);
  }
  const totalKm=totalEmptyKm+totalLoadedKm;
  return {vehicle_id:vehicle.id,legs,total_empty_km:round(totalEmptyKm,1),total_loaded_km:round(totalLoadedKm,1),empty_km_percent:totalKm?round((totalEmptyKm/totalKm)*100,2):0,total_revenue:round(totalRevenue,2),total_variable_cost:round(totalVariableCost,2),preliminary_contribution:round(totalRevenue-totalVariableCost,2),status:legs.length?'PLAN_FOUND':'NO_PLAN'};
}
function compatible(vehicle,load){if(load.traffic_light&&load.traffic_light!=='GREEN')return false;if(vehicle.equipment_type&&load.equipment_required&&vehicle.equipment_type!==load.equipment_required)return false;if(vehicle.capacity_tn!=null&&load.weight_tn!=null&&Number(load.weight_tn)>Number(vehicle.capacity_tn))return false;return true;}
function availabilityPoint(vehicle,currentLoad){return currentLoad?.destination_location||currentLoad?.destination||vehicle.expected_available_location||vehicle.location||null;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
