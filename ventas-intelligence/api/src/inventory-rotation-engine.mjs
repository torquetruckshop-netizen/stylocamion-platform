export function evaluateInventoryRotation({listing,metrics={},marketEvaluation=null,now=new Date()}={}){
 const created=new Date(listing?.created_at||now);const days=Math.max(0,(new Date(now)-created)/86400000);
 const views=Number(metrics.views||0),contacts=Number(metrics.contacts||0),offers=Number(metrics.offers||0);
 const contactRate=views?contacts/views*100:0,offerRate=contacts?offers/contacts*100:0;
 const actions=[];
 if(days>=45&&views<100)actions.push('IMPROVE_VISIBILITY');
 if(days>=30&&views>=100&&contacts<3)actions.push('IMPROVE_LISTING_OR_PRICE');
 if(marketEvaluation?.market_position==='HIGH'&&days>=21)actions.push('REVIEW_PRICE');
 if(contacts>=5&&offers===0)actions.push('REVIEW_SALES_RESPONSE_OR_TERMS');
 if(days>=60)actions.push('REFRESH_MEDIA_AND_DESCRIPTION');
 return{listing_id:listing?.id||null,days_on_market:Math.round(days),views,contacts,offers,contact_rate_percent:round(contactRate,2),offer_rate_percent:round(offerRate,2),rotation_status:days<30?'FRESH':days<60?'AGING':'STALE',recommended_actions:[...new Set(actions)]};
}
export function sellerFunnel(events=[]){const counts={IMPRESSIONS:0,VIEWS:0,CONTACTS:0,OFFERS:0,CLOSED:0};for(const e of events){const t=String(e.type||e.event_type||'').toUpperCase();if(t.includes('IMPRESSION'))counts.IMPRESSIONS++;else if(t.includes('VIEW'))counts.VIEWS++;else if(t.includes('CONTACT')||t.includes('WHATSAPP')||t.includes('CALL'))counts.CONTACTS++;else if(t.includes('OFFER'))counts.OFFERS++;else if(t.includes('CLOSED')||t.includes('SOLD'))counts.CLOSED++;}return{...counts,view_rate:rate(counts.VIEWS,counts.IMPRESSIONS),contact_rate:rate(counts.CONTACTS,counts.VIEWS),offer_rate:rate(counts.OFFERS,counts.CONTACTS),close_rate:rate(counts.CLOSED,counts.CONTACTS)};}
function rate(n,d){return d?round(n/d*100,2):0;}function round(n,d=2){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
