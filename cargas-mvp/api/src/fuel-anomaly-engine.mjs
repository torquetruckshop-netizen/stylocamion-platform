export function detectFuelAnomalies(readings=[],options={}){
 const ordered=[...readings].filter(valid).sort((a,b)=>new Date(a.observed_at)-new Date(b.observed_at));
 const anomalies=[];const dropThreshold=Number(options.drop_percent_threshold??12);const refillThreshold=Number(options.refill_percent_threshold??15);
 for(let i=1;i<ordered.length;i++){
  const a=ordered[i-1],b=ordered[i];const delta=Number(b.fuel_level_percent)-Number(a.fuel_level_percent);const dt=Math.max(0,(new Date(b.observed_at)-new Date(a.observed_at))/60000);const distance=distanceDelta(a,b);
  if(delta<=-dropThreshold&&distance<5&&dt<=120) anomalies.push({type:'SUDDEN_FUEL_DROP',severity:delta<=-25?'CRITICAL':'WARNING',from_percent:a.fuel_level_percent,to_percent:b.fuel_level_percent,change_percent:round(delta,1),distance_km:distance,time_minutes:round(dt,0),observed_at:b.observed_at});
  if(delta>=refillThreshold) anomalies.push({type:'FUEL_REFILL_DETECTED',severity:'INFO',change_percent:round(delta,1),observed_at:b.observed_at});
 }
 return {status:anomalies.some(x=>x.severity==='CRITICAL')?'CRITICAL':anomalies.some(x=>x.severity==='WARNING')?'ATTENTION':'NORMAL',anomalies};
}
export function compareFuelTransactionToTelemetry({transactionLiters,tankCapacityLiters,beforePercent,afterPercent,tolerancePercent=25}={}){
 const tx=Number(transactionLiters),cap=Number(tankCapacityLiters),before=Number(beforePercent),after=Number(afterPercent);
 if(!(tx>=0)||!(cap>0)||!Number.isFinite(before)||!Number.isFinite(after))return{status:'INSUFFICIENT_DATA'};
 const telemetryLiters=Math.max(0,(after-before)/100*cap);const variance=tx-telemetryLiters;const variancePct=tx?variance/tx*100:0;
 return{status:Math.abs(variancePct)>tolerancePercent?'MISMATCH':'CONSISTENT',transaction_liters:tx,telemetry_estimated_liters:round(telemetryLiters,1),variance_liters:round(variance,1),variance_percent:round(variancePct,1)};
}
function valid(x){return x&&Number.isFinite(Number(x.fuel_level_percent))&&x.observed_at;}
function distanceDelta(a,b){const x=Number(a.odometer_km),y=Number(b.odometer_km);return Number.isFinite(x)&&Number.isFinite(y)?Math.max(0,y-x):0;}
function round(n,d=1){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
