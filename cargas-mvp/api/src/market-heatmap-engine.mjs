export function buildMarketHeatmap({loads=[],vehicles=[],cellDegrees=.5,equipment=null}={}){
 const cells=new Map();
 for(const load of loads){if(equipment&&load.equipment_required!==equipment)continue;const point=loadPoint(load);if(!point)continue;const key=cellKey(point,cellDegrees);const c=get(cells,key,point,cellDegrees);c.open_loads++;c.load_weight_tn+=Number(load.weight_tn||0);}
 for(const vehicle of vehicles){if(equipment&&vehicle.equipment_type!==equipment)continue;const point=vehiclePoint(vehicle);if(!point)continue;const key=cellKey(point,cellDegrees);const c=get(cells,key,point,cellDegrees);c.available_vehicles++;}
 return [...cells.values()].map(c=>{const ratio=c.available_vehicles?c.open_loads/c.available_vehicles:c.open_loads?999:0;return{...c,demand_supply_ratio:round(ratio,2),market_state:state(ratio,c.open_loads,c.available_vehicles)};}).sort((a,b)=>b.demand_supply_ratio-a.demand_supply_ratio);
}
export function suggestRepositioning({vehicle,heatmap=[],maxCells=5}={}){
 const loc=vehiclePoint(vehicle);if(!loc)return[];
 return heatmap.filter(c=>c.open_loads>0).map(c=>({...c,straight_line_km:round(haversine(loc,{lat:c.center_lat,lon:c.center_lon}),1)})).sort((a,b)=>scoreCell(b)-scoreCell(a)||a.straight_line_km-b.straight_line_km).slice(0,maxCells);
}
function scoreCell(c){return Math.min(20,c.demand_supply_ratio===999?20:c.demand_supply_ratio)*5-Math.min(50,c.straight_line_km*.1);}
function state(r,l,v){if(l===0)return'SURPLUS';if(v===0)return'HIGH_DEMAND';if(r>=2)return'HIGH_DEMAND';if(r>=1)return'BALANCED';return'SURPLUS';}
function loadPoint(x){return Number.isFinite(Number(x.origin_lat))&&Number.isFinite(Number(x.origin_lon))?{lat:Number(x.origin_lat),lon:Number(x.origin_lon)}:null;}
function vehiclePoint(x){return x.location&&Number.isFinite(Number(x.location.lat))&&Number.isFinite(Number(x.location.lon))?{lat:Number(x.location.lat),lon:Number(x.location.lon)}:null;}
function cellKey(p,d){return`${Math.floor(p.lat/d)}:${Math.floor(p.lon/d)}`;}
function get(map,key,p,d){if(!map.has(key)){const la=Math.floor(p.lat/d)*d,lo=Math.floor(p.lon/d)*d;map.set(key,{cell:key,center_lat:round(la+d/2,4),center_lon:round(lo+d/2,4),open_loads:0,available_vehicles:0,load_weight_tn:0});}return map.get(key);}
function haversine(a,b){const R=6371,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
