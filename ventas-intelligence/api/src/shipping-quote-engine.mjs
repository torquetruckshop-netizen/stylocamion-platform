export function estimateVehicleShipping({distanceKm,baseRatePerKm,loadingFee=0,tolls=0,insurance=0,specialHandling=0,currency='ARS',source='ESTIMATE'}={}){
 const km=Number(distanceKm),rate=Number(baseRatePerKm);
 if(!(km>=0)||!(rate>=0))return{status:'INVALID_INPUT'};
 const linehaul=km*rate;const total=linehaul+sum(loadingFee,tolls,insurance,specialHandling);
 return{status:'ESTIMATE',distance_km:round(km,1),base_rate_per_km:rate,linehaul:round(linehaul),loading_fee:round(Number(loadingFee)||0),tolls:round(Number(tolls)||0),insurance:round(Number(insurance)||0),special_handling:round(Number(specialHandling)||0),total_estimated:round(total),currency,source,disclaimer:'ESTIMACIÓN_LOGÍSTICA_NO_COTIZACIÓN_VINCULANTE'};
}
export function compareShippingQuotes(quotes=[]){return quotes.filter(q=>q&&Number.isFinite(Number(q.total_estimated))).sort((a,b)=>Number(a.total_estimated)-Number(b.total_estimated)).map((q,i)=>({...q,rank:i+1}));}
function sum(...xs){return xs.reduce((s,x)=>s+(Number(x)||0),0);}function round(n,d=2){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
