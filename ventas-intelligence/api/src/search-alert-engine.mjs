export function listingMatchesSavedSearch(listing={},search={}){
 if(search.brand&&!eq(listing.brand,search.brand))return false;
 if(search.model&&!contains(listing.model,search.model))return false;
 if(search.country&&!eq(listing.country,search.country))return false;
 if(search.category&&!eq(listing.category,search.category))return false;
 if(search.year_min&&Number(listing.year)<Number(search.year_min))return false;
 if(search.year_max&&Number(listing.year)>Number(search.year_max))return false;
 if(search.price_min&&Number(listing.price_amount)<Number(search.price_min))return false;
 if(search.price_max&&Number(listing.price_amount)>Number(search.price_max))return false;
 if(search.km_max&&Number(listing.km)>Number(search.km_max))return false;
 return true;
}
export function buildNewListingAlerts({listing,savedSearches=[]}={}){
 return savedSearches.filter(s=>listingMatchesSavedSearch(listing,s)).map(s=>({type:'NEW_LISTING_MATCH',search_id:s.id,user_id:s.user_id,listing_id:listing.id,dedupe_key:`NEW_LISTING:${s.id}:${listing.id}`,title:'Nueva unidad compatible',body:`${listing.brand||''} ${listing.model||''} ${listing.year||''}`.trim()}));
}
export function buildPriceChangeAlert({listingId,userId,oldPrice,newPrice,currency='ARS'}={}){
 const before=Number(oldPrice),after=Number(newPrice);if(!(before>0)||!(after>0)||before===after)return null;
 const change=round((after-before)/before*100,2);
 return{type:after<before?'PRICE_DROP':'PRICE_INCREASE',listing_id:listingId,user_id:userId,old_price:before,new_price:after,currency,change_percent:change,dedupe_key:`PRICE:${listingId}:${after}`,priority:after<before&&change<=-5?'HIGH':'NORMAL'};
}
export function watchlistState(items=[],listingId){return items.some(x=>x.listing_id===listingId&&x.status!=='REMOVED')?'WATCHING':'NOT_WATCHING';}
function eq(a,b){return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();}
function contains(a,b){return String(a||'').toLowerCase().includes(String(b||'').toLowerCase());}
function round(n,d=2){const f=10**d;return Math.round((n+Number.EPSILON)*f)/f;}
