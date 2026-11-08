export function buildLaneRateProfile(samples=[]){
  const valid=samples.map(normalize).filter(x=>x.rate_per_km>0).sort((a,b)=>a.occurred_ms-b.occurred_ms);
  if(!valid.length) return {status:'NO_DATA',sample_count:0,confidence:'LOW'};
  const rates=valid.map(x=>x.rate_per_km).sort((a,b)=>a-b);
  const recent=valid.slice(-Math.min(10,valid.length)).map(x=>x.rate_per_km);
  const older=valid.slice(0,Math.max(0,valid.length-recent.length)).map(x=>x.rate_per_km);
  const recentAvg=avg(recent),olderAvg=older.length?avg(older):recentAvg;
  const trendPct=olderAvg?((recentAvg-olderAvg)/olderAvg)*100:0;
  return {
    status:'READY',sample_count:valid.length,
    median_rate_per_km:round(percentile(rates,.5),2),
    p25_rate_per_km:round(percentile(rates,.25),2),
    p75_rate_per_km:round(percentile(rates,.75),2),
    recent_average_rate_per_km:round(recentAvg,2),
    trend_percent:round(trendPct,2),trend_direction:trendPct>3?'UP':trendPct<-3?'DOWN':'STABLE',
    confidence:valid.length>=30?'HIGH':valid.length>=8?'MEDIUM':'LOW',
    currency:valid[0].currency||'ARS'
  };
}

export function forecastLaneRate(profile={},horizonDays=7){
  if(profile.status!=='READY') return {status:'NO_DATA'};
  const base=Number(profile.recent_average_rate_per_km||profile.median_rate_per_km||0);
  const trend=Math.max(-15,Math.min(15,Number(profile.trend_percent||0)));
  const factor=Math.min(1,Math.max(0,Number(horizonDays)/7));
  return {status:'FORECAST',horizon_days:horizonDays,forecast_rate_per_km:round(base*(1+(trend/100)*factor),2),confidence:profile.confidence,currency:profile.currency,method:'INTERNAL_TREND_V1'};
}

export function evaluateOfferedRate({amount,loadedKm,profile}={}){
  const km=Number(loadedKm),value=Number(amount);
  if(!(km>0)||!(value>=0)||profile?.status!=='READY') return {status:'INSUFFICIENT_DATA'};
  const rate=value/km,median=Number(profile.median_rate_per_km||0),p25=Number(profile.p25_rate_per_km||median),p75=Number(profile.p75_rate_per_km||median);
  const position=rate<p25?'LOW':rate>p75?'HIGH':'FAIR';
  return {status:'EVALUATED',offered_rate_per_km:round(rate,2),market_position:position,vs_median_percent:median?round(((rate-median)/median)*100,2):null,confidence:profile.confidence};
}

export function estimateAcceptanceProbability({rateEvaluation,preferenceScore=50,facilityRisk='UNKNOWN'}={}){
  if(rateEvaluation?.status!=='EVALUATED') return {probability_percent:null,confidence:'LOW'};
  let p=50;
  p+=Math.max(-25,Math.min(25,Number(rateEvaluation.vs_median_percent||0)*.7));
  p+=(Number(preferenceScore)-50)*.3;
  if(facilityRisk==='RED') p-=15; else if(facilityRisk==='YELLOW') p-=6; else if(facilityRisk==='GREEN') p+=3;
  return {probability_percent:round(Math.max(5,Math.min(95,p)),1),confidence:rateEvaluation.confidence||'LOW',model:'RULE_BASED_ACCEPTANCE_V1'};
}

function normalize(x){const amount=Number(x.amount??x.freight_amount),km=Number(x.loaded_km??x.distance_km);return{rate_per_km:km>0&&amount>=0?amount/km:0,currency:x.currency||'ARS',occurred_ms:new Date(x.occurred_at||x.date||0).getTime()||0};}
function avg(xs){return xs.reduce((s,x)=>s+x,0)/xs.length;}
function percentile(sorted,p){const i=(sorted.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?sorted[l]:sorted[l]+(sorted[h]-sorted[l])*(i-l);}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
