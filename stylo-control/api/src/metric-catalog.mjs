export const CONTROL_METRIC_CATALOG_VERSION='stylo-control-metrics-v3';
export const MetricVisibility=Object.freeze({INTERNAL:'INTERNAL',INVESTOR:'INVESTOR'});
export const METRICS=Object.freeze([
 {key:'users_total',section:'USERS',label:'Usuarios registrados',visibility:'INVESTOR',aggregation:'COUNT_DISTINCT',entity:'USER'},
 {key:'users_active',section:'USERS',label:'Usuarios activos',visibility:'INTERNAL',aggregation:'COUNT_DISTINCT',entity:'USER',where:{status:'ACTIVE'}},
 {key:'users_new',section:'USERS',label:'Nuevos usuarios',visibility:'INVESTOR',aggregation:'COUNT_DISTINCT',entity:'USER'},
 {key:'loads_detected',section:'CARGAS',label:'Oportunidades de carga detectadas',visibility:'INVESTOR',aggregation:'COUNT',event:'LOAD_DETECTED'},
 {key:'loads_matched',section:'CARGAS',label:'Matches realizados',visibility:'INVESTOR',aggregation:'COUNT',event:'LOAD_MATCHED'},
 {key:'loads_awarded',section:'CARGAS',label:'Cargas adjudicadas',visibility:'INVESTOR',aggregation:'COUNT',event:'LOAD_AWARDED'},
 {key:'loads_completed',section:'CARGAS',label:'Operaciones completadas',visibility:'INVESTOR',aggregation:'COUNT',event:'LOAD_COMPLETED'},
 {key:'empty_km_avoided',section:'CARGAS',label:'Km vacíos evitados',visibility:'INVESTOR',aggregation:'SUM',event:'EMPTY_KM_AVOIDED',valueField:'value'},
 {key:'loads_from_whatsapp',section:'CARGAS',label:'Cargas originadas en WhatsApp',visibility:'INTERNAL',aggregation:'COUNT',event:'LOAD_DETECTED',where:{channel:'WHATSAPP'}},
 {key:'sales_listings_active',section:'VENTAS',label:'Publicaciones activas',visibility:'INVESTOR',aggregation:'GAUGE',event:'SALES_LISTINGS_ACTIVE',valueField:'value'},
 {key:'sales_listings_created',section:'VENTAS',label:'Publicaciones creadas',visibility:'INVESTOR',aggregation:'COUNT',event:'SALES_LISTING_CREATED'},
 {key:'sales_inquiries',section:'VENTAS',label:'Consultas de ventas',visibility:'INVESTOR',aggregation:'COUNT',event:'SALES_INQUIRY'},
 {key:'sales_services_purchased',section:'VENTAS',label:'Servicios de ventas contratados',visibility:'INVESTOR',aggregation:'COUNT',event:'SALES_SERVICE_PURCHASED'},
 {key:'sales_contacts_whatsapp',section:'VENTAS',label:'Consultas iniciadas por WhatsApp',visibility:'INTERNAL',aggregation:'COUNT',event:'SALES_INQUIRY',where:{channel:'WHATSAPP'}},
 {key:'sales_deals_closed',section:'VENTAS',label:'Operaciones de venta cerradas',visibility:'INVESTOR',aggregation:'COUNT',event:'SALES_DEAL_CLOSED'},
 {key:'sales_gmv',section:'VENTAS',label:'Valor de operaciones cerradas',visibility:'INVESTOR',aggregation:'SUM',event:'SALES_DEAL_CLOSED',valueField:'value'},
 {key:'sales_conversion_rate',section:'VENTAS',label:'Conversión consulta a cierre',visibility:'INVESTOR',aggregation:'RATIO',numeratorEvent:'SALES_DEAL_CLOSED',denominatorEvent:'SALES_INQUIRY'},
 {key:'gross_revenue',section:'REVENUE',label:'Ingresos confirmados',visibility:'INTERNAL',aggregation:'SUM',event:'REVENUE_RECORDED',valueField:'value'},
 {key:'payments_confirmed',section:'REVENUE',label:'Pagos confirmados',visibility:'INTERNAL',aggregation:'COUNT',event:'PAYMENT_CONFIRMED'},
 {key:'payments_pending',section:'REVENUE',label:'Pagos pendientes',visibility:'INTERNAL',aggregation:'COUNT',event:'PAYMENT_PENDING'},
 {key:'payments_rejected',section:'REVENUE',label:'Pagos rechazados/cancelados',visibility:'INTERNAL',aggregation:'COUNT',event:'PAYMENT_REJECTED'},
 {key:'payment_approval_rate',section:'REVENUE',label:'Tasa de aprobación de pagos',visibility:'INTERNAL',aggregation:'RATIO',numeratorEvent:'PAYMENT_CONFIRMED',denominatorEvents:['PAYMENT_CONFIRMED','PAYMENT_REJECTED']},
 {key:'gmv',section:'REVENUE',label:'Volumen procesado',visibility:'INVESTOR',aggregation:'SUM',event:'GMV_RECORDED',valueField:'value'},
 {key:'site_unique_visitors',section:'AUDIENCE',label:'Visitantes únicos',visibility:'INVESTOR',aggregation:'GAUGE',event:'UNIQUE_VISITORS',valueField:'value'},
 {key:'page_views',section:'AUDIENCE',label:'Vistas de página',visibility:'INTERNAL',aggregation:'SUM',event:'PAGE_VIEWS',valueField:'value'},
 {key:'ai_messages_processed',section:'AI',label:'Mensajes procesados por IA',visibility:'INVESTOR',aggregation:'COUNT',event:'AI_MESSAGE_PROCESSED'},
 {key:'ai_audio_transcribed',section:'AI',label:'Audios transcritos',visibility:'INTERNAL',aggregation:'COUNT',event:'AI_AUDIO_TRANSCRIBED'},
 {key:'ai_decisions',section:'AI',label:'Decisiones automáticas',visibility:'INVESTOR',aggregation:'COUNT',event:'AI_DECISION'},
 {key:'ai_exceptions',section:'AI',label:'Excepciones que requirieron revisión',visibility:'INTERNAL',aggregation:'COUNT',event:'AI_EXCEPTION'},
 {key:'telematics_connected_vehicles',section:'TELEMATICS',label:'Unidades conectadas',visibility:'INVESTOR',aggregation:'GAUGE',event:'TELEMATICS_CONNECTED_VEHICLES',valueField:'value'},
 {key:'fuel_liters_avoided',section:'TELEMATICS',label:'Litros de combustible evitados estimados',visibility:'INVESTOR',aggregation:'SUM',event:'FUEL_LITERS_AVOIDED',valueField:'value'}
]);
export function metricByKey(key){return METRICS.find(x=>x.key===key)||null;}
export function investorMetricKeys(){return METRICS.filter(x=>x.visibility===MetricVisibility.INVESTOR).map(x=>x.key);}
