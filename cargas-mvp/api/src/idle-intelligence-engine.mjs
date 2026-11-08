export function analyzeIdle({engineOnMinutes=0,movingMinutes=0,idlingFuelUsedL=null,fuelPricePerLiter=null,productiveIdleMinutes=0}={}){
 const engine=Math.max(0,Number(engineOnMinutes)||0),moving=Math.max(0,Number(movingMinutes)||0),productive=Math.max(0,Number(productiveIdleMinutes)||0);
 const rawIdle=Math.max(0,engine-moving);const avoidable=Math.max(0,rawIdle-productive);
 const fuel=numberOrNull(idlingFuelUsedL);const price=numberOrNull(fuelPricePerLiter);
 const avoidableShare=rawIdle>0?avoidable/rawIdle:0;
 const avoidableFuel=fuel==null?null:round(fuel*avoidableShare,2);
 const cost=avoidableFuel!=null&&price!=null?round(avoidableFuel*price,2):null;
 return{engine_on_minutes:engine,moving_minutes:moving,total_idle_minutes:rawIdle,productive_idle_minutes:productive,avoidable_idle_minutes:avoidable,idle_percent:engine?round(rawIdle/engine*100,2):0,avoidable_idle_percent:engine?round(avoidable/engine*100,2):0,avoidable_fuel_l:avoidableFuel,avoidable_idle_cost:cost,severity:avoidable>=180?'HIGH':avoidable>=60?'MEDIUM':'LOW'};
}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
