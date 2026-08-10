const fallbackNews = [
  { title: 'Agenda del transporte de cargas en Argentina', summary: 'Acceso directo a información oficial vinculada con transporte automotor de cargas, normativa y operación.', category: 'Argentina', source: 'Argentina.gob.ar', url: 'https://www.argentina.gob.ar/transporte', time: 'Fuente oficial' },
  { title: 'Economía del transporte: costos, actividad y decisiones de flota', summary: 'Seguimiento sectorial para interpretar costos operativos, financiación, actividad y renovación de unidades.', category: 'Economía', source: 'FADEEAC', url: 'https://www.fadeeac.org.ar/', time: 'Fuente sectorial' },
  { title: 'Logística argentina: tendencias, capacitación y operación', summary: 'Información institucional y técnica para empresas vinculadas a logística, supply chain y transporte.', category: 'Logística', source: 'ARLOG', url: 'https://arlog.org/', time: 'Fuente sectorial' },
  { title: 'Camiones: novedades de producto con foco en la región', summary: 'Espacio preparado para concentrar lanzamientos, actualizaciones de gama y noticias de vehículos pesados disponibles en Sudamérica.', category: 'Camiones', source: 'Stylo Camión', url: '#ultimas', time: 'Radar editorial' },
  { title: 'Remolques y semirremolques: industria, producción y novedades', summary: 'Un eje editorial propio para fabricantes, carroceros, implementos y novedades relevantes para el transporte regional.', category: 'Remolques', source: 'Stylo Camión', url: '#ultimas', time: 'Radar editorial' },
  { title: 'Rutas y normativa: cambios que impactan en la operación', summary: 'Normas, corredores, restricciones y novedades oficiales que modifican la circulación o la planificación de cargas.', category: 'Rutas y normativa', source: 'Stylo Camión', url: 'https://www.argentina.gob.ar/transporte', time: 'Seguimiento permanente' }
];

let news = [...fallbackNews];
let updatedAt = null;
const leadStory = document.querySelector('#leadStory');
const secondaryStories = document.querySelector('#secondaryStories');
const newsGrid = document.querySelector('#newsGrid');
const resultCount = document.querySelector('#resultCount');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('.filter')];
const emptyState = document.querySelector('#emptyState');
const lastUpdated = document.querySelector('#lastUpdated');
let activeCategory = 'Todas';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function clientId(item) {
  if (item.id) return String(item.id);
  return String(item.title || 'noticia')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function articleHref(item) {
  return `noticia.html?id=${encodeURIComponent(clientId(item))}`;
}

function displayTime(item) {
  const raw = item.published_at || item.time;
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return item.time || 'Reciente';

  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / 3600000));
  if (diffHours < 1) return 'Hace menos de 1 h';
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function articleMarkup(item, type = 'card') {
  const title = escapeHtml(item.title);
  const summary = escapeHtml(item.summary || '');
  const category = escapeHtml(item.category || 'Actualidad');
  const source = escapeHtml(item.source || 'Fuente identificada');
  const time = escapeHtml(displayTime(item));
  const href = articleHref(item);

  if (type === 'lead') {
    return `<div class="story-ribbon"><span class="tag">${category}</span><span>RADAR REGIONAL</span></div><div class="story-content"><div class="meta"><span>${source}</span><span>·</span><span>${time}</span></div><h2><a class="headline-link" href="${href}">${title}</a></h2><p>${summary}</p><a class="story-link" href="${href}">Leer en Stylo Camión →</a></div>`;
  }

  if (type === 'secondary') {
    return `<article class="secondary-story"><div class="meta"><span class="tag">${category}</span><span>${source}</span><span>·</span><span>${time}</span></div><h3><a class="headline-link" href="${href}">${title}</a></h3><a class="story-link" href="${href}">Leer en Stylo Camión →</a></article>`;
  }

  return `<article class="news-card"><div class="meta"><span class="tag">${category}</span><span>${source}</span><span>·</span><span>${time}</span></div><h3><a class="headline-link" href="${href}">${title}</a></h3><p>${summary}</p><a class="story-link" href="${href}">Leer en Stylo Camión →</a></article>`;
}

function pickTopStories() {
  if (!news.length) return fallbackNews.slice(0, 3);
  const selected = [news[0]];
  const usedCategories = new Set([news[0].category]);

  for (const item of news.slice(1)) {
    if (!usedCategories.has(item.category)) {
      selected.push(item);
      usedCategories.add(item.category);
    }
    if (selected.length === 3) break;
  }

  if (selected.length < 3) {
    for (const item of news) {
      if (!selected.includes(item)) selected.push(item);
      if (selected.length === 3) break;
    }
  }
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
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;
  emptyState.hidden = filtered.length !== 0;
}

function updateTimestamp() {
  const date = updatedAt ? new Date(updatedAt) : new Date();
  lastUpdated.textContent = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

async function loadAutomaticNews() {
  try {
    const response = await fetch(`data/news.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Feed no disponible');
    const payload = await response.json();
    if (Array.isArray(payload.items) && payload.items.length >= 3) {
      news = payload.items;
      updatedAt = payload.updated_at || null;
    }
  } catch (error) {
    console.info('Se usa contenido editorial de respaldo hasta la próxima actualización automática.');
  }
  updateTimestamp();
  renderTop();
  renderGrid();
}

filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  activeCategory = button.dataset.category;
  renderGrid();
}));

search.addEventListener('input', renderGrid);
document.querySelector('.menu-button').addEventListener('click', event => {
  const menu = document.querySelector('#menu');
  const open = menu.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});

document.querySelector('#year').textContent = new Date().getFullYear();
loadAutomaticNews();
