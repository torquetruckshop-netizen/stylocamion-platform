export function buildAnonymousFleetBenchmark({records=[],metric,minCohortSize=5}={}){
 const values=records.map(r=>Number(r[metric])).filter(Number.isFinite).sort((a,b)=>a-b);
 if(values.length<Number(minCohortSize))return{status:'INSUFFICIENT_COHORT',metric,cohort_size:values.length,min_cohort_size:Number(minCohortSize)};
 return{status:'READY',metric,cohort_size:values.length,p25:round(percentile(values,.25),2),median:round(percentile(values,.5),2),p75:round(percentile(values,.75),2),average:round(values.reduce((s,x)=>s+x,0)/values.length,2),privacy:'AGGREGATED_ONLY'};
}
export function compareFleetToBenchmark({fleetValue,benchmark,lowerIsBetter=true}={}){
 const value=Number(fleetValue);if(!Number.isFinite(value)||benchmark?.status!=='READY')return{status:'INSUFFICIENT_DATA'};
 const median=Number(benchmark.median);const delta=median?round((value-median)/median*100,2):null;
 const position=lowerIsBetter?(value<=benchmark.p25?'TOP_QUARTILE':value>=benchmark.p75?'BOTTOM_QUARTILE':'MID_RANGE'):(value>=benchmark.p75?'TOP_QUARTILE':value<=benchmark.p25?'BOTTOM_QUARTILE':'MID_RANGE');
 return{status:'EVALUATED',value,benchmark_median:median,vs_median_percent:delta,position,privacy:benchmark.privacy};
}
export function estimateEmissions({fuelLiters,emissionFactorKgPerLiter}={}){const liters=Number(fuelLiters),factor=Number(emissionFactorKgPerLiter);if(!(liters>=0)||!(factor>0))return{status:'REQUIRES_FACTOR'};const kg=liters*factor;return{status:'ESTIMATE',fuel_liters:liters,emission_factor_kg_per_liter:factor,co2e_kg:round(kg,2),co2e_tonnes:round(kg/1000,4),factor_source_required:true};}
function percentile(sorted,p){const i=(sorted.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?sorted[l]:sorted[l]+(sorted[h]-sorted[l])*(i-l);}function round(n,d=2){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
