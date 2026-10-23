export function buildWorldClassKpis({facts=[],range={}}={}){
 const rows=facts.filter(f=>inRange(f.occurred_at,range.start,range.end));
 const count=event=>rows.filter(f=>f.event_type===event).length;
 const sum=event=>round(rows.filter(f=>f.event_type===event).reduce((s,f)=>s+Number(f.value||0),0),2);
 const avg=event=>{const xs=rows.filter(f=>f.event_type===event).map(f=>Number(f.value)).filter(Number.isFinite);return xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null;};
 return {
  CARGAS:{
   instant_book_proposed:count('INSTANT_BOOK_PROPOSED'),
   instant_book_confirmed:count('INSTANT_BOOK_CONFIRMED'),
   instant_book_conversion_percent:rate(count('INSTANT_BOOK_CONFIRMED'),count('INSTANT_BOOK_PROPOSED')),
   conditional_bids:count('CONDITIONAL_BID_CREATED'),
   operational_exceptions:count('OPERATIONAL_EXCEPTION'),
   critical_exceptions:rows.filter(f=>f.event_type==='OPERATIONAL_EXCEPTION'&&String(f.status||f.dimensions?.severity).toUpperCase()==='CRITICAL').length,
   facility_average_wait_minutes:avg('FACILITY_WAIT_OBSERVED'),
   continuous_move_plans:count('CONTINUOUS_MOVE_PLAN_CREATED')
  },
  VENTAS:{
   saved_search_matches:count('SAVED_SEARCH_MATCH'),
   price_alerts:count('PRICE_ALERT_SENT'),
   want_to_buy_matches:count('WANT_TO_BUY_MATCH'),
   hot_buyers:count('BUYER_INTENT_HOT'),
   verified_listings:count('LISTING_VERIFIED'),
   shipping_estimates:count('SHIPPING_ESTIMATE_CREATED')
  },
  NOTICIAS:{
   critical_alerts:count('CRITICAL_NEWS_ALERT'),
   operational_impacts:count('NEWS_OPERATIONAL_IMPACT'),
   story_clusters:count('NEWS_CLUSTER_CREATED'),
   corrections:count('NEWS_CORRECTION_APPLIED'),
   stale_items_blocked:count('STALE_NEWS_BLOCKED')
  },
  TELEMATICS:{
   critical_fuel_anomalies:count('FUEL_ANOMALY_CRITICAL'),
   maintenance_actions:count('MAINTENANCE_ACTION_REQUIRED'),
   avoidable_idle_minutes:sum('AVOIDABLE_IDLE_MINUTES'),
   avoidable_idle_cost:sum('AVOIDABLE_IDLE_COST'),
   pod_records:count('POD_CREATED')
  }
 };
}
function rate(n,d){return d?round(n/d*100,2):0;}function inRange(date,start,end){const ms=new Date(date).getTime();if(!Number.isFinite(ms))return false;if(start&&ms<new Date(start).getTime())return false;if(end&&ms>new Date(end).getTime())return false;return true;}function round(n,d=2){const f=10**d;return Math.round((Number(n)+Number.EPSILON)*f)/f;}
