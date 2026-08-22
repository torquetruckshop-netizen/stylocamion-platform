const fallbackNews = [
  { title: 'Agenda del transporte de cargas en Argentina', summary: 'Acceso directo a información oficial vinculada con transporte automotor de cargas, normativa y operación.', category: 'Argentina', source: 'Argentina.gob.ar', url: 'https://www.argentina.gob.ar/transporte', time: 'Fuente oficial' },
  { title: 'Economía del transporte: costos, actividad y decisiones de flota', summary: 'Seguimiento sectorial para interpretar costos operativos, financiación, actividad y renovación de unidades.', category: 'Economía', source: 'FADEEAC', url: 'https://www.fadeeac.org.ar/', time: 'Fuente sectorial' },
  { title: 'Logística argentina: tendencias, capacitación y operación', summary: 'Información institucional y técnica para empresas vinculadas a logística, supply chain y transporte.', category: 'Logística', source: 'ARLOG', url: 'https://arlog.org/', time: 'Fuente sectorial' },
  { title: 'Camiones: novedades de producto con foco en la región', summary: 'Espacio preparado para concentrar lanzamientos, actualizaciones de gama y noticias de vehículos pesados disponibles en Sudamérica.', category: 'Camiones', source: 'Stylo Camión', url: '#ultimas', time: 'Radar editorial' },
  { title: 'Remolques y semirremolques: industria, producción y novedades', summary: 'Un eje editorial propio para fabricantes, carroceros, implementos y novedades relevantes para el transporte regional.', category: 'Remolques', source: 'Stylo Camión', url: '#ultimas', time: 'Radar editorial' },
  { title: 'Rutas y normativa: cambios que impactan en la operación', summary: 'Normas, corredores, restricciones y novedades oficiales que modifican la circulación o la planificación de cargas.', category: 'Rutas y normativa', source: 'Stylo Camión', url: 'https://www.argentina.gob.ar/transporte', time: 'Seguimiento permanente' }
];

const translations = {
  es: {
    navHome:'Portada', navRoute:'Modo Ruta', navBefore:'Antes de salir', navLatest:'Últimas', navSections:'Secciones', navPlatform:'Plataforma',
    edition:'STYLO CAMIÓN NOTICIAS · ARGENTINA + SUDAMÉRICA', heroTitle:'La gente que <span>mueve al país.</span>', heroDeck:'Noticias, datos e historias para quienes trabajan, deciden y viven alrededor del transporte.', heroPrimary:'Ver noticias de hoy', heroSecondary:'Escuchar Modo Ruta', lastUpdate:'ÚLTIMA ACTUALIZACIÓN',
    trust1:'Fuentes identificadas', trust2:'Actualización automática', trust3:'Prioridad Argentina + Sudamérica', trust4:'Lectura + audio · Modo Ruta',
    routeLabel:'MODO RUTA · BOLETÍN AUTOMÁTICO', routeTitle:'Escuchá las noticias importantes del día, una detrás de otra.', routeText:'Un resumen continuo de transporte, rutas, economía, camiones, remolques y logística. Preparado para iniciar antes de salir y escuchar con el teléfono conectado al vehículo.', routeButton:'▶ Escuchar Boletín de Ruta', routeSafety:'Activá la reproducción antes de iniciar la marcha o mediante controles manos libres.',
    beforeLabel:'ANTES DE SALIR', beforeTitle:'Información operativa oficial', beforeText:'Accesos directos para revisar pasos fronterizos, rutas nacionales y alertas meteorológicas antes de iniciar un viaje.', officialSources:'FUENTES OFICIALES',
    borderTitle:'Pasos internacionales', borderText:'Estado de los pasos que conectan Argentina con los países limítrofes.', borderLink:'Consultar estado oficial ↗', roadsTitle:'Rutas nacionales', roadsText:'Consulta del estado actualizado de las rutas nacionales y observaciones de transitabilidad.', roadsLink:'Ver estado de rutas ↗', weatherTitle:'Alertas meteorológicas', weatherText:'Sistema de Alerta Temprana del Servicio Meteorológico Nacional.', weatherLink:'Ver alertas vigentes ↗',
    ephemerisLabel:'EFEMÉRIDES DEL TRANSPORTE', ephemerisTitle:'Hoy en la ruta', ephemerisSource:'Ver fuente oficial ↗', ephemerisNext:'Próxima efeméride del sector',
    searchLabel:'Buscar', latestTitle:'Últimas noticias', emptyTitle:'No encontramos noticias con ese filtro.', emptyText:'Probá otra sección o una búsqueda diferente.', actionLabel:'DEL DATO A LA ACCIÓN', actionTitle:'La noticia termina donde empieza tu operación.', loadsLink:'Publicar o encontrar cargas →', salesLink:'Ver camiones, remolques y unidades →', platformLink:'Volver a Stylo Camión →', footerText:'Selección editorial y fuentes identificadas. Argentina + Sudamérica.',
    read:'Leer →', listen:'Escuchar →', results:'resultados', result:'resultado'
  },
  pt: {
    navHome:'Capa', navRoute:'Modo Estrada', navBefore:'Antes de sair', navLatest:'Últimas', navSections:'Seções', navPlatform:'Plataforma',
    edition:'STYLO CAMIÓN NOTÍCIAS · ARGENTINA + AMÉRICA DO SUL', heroTitle:'A gente que <span>move o país.</span>', heroDeck:'Notícias, dados e histórias para quem trabalha, decide e vive em torno do transporte.', heroPrimary:'Ver notícias de hoje', heroSecondary:'Ouvir Modo Estrada', lastUpdate:'ÚLTIMA ATUALIZAÇÃO',
    trust1:'Fontes identificadas', trust2:'Atualização automática', trust3:'Prioridade Argentina + América do Sul', trust4:'Leitura + áudio · Modo Estrada',
    routeLabel:'MODO ESTRADA · BOLETIM AUTOMÁTICO', routeTitle:'Ouça as notícias mais importantes do dia, uma após a outra.', routeText:'Resumo contínuo de transporte, estradas, economia, caminhões, implementos e logística, pensado para ouvir com o telefone conectado ao veículo.', routeButton:'▶ Ouvir Boletim de Estrada', routeSafety:'Inicie a reprodução antes de dirigir ou use controles mãos livres.',
    beforeLabel:'ANTES DE SAIR', beforeTitle:'Informação operacional oficial', beforeText:'Acessos diretos para consultar fronteiras, rodovias nacionais e alertas meteorológicos antes da viagem.', officialSources:'FONTES OFICIAIS',
    borderTitle:'Passagens internacionais', borderText:'Situação das passagens que conectam a Argentina aos países vizinhos.', borderLink:'Consultar situação oficial ↗', roadsTitle:'Rodovias nacionais', roadsText:'Situação atualizada das rodovias nacionais e condições de circulação.', roadsLink:'Ver estado das rodovias ↗', weatherTitle:'Alertas meteorológicos', weatherText:'Sistema de Alerta Precoce do Serviço Meteorológico Nacional da Argentina.', weatherLink:'Ver alertas vigentes ↗',
    ephemerisLabel:'EFEMÉRIDES DO TRANSPORTE', ephemerisTitle:'Hoje na estrada', ephemerisSource:'Ver fonte oficial ↗', ephemerisNext:'Próxima efeméride do setor',
    searchLabel:'Buscar', latestTitle:'Últimas notícias', emptyTitle:'Nenhuma notícia encontrada com esse filtro.', emptyText:'Tente outra seção ou uma busca diferente.', actionLabel:'DA INFORMAÇÃO À AÇÃO', actionTitle:'A notícia termina onde começa sua operação.', loadsLink:'Publicar ou encontrar cargas →', salesLink:'Ver caminhões, implementos e unidades →', platformLink:'Voltar à Stylo Camión →', footerText:'Seleção editorial e fontes identificadas. Argentina + América do Sul.',
    read:'Ler →', listen:'Ouvir →', results:'resultados', result:'resultado'
  },
  en: {
    navHome:'Home', navRoute:'Road Mode', navBefore:'Before departure', navLatest:'Latest', navSections:'Sections', navPlatform:'Platform',
    edition:'STYLO CAMIÓN NEWS · ARGENTINA + SOUTH AMERICA', heroTitle:'The people who <span>keep the country moving.</span>', heroDeck:'News, data and stories for the people who work, decide and live around transport.', heroPrimary:'See today’s news', heroSecondary:'Listen to Road Mode', lastUpdate:'LAST UPDATE',
    trust1:'Identified sources', trust2:'Automatic updates', trust3:'Argentina + South America priority', trust4:'Reading + audio · Road Mode',
    routeLabel:'ROAD MODE · AUTOMATIC BULLETIN', routeTitle:'Listen to the day’s most important news, one after another.', routeText:'A continuous briefing on transport, roads, economics, trucks, trailers and logistics, designed to play with the phone connected to the vehicle.', routeButton:'▶ Listen to Road Bulletin', routeSafety:'Start playback before driving or use hands-free controls.',
    beforeLabel:'BEFORE DEPARTURE', beforeTitle:'Official operational information', beforeText:'Direct links to check border crossings, national roads and weather alerts before a trip.', officialSources:'OFFICIAL SOURCES',
    borderTitle:'International border crossings', borderText:'Status of crossings connecting Argentina with neighboring countries.', borderLink:'Check official status ↗', roadsTitle:'National roads', roadsText:'Updated national road conditions and traffic observations.', roadsLink:'View road conditions ↗', weatherTitle:'Weather alerts', weatherText:'Early Warning System of Argentina’s National Meteorological Service.', weatherLink:'View active alerts ↗',
    ephemerisLabel:'TRANSPORT ANNIVERSARIES', ephemerisTitle:'Today on the road', ephemerisSource:'View official source ↗', ephemerisNext:'Next transport anniversary',
    searchLabel:'Search', latestTitle:'Latest news', emptyTitle:'No news matched this filter.', emptyText:'Try another section or a different search.', actionLabel:'FROM INFORMATION TO ACTION', actionTitle:'The news ends where your operation begins.', loadsLink:'Post or find loads →', salesLink:'View trucks, trailers and units →', platformLink:'Back to Stylo Camión →', footerText:'Editorial selection and identified sources. Argentina + South America.',
    read:'Read →', listen:'Listen →', results:'results', result:'result'
  }
};

const ephemerides = [
  {
    month: 6, day: 10,
    title: { es:'Día Nacional de la Seguridad Vial', pt:'Dia Nacional da Segurança Viária na Argentina', en:'Argentina’s National Road Safety Day' },
    text: { es:'Argentina recuerda el cambio de sentido de circulación realizado el 10 de junio de 1945 y utiliza la fecha para promover conductas responsables en la vía pública.', pt:'A Argentina recorda a mudança do sentido de circulação realizada em 10 de junho de 1945 e usa a data para promover condutas responsáveis no trânsito.', en:'Argentina marks the 10 June 1945 change in traffic direction and uses the date to promote responsible road behavior.' },
    source:'https://www.argentina.gob.ar/seguridadvial/educacionvial/10-de-junio-dia-mundial-de-la-seguridad-vial'
  },
  {
    month: 10, day: 5,
    title: { es:'Día del Camino y la Educación Vial', pt:'Dia da Estrada e da Educação Viária na Argentina', en:'Argentina’s Road and Traffic Education Day' },
    text: { es:'Cada 5 de octubre se promueve en Argentina la educación vial, el respeto por las normas y el uso responsable de las vías de circulación.', pt:'Todo 5 de outubro, a Argentina promove educação viária, respeito às normas e uso responsável das vias de circulação.', en:'Every 5 October, Argentina promotes traffic education, respect for road rules and responsible use of public roads.' },
    source:'https://www.argentina.gob.ar/seguridadvial/formacion-vial/5-de-octubre-dia-del-camino-y-la-seguridad-vial'
  }
];

let news = [...fallbackNews];
let updatedAt = null;
let currentLang = localStorage.getItem('stylo-news-lang') || 'es';
const leadStory = document.querySelector('#leadStory');
const secondaryStories = document.querySelector('#secondaryStories');
const newsGrid = document.querySelector('#newsGrid');
const resultCount = document.querySelector('#resultCount');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('.filter')];
const emptyState = document.querySelector('#emptyState');
const lastUpdated = document.querySelector('#lastUpdated');
let activeCategory = 'Todas';

function t(key) { return translations[currentLang]?.[key] || translations.es[key] || key; }

function applyLanguage(lang) {
  if (!translations[lang]) lang = 'es';
  currentLang = lang;
  localStorage.setItem('stylo-news-lang', lang);
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.dataset.i18n; if (translations[lang][key]) el.textContent = translations[lang][key]; });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { const key = el.dataset.i18nHtml; if (translations[lang][key]) el.innerHTML = translations[lang][key]; });
  document.querySelectorAll('.lang-button').forEach(button => button.classList.toggle('active', button.dataset.lang === lang));
  renderEphemeris();
  updateTimestamp();
  renderTop();
  renderGrid();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function clientId(item) {
  if (item.id) return String(item.id);
  return String(item.title || 'noticia').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function articleHref(item) { return `noticia.html?id=${encodeURIComponent(clientId(item))}`; }

function displayTime(item) {
  const raw = item.published_at || item.time;
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return item.time || 'Reciente';
  const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'en' ? 'en-US' : 'es-AR';
  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / 3600000));
  if (currentLang === 'es') {
    if (diffHours < 1) return 'Hace menos de 1 h';
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const d = Math.floor(diffHours / 24); if (d <= 7) return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  if (currentLang === 'pt') {
    if (diffHours < 1) return 'Há menos de 1 h';
    if (diffHours < 24) return `Há ${diffHours} h`;
    const d = Math.floor(diffHours / 24); if (d <= 7) return `Há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  }
  if (currentLang === 'en') {
    if (diffHours < 1) return 'Less than 1 h ago';
    if (diffHours < 24) return `${diffHours} h ago`;
    const d = Math.floor(diffHours / 24); if (d <= 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  }
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function storyActions(href) {
  return `<div class="story-actions"><a class="story-link" href="${href}">${t('read')}</a><a class="story-link listen-link" href="${href}#escuchar">${t('listen')}</a></div>`;
}

function articleMarkup(item, type = 'card') {
  const title = escapeHtml(item.title);
  const summary = escapeHtml(item.summary || '');
  const category = escapeHtml(item.category || 'Actualidad');
  const source = escapeHtml(item.source || 'Fuente identificada');
  const time = escapeHtml(displayTime(item));
  const href = articleHref(item);
  if (type === 'lead') return `<div class="story-ribbon"><span class="tag">${category}</span><span>RADAR REGIONAL</span></div><div class="story-content"><div class="meta"><span>${source}</span><span>·</span><span>${time}</span></div><h2><a class="headline-link" href="${href}">${title}</a></h2><p>${summary}</p>${storyActions(href)}</div>`;
  if (type === 'secondary') return `<article class="secondary-story"><div class="meta"><span class="tag">${category}</span><span>${source}</span><span>·</span><span>${time}</span></div><h3><a class="headline-link" href="${href}">${title}</a></h3>${storyActions(href)}</article>`;
  return `<article class="news-card"><div class="meta"><span class="tag">${category}</span><span>${source}</span><span>·</span><span>${time}</span></div><h3><a class="headline-link" href="${href}">${title}</a></h3><p>${summary}</p>${storyActions(href)}</article>`;
}

function pickTopStories() {
  if (!news.length) return fallbackNews.slice(0, 3);
  const selected = [news[0]];
  const usedCategories = new Set([news[0].category]);
  for (const item of news.slice(1)) { if (!usedCategories.has(item.category)) { selected.push(item); usedCategories.add(item.category); } if (selected.length === 3) break; }
  if (selected.length < 3) for (const item of news) { if (!selected.includes(item)) selected.push(item); if (selected.length === 3) break; }
  return selected;
}

function renderTop() {
  const top = pickTopStories();
  leadStory.innerHTML = articleMarkup(top[0] || fallbackNews[0], 'lead');
  secondaryStories.innerHTML = top.slice(1, 3).map(item => articleMarkup(item, 'secondary')).join('');
}

function renderGrid() {
  const term = search.value.trim().toLowerCase();
  const filtered = news.filter(item => {
    const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
    const haystack = `${item.title} ${item.summary} ${item.category} ${item.source}`.toLowerCase();
    return matchesCategory && (!term || haystack.includes(term));
  });
  newsGrid.innerHTML = filtered.map(item => articleMarkup(item)).join('');
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? t('result') : t('results')}`;
  emptyState.hidden = filtered.length !== 0;
}

function updateTimestamp() {
  const date = updatedAt ? new Date(updatedAt) : new Date();
  const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'en' ? 'en-US' : 'es-AR';
  lastUpdated.textContent = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function dayKey(date) { return { month: date.getMonth() + 1, day: date.getDate() }; }

function nextEphemeris(now) {
  const currentYear = now.getFullYear();
  const dates = ephemerides.map(item => {
    let date = new Date(currentYear, item.month - 1, item.day);
    if (date < new Date(currentYear, now.getMonth(), now.getDate())) date = new Date(currentYear + 1, item.month - 1, item.day);
    return { item, date };
  }).sort((a,b) => a.date - b.date);
  return dates[0];
}

function renderEphemeris() {
  const dateEl = document.querySelector('#ephemerisDate');
  const headline = document.querySelector('#ephemerisHeadline');
  const text = document.querySelector('#ephemerisText');
  const source = document.querySelector('#ephemerisSource');
  if (!dateEl || !headline || !text || !source) return;
  const now = new Date();
  const key = dayKey(now);
  const today = ephemerides.find(item => item.month === key.month && item.day === key.day);
  const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'en' ? 'en-US' : 'es-AR';
  if (today) {
    dateEl.textContent = new Intl.DateTimeFormat(locale, { day:'2-digit', month:'long' }).format(now);
    headline.textContent = today.title[currentLang] || today.title.es;
    text.textContent = today.text[currentLang] || today.text.es;
    source.href = today.source; source.hidden = false; source.textContent = t('ephemerisSource');
    return;
  }
  const next = nextEphemeris(now);
  dateEl.textContent = new Intl.DateTimeFormat(locale, { day:'2-digit', month:'long' }).format(next.date);
  headline.textContent = `${t('ephemerisNext')}: ${next.item.title[currentLang] || next.item.title.es}`;
  text.textContent = next.item.text[currentLang] || next.item.text.es;
  source.href = next.item.source; source.hidden = false; source.textContent = t('ephemerisSource');
}

async function loadAutomaticNews() {
  try {
    const response = await fetch(`data/news.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Feed no disponible');
    const payload = await response.json();
    if (Array.isArray(payload.items) && payload.items.length >= 3) { news = payload.items; updatedAt = payload.updated_at || null; }
  } catch (error) {
    console.info('Se usa contenido editorial de respaldo hasta la próxima actualización automática.');
  }
  updateTimestamp(); renderTop(); renderGrid(); renderEphemeris();
}

filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.remove('active'));
  button.classList.add('active'); activeCategory = button.dataset.category; renderGrid();
}));

search.addEventListener('input', renderGrid);
document.querySelector('.menu-button').addEventListener('click', event => {
  const menu = document.querySelector('#menu');
  const open = menu.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.lang-button').forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
document.querySelector('#year').textContent = new Date().getFullYear();
applyLanguage(currentLang);
loadAutomaticNews();
