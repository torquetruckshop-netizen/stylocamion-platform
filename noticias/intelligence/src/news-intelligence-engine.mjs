const IMPACT_RULES={
  FUEL:['gasoil','diesel','combustible','nafta','refineria','refinería'],
  ROUTES:['ruta','autopista','corte','puente','peaje','tránsito','transito','desvío','desvio'],
  RATES:['tasa','crédito','credito','financiación','financiacion','préstamo','prestamo'],
  REGULATION:['ley','decreto','resolución','resolucion','normativa','vialidad','cnrt','documentación','documentacion'],
  WEATHER:['lluvia','tormenta','niebla','viento','granizo','inundación','inundacion'],
  MARKET:['flete','tarifa','costo','inflación','inflacion','dólar','dolar','actividad'],
  VEHICLES:['camión','camion','tracto','motor','modelo','lanzamiento'],
  TYRES:['neumático','neumatico','cubierta'],
  PARTS:['repuesto','filtro','aceite','pieza','taller']
};

export function sourceTrustProfile(source={}){
 const type=String(source.type||'PRESS').toUpperCase();
 const base={OFFICIAL:95,PRIMARY:90,INDUSTRY:78,PRESS:70,ANALYSIS:65,SOCIAL:40,UNKNOWN:30}[type]||30;
 let score=base;
 if(source.identified_author)score+=3;
 if(source.original_document_url)score+=5;
 if(source.corrections_policy)score+=2;
 score=Math.max(0,Math.min(100,score));
 return{source_type:type,trust_score:score,trust_level:score>=85?'VERY_HIGH':score>=70?'HIGH':score>=50?'MEDIUM':'LOW'};
}

export function classifyOperationalImpact(article={}){
 const text=normalize(`${article.title||''} ${article.summary||''} ${article.body||''}`);
 const tags=[];
 for(const [tag,words] of Object.entries(IMPACT_RULES)) if(words.some(w=>text.includes(normalize(w)))) tags.push(tag);
 const severity=severityFrom(article,tags,text);
 return{impact_tags:tags,severity,operationally_relevant:tags.length>0,critical:severity==='CRITICAL'};
}

export function scoreNewsForProfile(article={},profile={}){
 let score=20;const reasons=[];
 const impact=article.impact_tags||classifyOperationalImpact(article).impact_tags;
 if(profile.country&&eq(article.country,profile.country)){score+=20;reasons.push('COUNTRY');}
 if(profile.provinces?.some(x=>eq(x,article.region))){score+=15;reasons.push('REGION');}
 if(profile.corridors?.some(x=>normalize(article.text||article.summary||'').includes(normalize(x)))){score+=20;reasons.push('CORRIDOR');}
 if(profile.brands?.some(x=>normalize(`${article.title||''} ${article.summary||''}`).includes(normalize(x)))){score+=10;reasons.push('BRAND');}
 if(profile.impact_tags?.some(x=>impact.includes(String(x).toUpperCase()))){score+=25;reasons.push('IMPACT');}
 if(article.severity==='CRITICAL')score+=10;
 return{relevance_score:Math.max(0,Math.min(100,score)),reasons};
}

export function recommendedNewsAction(article={}){
 const tags=article.impact_tags||[];
 if(tags.includes('ROUTES')||tags.includes('WEATHER'))return['VIEW_AFFECTED_ROUTES','CHECK_ACTIVE_LOADS'];
 if(tags.includes('RATES'))return['VIEW_FINANCING_IMPACT','CHECK_SALES_FINANCING'];
 if(tags.includes('FUEL'))return['RECALCULATE_TRIP_COSTS'];
 if(tags.includes('REGULATION'))return['REVIEW_COMPLIANCE'];
 if(tags.includes('VEHICLES'))return['VIEW_RELATED_LISTINGS'];
 return['READ_MORE'];
}

function severityFrom(article,tags,text){if(article.critical===true)return'CRITICAL';if(tags.includes('ROUTES')&&(text.includes('corte total')||text.includes('cerrad')))return'CRITICAL';if(tags.includes('WEATHER')&&(text.includes('alerta roja')||text.includes('inund')))return'CRITICAL';if(tags.some(x=>['ROUTES','WEATHER','REGULATION','FUEL'].includes(x)))return'HIGH';return tags.length?'MEDIUM':'LOW';}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function eq(a,b){return normalize(a)===normalize(b)&&Boolean(a)&&Boolean(b);}
