export function buildCounterpartyTrustProfile(input={}){
  const completed=Math.max(0,Number(input.completed_operations)||0);
  const cancellations=Math.max(0,Number(input.cancellations)||0);
  const disputes=Math.max(0,Number(input.disputes)||0);
  const latePayments=Math.max(0,Number(input.late_payments)||0);
  const documentOk=input.documents_valid===true;
  const identityOk=input.identity_verified===true;
  const paymentDays=Number(input.average_payment_days);
  let score=50;
  if(documentOk) score+=15; else score-=20;
  if(identityOk) score+=10;
  score+=Math.min(15,completed*.5);
  score-=Math.min(25,cancellations*5);
  score-=Math.min(30,disputes*10);
  score-=Math.min(20,latePayments*4);
  if(Number.isFinite(paymentDays)){ if(paymentDays<=15)score+=8; else if(paymentDays<=30)score+=3; else if(paymentDays>60)score-=12; }
  score=Math.max(0,Math.min(100,Math.round(score)));
  const tier=score>=85?'A':score>=70?'B':score>=50?'C':'D';
  const risk=score>=70?'LOW':score>=50?'MEDIUM':'HIGH';
  return {trust_score:score,tier,risk,completed_operations:completed,cancellation_rate:rate(cancellations,completed+cancellations),dispute_rate:rate(disputes,completed+disputes),average_payment_days:Number.isFinite(paymentDays)?paymentDays:null,documents_valid:documentOk,identity_verified:identityOk};
}

export function canAutoTransact(profile={},rules={}){
  const minScore=Number(rules.minimum_trust_score??70);
  if(profile.documents_valid!==true) return {allowed:false,reason:'DOCUMENTS_NOT_VALID'};
  if(profile.trust_score<minScore) return {allowed:false,reason:'LOW_TRUST_SCORE'};
  if(profile.risk==='HIGH') return {allowed:false,reason:'HIGH_RISK'};
  return {allowed:true,reason:'TRUST_OK'};
}
function rate(n,d){return d?Math.round((n/d)*10000)/100:0;}
