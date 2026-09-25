export function buildModuleQualityScores({health=[],facts=[],now=new Date(),freshnessHours=24}={}){
  const modules=new Set([...health.map(x=>x.module),...facts.map(x=>x.module)]);
  const current=new Date(now).getTime();
  return [...modules].map(module=>{
    const h=health.find(x=>x.module===module)||{status:'UNKNOWN'};
    const latest=facts.filter(f=>f.module===module).sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))[0];
    const latestMs=latest?new Date(latest.occurred_at).getTime():NaN;
    const ageHours=Number.isFinite(latestMs)?Math.max(0,(current-latestMs)/3600000):null;
    let score=statusBase(h.status);
    const latency=Number(h.latency_ms);
    if(Number.isFinite(latency)){if(latency>5000)score-=20;else if(latency>2000)score-=10;else if(latency<500)score+=5;}
    if(ageHours==null)score-=15;else if(ageHours>freshnessHours*2)score-=25;else if(ageHours>freshnessHours)score-=12;else score+=5;
    score=Math.max(0,Math.min(100,Math.round(score)));
    return {module,quality_score:score,status:h.status||'UNKNOWN',latency_ms:Number.isFinite(latency)?latency:null,data_age_hours:ageHours==null?null:round(ageHours,1),grade:score>=90?'A':score>=75?'B':score>=60?'C':'D'};
  }).sort((a,b)=>b.quality_score-a.quality_score);
}
function statusBase(s){if(s==='HEALTHY') return 85;if(s==='DEGRADED') return 60;if(s==='DOWN') return 20;return 50;}
function round(n,d=1){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
