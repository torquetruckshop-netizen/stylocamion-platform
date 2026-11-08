export function buildCarrierPreferenceProfile(events=[]){
  const lane=new Map(),equipment=new Map(),cargo=new Map();
  let accepted=0,rejected=0,engaged=0;
  for(const e of events){
    const action=String(e.action||e.event_type||'').toUpperCase();
    const weight=actionWeight(action);
    if(action.includes('ACCEPT')||action.includes('BOOK')) accepted++;
    if(action.includes('REJECT')||action.includes('DECLINE')) rejected++;
    if(['VIEW','CLICK','SEARCH','ACCEPT','BOOK','REJECT','DECLINE'].some(x=>action.includes(x))) engaged++;
    add(lane,laneKey(e.origin,e.destination),weight);
    add(equipment,String(e.equipment_type||'').toLowerCase(),weight);
    add(cargo,String(e.cargo_type||'').toLowerCase(),weight);
  }
  return {
    sample_count:events.length,
    engagement_count:engaged,
    acceptance_rate:accepted+rejected?round((accepted/(accepted+rejected))*100,2):null,
    preferred_lanes:top(lane,10),
    preferred_equipment:top(equipment,5),
    preferred_cargo:top(cargo,10),
    confidence:events.length>=50?'HIGH':events.length>=10?'MEDIUM':'LOW'
  };
}

export function scoreLoadPreference(load,profile={}){
  let score=50;
  const lane=laneKey(load.origin,load.destination);
  score+=matchBoost(profile.preferred_lanes,lane,25);
  score+=matchBoost(profile.preferred_equipment,String(load.equipment_required||'').toLowerCase(),15);
  score+=matchBoost(profile.preferred_cargo,String(load.cargo_type||'').toLowerCase(),10);
  return {preference_score:Math.max(0,Math.min(100,round(score,1))),confidence:profile.confidence||'LOW'};
}

function actionWeight(a){if(a.includes('ACCEPT')||a.includes('BOOK'))return 4;if(a.includes('CLICK'))return 2;if(a.includes('VIEW')||a.includes('SEARCH'))return 1;if(a.includes('REJECT')||a.includes('DECLINE'))return-3;return 0;}
function laneKey(o,d){const a=String(o||'').trim().toLowerCase(),b=String(d||'').trim().toLowerCase();return a&&b?`${a}>${b}`:'';}
function add(map,key,w){if(!key||!w)return;map.set(key,(map.get(key)||0)+w);}
function top(map,n){return[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([key,weight])=>({key,weight}));}
function matchBoost(items,key,max){if(!key||!items?.length)return 0;const found=items.find(x=>x.key===key);if(!found)return 0;const best=Math.max(...items.map(x=>Math.abs(x.weight)),1);return round((found.weight/best)*max,1);}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
