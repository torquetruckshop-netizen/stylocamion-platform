export function findAffectedOperations({article,loads=[],vehicles=[],radiusKm=80}={}){
 const points=articlePoints(article);const affectedLoads=[],affectedVehicles=[];
 for(const load of loads){if(routeTextMatch(article,load)||points.some(p=>nearLoad(p,load,radiusKm)))affectedLoads.push({load_id:load.id,reason:routeTextMatch(article,load)?'ROUTE_TEXT':'GEOFENCE'});}
 for(const vehicle of vehicles){if(points.some(p=>nearPoint(p,vehicle.location,radiusKm)))affectedVehicles.push({vehicle_id:vehicle.id,reason:'GEOFENCE'});}
 return{article_id:article?.id||null,affected_loads:dedupe(affectedLoads,'load_id'),affected_vehicles:dedupe(affectedVehicles,'vehicle_id'),operational_impact_count:affectedLoads.length+affectedVehicles.length};
}
export function buildOperationalNewsAlert({article,impact}={}){if(!impact?.operational_impact_count)return null;return{type:'NEWS_OPERATIONAL_IMPACT',article_id:article.id,affected_loads:impact.affected_loads,affected_vehicles:impact.affected_vehicles,priority:article.severity==='CRITICAL'?'CRITICAL':'HIGH',dedupe_key:`NEWS_OP:${article.id}`};}
function articlePoints(a={}){const arr=[];if(valid(a.lat,a.lon))arr.push({lat:Number(a.lat),lon:Number(a.lon)});for(const p of a.geo_points||[])if(valid(p.lat,p.lon))arr.push({lat:Number(p.lat),lon:Number(p.lon)});return arr;}
function routeTextMatch(a,l){const t=normalize(`${a.title||''} ${a.summary||''}`);return [l.origin,l.destination,l.corridor].filter(Boolean).some(x=>t.includes(normalize(x)));}
function nearLoad(p,l,r){return [coords(l.origin_lat,l.origin_lon),coords(l.destination_lat,l.destination_lon)].filter(Boolean).some(x=>nearPoint(p,x,r));}
function nearPoint(a,b,r){if(!a||!b||!valid(a.lat,a.lon)||!valid(b.lat,b.lon))return false;return haversine(a,b)<=r;}
function coords(lat,lon){return valid(lat,lon)?{lat:Number(lat),lon:Number(lon)}:null;}function valid(lat,lon){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon));}
function haversine(a,b){const R=6371,rad=x=>x*Math.PI/180,dLat=rad(Number(b.lat)-Number(a.lat)),dLon=rad(Number(b.lon)-Number(a.lon)),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}function dedupe(xs,k){return [...new Map(xs.map(x=>[x[k],x])).values()];}
