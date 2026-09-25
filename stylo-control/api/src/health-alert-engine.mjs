export function buildHealthAlerts({health=[],previousAlerts=[]}={}){
 const activeKeys=new Set(previousAlerts.filter(a=>a.status==='OPEN').map(a=>a.key));
 const alerts=[];
 for(const item of health){
  const status=String(item.status||'UNKNOWN').toUpperCase();
  if(!['DEGRADED','DOWN'].includes(status)) continue;
  const key=`${item.module}:${status}`;
  if(activeKeys.has(key)) continue;
  alerts.push({key,module:item.module,severity:status==='DOWN'?'CRITICAL':'WARNING',status:'OPEN',detail:item.detail||null,opened_at:new Date().toISOString()});
 }
 return alerts;
}

export function resolveRecoveredAlerts({health=[],alerts=[]}={}){
 const byModule=new Map(health.map(h=>[h.module,String(h.status||'UNKNOWN').toUpperCase()]));
 return alerts.map(alert=>{
  if(alert.status!=='OPEN') return alert;
  const current=byModule.get(alert.module);
  if(current==='HEALTHY') return {...alert,status:'RESOLVED',resolved_at:new Date().toISOString()};
  return alert;
 });
}
