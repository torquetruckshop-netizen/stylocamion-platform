export function scoreBuyerIntent(events=[]){
 let score=0;const signals=[];const seen=new Set();
 for(const e of events){const type=String(e.type||e.event_type||'').toUpperCase();const id=e.event_id||`${type}:${e.occurred_at||''}`;if(seen.has(id))continue;seen.add(id);
  const w=weight(type);score+=w;if(w>0)signals.push(type);
 }
 score=Math.max(0,Math.min(100,score));
 return{intent_score:score,tier:score>=75?'HOT':score>=45?'WARM':'EXPLORATORY',signals:[...new Set(signals)],recommended_action:score>=75?'CONTACT_PRIORITY':score>=45?'NURTURE_AND_ALERT':'AUTOMATED_FOLLOW_UP'};
}
export function leadResponsePriority({intentScore=0,listingQuality=50,marketPosition='FAIR'}={}){
 let s=Number(intentScore)*.65+Number(listingQuality)*.25+(marketPosition==='LOW'?10:marketPosition==='FAIR'?5:0);
 s=Math.max(0,Math.min(100,Math.round(s)));
 return{priority_score:s,priority:s>=75?'P1':s>=50?'P2':'P3'};
}
function weight(t){if(t.includes('PURCHASE')||t.includes('RESERVE')||t.includes('OFFER'))return35;if(t.includes('WHATSAPP')||t.includes('CALL'))return25;if(t.includes('FINANC'))return18;if(t.includes('SAVE')||t.includes('WATCH'))return12;if(t.includes('COMPARE'))return8;if(t.includes('REPEAT_VIEW'))return7;if(t.includes('VIEW'))return3;return0;}
