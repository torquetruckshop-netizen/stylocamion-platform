export function predictEta({remainingKm,averageSpeedKph=65,currentTime=new Date(),plannedDwellMinutes=0,trafficDelayMinutes=0,weatherDelayMinutes=0,facilityDelayMinutes=0,signalQuality='MEDIUM'}={}){
  const km=Number(remainingKm),speed=Number(averageSpeedKph);
  if(!(km>=0)||!(speed>0)) return {status:'UNAVAILABLE',confidence:'LOW'};
  const driveMinutes=(km/speed)*60;
  const delay=[plannedDwellMinutes,trafficDelayMinutes,weatherDelayMinutes,facilityDelayMinutes].reduce((s,x)=>s+Math.max(0,Number(x)||0),0);
  const total=driveMinutes+delay;
  const eta=new Date(new Date(currentTime).getTime()+total*60000);
  return {status:'PREDICTED',eta:eta.toISOString(),drive_minutes:round(driveMinutes,0),delay_minutes:round(delay,0),remaining_km:round(km,1),confidence:normalizeQuality(signalQuality),method:'STYLO_ETA_V1'};
}

export function detectTripExceptions({predictedEta,plannedArrivalAt,gpsAgeMinutes=0,routeDeviationKm=0,currentDwellMinutes=0,facilityProfile=null,temperatureAlert=false,vehicleFault=false}={}){
  const items=[];
  const etaMs=predictedEta?.eta?new Date(predictedEta.eta).getTime():NaN;
  const planMs=plannedArrivalAt?new Date(plannedArrivalAt).getTime():NaN;
  if(Number.isFinite(etaMs)&&Number.isFinite(planMs)){
    const late=(etaMs-planMs)/60000;
    if(late>=120) items.push(ex('ETA_DELAY_CRITICAL','CRITICAL',round(late,0)));
    else if(late>=30) items.push(ex('ETA_DELAY','WARNING',round(late,0)));
  }
  if(Number(gpsAgeMinutes)>=240) items.push(ex('GPS_STALE','WARNING',Number(gpsAgeMinutes)));
  if(Number(routeDeviationKm)>=30) items.push(ex('ROUTE_DEVIATION','WARNING',Number(routeDeviationKm)));
  if(Number(currentDwellMinutes)>=180) items.push(ex('EXCESSIVE_DWELL','CRITICAL',Number(currentDwellMinutes)));
  else if(Number(currentDwellMinutes)>=90) items.push(ex('DWELL_RISK','WARNING',Number(currentDwellMinutes)));
  if(facilityProfile?.risk==='RED') items.push(ex('FACILITY_RISK','WARNING',facilityProfile.p90_wait_minutes??null));
  if(temperatureAlert) items.push(ex('TEMPERATURE_EXCEPTION','CRITICAL',null));
  if(vehicleFault) items.push(ex('VEHICLE_FAULT','CRITICAL',null));
  const priority=items.some(x=>x.severity==='CRITICAL')?'CRITICAL':items.length?'WARNING':'NORMAL';
  return {status:items.length?'EXCEPTION':'ON_TRACK',priority,exceptions:items};
}

export function nextOperatorAction(exceptionResult={}){
  if(exceptionResult.priority==='CRITICAL') return 'CONTACT_AND_RESOLVE_NOW';
  if(exceptionResult.priority==='WARNING') return 'REVIEW_AND_MONITOR';
  return 'NO_ACTION';
}
function ex(type,severity,value){return{type,severity,value};}
function normalizeQuality(q){const x=String(q||'MEDIUM').toUpperCase();return['HIGH','MEDIUM','LOW'].includes(x)?x:'MEDIUM';}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
