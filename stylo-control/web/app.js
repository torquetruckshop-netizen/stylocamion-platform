const demo={
  hero:[
    ['Usuarios registrados','1.248','+7,4% vs. período anterior'],
    ['Operaciones digitalizadas','326','Cargas adjudicadas/completadas'],
    ['Km vacíos evitados','18.420 km','Impacto operativo estimado'],
    ['Volumen procesado','ARS 94,2 M','Métrica agregada de prueba']
  ],
  loads:[
    ['Cargas detectadas','4.850'],['Matches realizados','1.780'],['Adjudicadas','412'],
    ['Completadas','326'],['Desde WhatsApp','71%'],['Match medio','91%']
  ],
  business:[
    ['Publicaciones activas','184'],['Consultas de venta','612'],['Servicios contratados','38'],
    ['Pagos confirmados','44'],['Ingresos registrados','ARS 6,8 M'],['Conversión','6,2%']
  ],
  ai:[
    ['Mensajes IA','9.418'],['Audios transcritos','1.126'],['Decisiones automáticas','3.742'],
    ['Excepciones','96'],['Unidades conectadas','34'],['Consumo aprendido','12 flotas']
  ],
  health:[
    ['Cargas','HEALTHY','Operación normal'],['Ventas','HEALTHY','Operación normal'],
    ['Noticias','DEGRADED','Fuente externa con demora'],['Mercado Pago','HEALTHY','Última confirmación 2 min'],
    ['Telemetría','UNKNOWN','Integración comercial en evaluación']
  ]
};

function card([label,value,note]){
  return `<article class="hero-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div>${note?`<div class="metric-note">${note}</div>`:''}</article>`;
}
function smallCard([label,value]){
  return `<article class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></article>`;
}
function healthRow([name,status,detail]){
  const css=status.toLowerCase();
  return `<div class="health-row"><div><div class="health-name">${name}</div><div class="health-detail">${detail}</div></div><span class="health-state ${css}">${status}</span></div>`;
}

document.querySelector('#heroMetrics').innerHTML=demo.hero.map(card).join('');
document.querySelector('#loadsMetrics').innerHTML=demo.loads.map(smallCard).join('');
document.querySelector('#businessMetrics').innerHTML=demo.business.map(smallCard).join('');
document.querySelector('#aiMetrics').innerHTML=demo.ai.map(smallCard).join('');
document.querySelector('#healthList').innerHTML=demo.health.map(healthRow).join('');
