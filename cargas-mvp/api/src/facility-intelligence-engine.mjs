export function normalizeFacilityReview(input={}){
  const rating=clamp(Number(input.rating||0),1,5);
  const wait=Number(input.wait_minutes??input.waitMinutes);
  return {
    facility_id:String(input.facility_id||input.facilityId||'').trim()||null,
    rating:Number.isFinite(rating)?rating:null,
    wait_minutes:Number.isFinite(wait)&&wait>=0?wait:null,
    amenities:Array.isArray(input.amenities)?[...new Set(input.amenities.map(x=>String(x).toUpperCase()))]:[],
    source:String(input.source||'USER').toUpperCase(),
    observed_at:new Date(input.observed_at||input.observedAt||Date.now()).toISOString()
  };
}

export function buildFacilityProfile(reviews=[]){
  const items=reviews.map(normalizeFacilityReview).filter(x=>x.facility_id);
  const ratings=items.map(x=>x.rating).filter(Number.isFinite);
  const waits=items.map(x=>x.wait_minutes).filter(Number.isFinite).sort((a,b)=>a-b);
  const amenityCounts={};
  for(const item of items) for(const a of item.amenities) amenityCounts[a]=(amenityCounts[a]||0)+1;
  const profile={
    facility_id:items[0]?.facility_id||null,
    review_count:items.length,
    average_rating:ratings.length?round(avg(ratings),2):null,
    median_wait_minutes:waits.length?round(percentile(waits,.5),0):null,
    p90_wait_minutes:waits.length?round(percentile(waits,.9),0):null,
    amenities:Object.entries(amenityCounts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})),
    confidence:confidenceFor(items.length),
    risk:'UNKNOWN'
  };
  profile.risk=facilityRisk(profile);
  return profile;
}

export function facilityRisk(profile={}){
  if(!profile.review_count) return 'UNKNOWN';
  const rating=Number(profile.average_rating??5);
  const wait=Number(profile.p90_wait_minutes??0);
  if(rating<2.5||wait>=240) return 'RED';
  if(rating<3.5||wait>=120) return 'YELLOW';
  return 'GREEN';
}

export function estimateDwellCost({profile,truckHourlyCost=0,freeMinutes=0}={}){
  const wait=Number(profile?.median_wait_minutes);
  const hourly=Number(truckHourlyCost);
  const free=Math.max(0,Number(freeMinutes)||0);
  if(!Number.isFinite(wait)||!Number.isFinite(hourly)||hourly<0) return null;
  const billable=Math.max(0,wait-free);
  return {estimated_wait_minutes:wait,billable_wait_minutes:billable,estimated_dwell_cost:round((billable/60)*hourly,2),confidence:profile?.confidence||'LOW'};
}

function confidenceFor(n){if(n>=20)return'HIGH';if(n>=5)return'MEDIUM';return'LOW';}
function avg(xs){return xs.reduce((s,x)=>s+x,0)/xs.length;}
function percentile(sorted,p){if(!sorted.length)return null;const idx=(sorted.length-1)*p;const lo=Math.floor(idx),hi=Math.ceil(idx);return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(idx-lo);}
function clamp(n,min,max){return Number.isFinite(n)?Math.max(min,Math.min(max,n)):NaN;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
