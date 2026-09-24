export function evaluateMaintenanceRisk({odometerKm,engineHours,serviceRules=[],faultCodes=[],daysSinceLastService=null}={}){
 const due=[];
 for(const rule of serviceRules){
  const kmRemaining=remaining(rule.last_service_odometer_km,rule.interval_km,odometerKm);
  const hoursRemaining=remaining(rule.last_service_engine_hours,rule.interval_engine_hours,engineHours);
  const daysRemaining=rule.interval_days!=null&&daysSinceLastService!=null?Number(rule.interval_days)-Number(daysSinceLastService):null;
  const values=[kmRemaining,hoursRemaining,daysRemaining].filter(Number.isFinite);
  if(!values.length)continue;
  const minimum=Math.min(...values);const severity=minimum<=0?'DUE':minimum<=threshold(rule)?'SOON':'OK';
  due.push({rule_id:rule.id||rule.name||'SERVICE',name:rule.name||'Service',km_remaining:kmRemaining,hours_remaining:hoursRemaining,days_remaining:daysRemaining,severity});
 }
 const faults=(faultCodes||[]).map(code=>({code:String(code.code||code),severity:String(code.severity||'WARNING').toUpperCase(),description:code.description||null}));
 const criticalFault=faults.some(x=>x.severity==='CRITICAL');
 const dueNow=due.some(x=>x.severity==='DUE');
 const soon=due.some(x=>x.severity==='SOON');
 return{status:criticalFault||dueNow?'ACTION_REQUIRED':soon||faults.length?'ATTENTION':'OK',services:due,faults,next_action:criticalFault?'STOP_AND_REVIEW_FAULT':dueNow?'SCHEDULE_SERVICE_NOW':soon?'SCHEDULE_SERVICE':'MONITOR'};
}
function remaining(last,interval,current){const a=Number(last),b=Number(interval),c=Number(current);return Number.isFinite(a)&&b>0&&Number.isFinite(c)?round(a+b-c,1):null;}
function threshold(rule){if(rule.interval_km)return Math.max(500,Number(rule.interval_km)*.1);if(rule.interval_engine_hours)return Math.max(20,Number(rule.interval_engine_hours)*.1);if(rule.interval_days)return Math.max(7,Number(rule.interval_days)*.1);return 0;}
function round(n,d=1){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
