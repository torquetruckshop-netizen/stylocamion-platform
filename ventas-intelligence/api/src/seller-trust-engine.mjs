export function buildSellerTrustProfile(input={}){
 let score=40;const sales=Math.max(0,Number(input.completed_sales)||0),cancel=Math.max(0,Number(input.cancellations)||0),disputes=Math.max(0,Number(input.disputes)||0);
 if(input.identity_verified)score+=15;if(input.company_verified)score+=15;if(input.documents_verified)score+=10;
 score+=Math.min(15,sales*.5);score-=Math.min(25,cancel*5);score-=Math.min(30,disputes*10);
 const response=Number(input.average_response_minutes);if(Number.isFinite(response)){if(response<=30)score+=5;else if(response>1440)score-=8;}
 score=Math.max(0,Math.min(100,Math.round(score)));
 return{trust_score:score,tier:score>=85?'A':score>=70?'B':score>=50?'C':'D',verified_badge_eligible:score>=80&&input.identity_verified===true&&input.documents_verified===true,completed_sales:sales,cancellation_rate:rate(cancel,sales+cancel),dispute_rate:rate(disputes,sales+disputes),average_response_minutes:Number.isFinite(response)?response:null};
}
export function listingTrustGate({sellerProfile,inspection}={}){const reasons=[];if(!sellerProfile||sellerProfile.trust_score<60)reasons.push('SELLER_TRUST_LOW');if(inspection?.status==='ISSUES_FOUND')reasons.push('INSPECTION_ISSUES');return{allowed:reasons.length===0,reasons,verified_listing:sellerProfile?.verified_badge_eligible===true&&inspection?.ready_for_verified_badge===true};}
function rate(n,d){return d?Math.round(n/d*10000)/100:0;}
