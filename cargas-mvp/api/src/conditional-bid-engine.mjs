export function buildConditionalBid({load,carrierId,vehicleId=null,priceAmount=null,pickupAt=null,pickupWindowMinutes=null,conditions=[],expiresMinutes=30,now=new Date()}={}){
 if(!load?.id||!carrierId)throw new Error('load y carrierId obligatorios');
 const amount=priceAmount==null?load.price_amount:Number(priceAmount);
 return{bid_id:`BID:${load.id}:${carrierId}:${new Date(now).getTime()}`,load_id:load.id,carrier_id:carrierId,vehicle_id:vehicleId,price_amount:amount,currency:load.price_currency||'ARS',pickup_at:pickupAt||load.pickup_at||null,pickup_window_minutes:pickupWindowMinutes,conditions:[...conditions],status:'OPEN',created_at:new Date(now).toISOString(),expires_at:new Date(new Date(now).getTime()+Number(expiresMinutes)*60000).toISOString()};
}

export function evaluateConditionalBid({load,bid,rateProfile=null,maxPickupShiftHours=24,minPricePercentOfAsk=80}={}){
 const reasons=[];const ask=Number(load?.price_amount),bidAmount=Number(bid?.price_amount);
 if(!(bidAmount>0))reasons.push('INVALID_PRICE');
 if(ask>0&&bidAmount<ask*(Number(minPricePercentOfAsk)/100))reasons.push('PRICE_TOO_LOW');
 if(load?.pickup_at&&bid?.pickup_at){const shift=Math.abs(new Date(bid.pickup_at)-new Date(load.pickup_at))/3600000;if(shift>Number(maxPickupShiftHours))reasons.push('PICKUP_SHIFT_TOO_LARGE');}
 let marketPosition=null;
 if(rateProfile?.status==='READY'&&load?.loaded_route_km>0){const rate=bidAmount/Number(load.loaded_route_km);marketPosition=rate<rateProfile.p25_rate_per_km?'LOW':rate>rateProfile.p75_rate_per_km?'HIGH':'FAIR';}
 return{acceptable:reasons.length===0,reasons,market_position:marketPosition,next_action:reasons.length?'COUNTER_OR_REVIEW':'ACCEPTABLE_FOR_REVIEW'};
}

export function suggestCounterBid({load,rateProfile,preferenceScore=50}={}){
 if(rateProfile?.status!=='READY'||!(load?.loaded_route_km>0))return null;
 const km=Number(load.loaded_route_km);const preferenceAdjustment=(Number(preferenceScore)-50)/100*.08;
 const targetRate=Number(rateProfile.median_rate_per_km)*(1-preferenceAdjustment);
 return{price_amount:Math.round(targetRate*km),currency:rateProfile.currency||load.price_currency||'ARS',basis:'LANE_MEDIAN_PLUS_PREFERENCE',target_rate_per_km:round(targetRate,2)};
}
function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
