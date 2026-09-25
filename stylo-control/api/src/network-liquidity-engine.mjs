export function buildNetworkLiquidity({facts=[],range={}}={}){
  const selected=facts.filter(f=>inRange(f.occurred_at,range.start,range.end));
  const detected=selected.filter(f=>f.event_type==='LOAD_DETECTED');
  const matched=selected.filter(f=>f.event_type==='LOAD_MATCHED');
  const awarded=selected.filter(f=>f.event_type==='LOAD_AWARDED');
  const completed=selected.filter(f=>f.event_type==='LOAD_COMPLETED');
  const matchTimes=matched.map(f=>Number(f.dimensions?.time_to_match_minutes)).filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b);
  const supply=latestValue(selected,'AVAILABLE_VEHICLES');
  const demand=latestValue(selected,'OPEN_LOADS');
  const emptyKm=selected.filter(f=>f.event_type==='EMPTY_KM_AVOIDED').reduce((s,f)=>s+Number(f.value||0),0);
  return {
    loads_detected:detected.length,
    loads_matched:matched.length,
    loads_awarded:awarded.length,
    loads_completed:completed.length,
    match_rate_percent:detected.length?round(matched.length/detected.length*100,2):0,
    award_rate_percent:matched.length?round(awarded.length/matched.length*100,2):0,
    completion_rate_percent:awarded.length?round(completed.length/awarded.length*100,2):0,
    median_time_to_match_minutes:matchTimes.length?round(percentile(matchTimes,.5),1):null,
    p90_time_to_match_minutes:matchTimes.length?round(percentile(matchTimes,.9),1):null,
    available_vehicles:supply,
    open_loads:demand,
    load_to_vehicle_ratio:supply>0&&demand!=null?round(demand/supply,2):null,
    empty_km_avoided:round(emptyKm,1),
    liquidity_status:liquidityStatus({detected:detected.length,matched:matched.length,supply,demand})
  };
}

function latestValue(facts,event){const x=facts.filter(f=>f.event_type===event).sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))[0];return x?Number(x.value):null;}
function liquidityStatus({detected,matched,supply,demand}){if(!detected)return'NO_DEMAND';const rate=matched/detected;if(rate>=.8&&(!supply||!demand||demand/supply<=2))return'HEALTHY';if(rate>=.5)return'TIGHT';return'LOW_LIQUIDITY';}
function percentile(sorted,p){const i=(sorted.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?sorted[l]:sorted[l]+(sorted[h]-sorted[l])*(i-l);}
function inRange(date,start,end){const ms=new Date(date).getTime();if(!Number.isFinite(ms))return false;if(start&&ms<new Date(start).getTime())return false;if(end&&ms>new Date(end).getTime())return false;return true;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
