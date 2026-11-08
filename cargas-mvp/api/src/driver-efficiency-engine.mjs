export function buildDriverEfficiencyScore(metrics={}){
  let score=100;const factors=[];
  const idle=Number(metrics.avoidable_idle_percent);if(Number.isFinite(idle)){const p=Math.min(25,idle*.8);score-=p;factors.push({factor:'AVOIDABLE_IDLE',penalty:round(p,1)});}
  const harsh=Number(metrics.harsh_events_per_100km);if(Number.isFinite(harsh)){const p=Math.min(20,harsh*2);score-=p;factors.push({factor:'HARSH_EVENTS',penalty:round(p,1)});}
  const speed=Number(metrics.overspeed_minutes_percent);if(Number.isFinite(speed)){const p=Math.min(20,speed);score-=p;factors.push({factor:'OVERSPEED',penalty:round(p,1)});}
  const eco=Number(metrics.fuel_efficiency_vs_baseline_percent);if(Number.isFinite(eco)){const p=Math.max(-10,Math.min(20,eco*.7));score-=p;factors.push({factor:'FUEL_VS_BASELINE',penalty:round(p,1)});}
  const cruise=Number(metrics.cruise_control_usage_percent);if(Number.isFinite(cruise)&&cruise>=60){score+=3;factors.push({factor:'CRUISE_USAGE',penalty:-3});}
  score=Math.max(0,Math.min(100,Math.round(score)));
  return{efficiency_score:score,grade:score>=90?'A':score>=80?'B':score>=65?'C':'D',factors,recommendations:recommend(factors)};
}
function recommend(factors){const out=[];for(const f of factors){if(f.factor==='AVOIDABLE_IDLE'&&f.penalty>5)out.push('Reducir ralentí evitable cuando la operación lo permita.');if(f.factor==='HARSH_EVENTS'&&f.penalty>5)out.push('Revisar aceleraciones/frenadas bruscas y contexto de ruta.');if(f.factor==='OVERSPEED'&&f.penalty>5)out.push('Revisar exceso de velocidad por seguridad y consumo.');if(f.factor==='FUEL_VS_BASELINE'&&f.penalty>5)out.push('Analizar consumo contra la línea base de esa unidad y ruta.');}return out;}
function round(n,d=1){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
