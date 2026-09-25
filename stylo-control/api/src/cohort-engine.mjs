export function buildRetentionCohorts({facts=[],cohort='MONTH',periods=6}={}){
  const registrations=facts.filter(f=>f.event_type==='USER_REGISTERED'&&f.entity_id);
  const activities=facts.filter(f=>isActivity(f));
  const users=new Map();
  for(const r of registrations){
    const key=periodKey(r.occurred_at,cohort);
    users.set(r.entity_id,{registered:key,registration_at:r.occurred_at});
  }
  const cohortUsers=new Map();
  for(const [userId,u] of users){(cohortUsers.get(u.registered)||cohortUsers.set(u.registered,new Set()).get(u.registered)).add(userId);}
  const activityByUser=new Map();
  for(const a of activities){const uid=a.dimensions?.user_id||a.dimensions?.actor_user_id||(a.entity_type==='USER'?a.entity_id:null);if(!uid||!users.has(uid))continue;(activityByUser.get(uid)||activityByUser.set(uid,new Set()).get(uid)).add(periodKey(a.occurred_at,cohort));}
  return [...cohortUsers.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,members])=>{
    const row={cohort:key,size:members.size,retention:[]};
    for(let offset=0;offset<periods;offset++){
      const target=shiftPeriod(key,offset,cohort);
      let active=0;
      for(const uid of members){if(offset===0||activityByUser.get(uid)?.has(target))active++;}
      row.retention.push({period_offset:offset,period:target,active_users:active,retention_percent:members.size?round(active/members.size*100,2):0});
    }
    return row;
  });
}

function isActivity(f){return['WEB_SESSION','LOAD_DETECTED','LOAD_MATCHED','SALES_INQUIRY','SALES_SERVICE_PURCHASED','PAYMENT_CONFIRMED','NEWS_VIEW'].includes(f.event_type);}
function periodKey(value,unit){const d=new Date(value);if(unit==='WEEK'){const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()-day+1);return x.toISOString().slice(0,10);}return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
function shiftPeriod(key,offset,unit){if(unit==='WEEK'){const d=new Date(`${key}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+offset*7);return d.toISOString().slice(0,10);}const [y,m]=key.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
