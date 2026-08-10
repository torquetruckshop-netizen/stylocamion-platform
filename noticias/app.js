const news = [
  {
    title: 'Agenda del transporte de cargas en Argentina',
    summary: 'Acceso directo a información oficial vinculada con transporte automotor de cargas, normativa y operación.',
    category: 'Argentina',
    source: 'Argentina.gob.ar',
    url: 'https://www.argentina.gob.ar/transporte',
    time: 'Fuente oficial',
    featured: true
  },
  {
    title: 'Economía del transporte: costos, actividad y decisiones de flota',
    summary: 'Seguimiento sectorial para interpretar costos operativos, financiación, actividad y renovación de unidades.',
    category: 'Economía',
    source: 'FADEEAC',
    url: 'https://www.fadeeac.org.ar/',
    time: 'Fuente sectorial',
    featured: true
  },
  {
    title: 'Logística argentina: tendencias, capacitación y operación',
    summary: 'Información institucional y técnica para empresas vinculadas a logística, supply chain y transporte.',
    category: 'Logística',
    source: 'ARLOG',
    url: 'https://arlog.org/',
    time: 'Fuente sectorial',
    featured: true
  },
  {
    title: 'Camiones: novedades de producto con foco en la región',
    summary: 'Espacio preparado para concentrar lanzamientos, actualizaciones de gama y noticias de vehículos pesados disponibles en Sudamérica.',
    category: 'Camiones',
    source: 'Stylo Camión',
    url: '#ultimas',
    time: 'Radar editorial'
  },
  {
    title: 'Remolques y semirremolques: industria, producción y novedades',
    summary: 'Un eje editorial propio para fabricantes, carroceros, implementos y novedades relevantes para el transporte regional.',
    category: 'Remolques',
    source: 'Stylo Camión',
    url: '#ultimas',
    time: 'Radar editorial'
  },
  {
    title: 'Rutas y normativa: cambios que impactan en la operación',
    summary: 'Normas, corredores, restricciones y novedades oficiales que modifican la circulación o la planificación de cargas.',
    category: 'Rutas y normativa',
    source: 'Stylo Camión',
    url: 'https://www.argentina.gob.ar/transporte',
    time: 'Seguimiento permanente'
  },
  {
    title: 'Región: corredores y comercio entre países sudamericanos',
    summary: 'Seguimiento de pasos fronterizos, corredores internacionales, puertos y decisiones que afectan al transporte regional.',
    category: 'Región',
    source: 'Stylo Camión',
    url: '#ultimas',
    time: 'Radar regional'
  },
  {
    title: 'Combustibles, crédito y tarifas: variables para seguir de cerca',
    summary: 'Una lectura enfocada en las variables que modifican el costo por kilómetro y las decisiones comerciales de transportistas.',
    category: 'Economía',
    source: 'Stylo Camión',
    url: '#ultimas',
    time: 'Radar económico'
  }
];

const leadStory = document.querySelector('#leadStory');
const secondaryStories = document.querySelector('#secondaryStories');
const newsGrid = document.querySelector('#newsGrid');
const resultCount = document.querySelector('#resultCount');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('.filter')];
const emptyState = document.querySelector('#emptyState');
const lastUpdated = document.querySelector('#lastUpdated');
let activeCategory = 'Todas';

function articleMarkup(item, type = 'card') {
  const safeTarget = item.url.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  if (type === 'lead') {
    return `
      <div class="story-media"><span class="tag">${item.category}</span></div>
      <div class="story-content">
        <div class="meta"><span class="tag">${item.category}</span><span>${item.source}</span><span>·</span><span>${item.time}</span></div>
        <h2>${item.title}</h2>
        <p>${item.summary}</p>
        <a class="story-link" href="${item.url}"${safeTarget}>Leer / ir a la fuente →</a>
      </div>`;
  }
  if (type === 'secondary') {
    return `<article class="secondary-story">
      <div class="meta"><span class="tag">${item.category}</span><span>${item.source}</span></div>
      <h3>${item.title}</h3>
      <a class="story-link" href="${item.url}"${safeTarget}>Abrir →</a>
    </article>`;
  }
  return `<article class="news-card">
    <div class="meta"><span class="tag">${item.category}</span><span>${item.source}</span></div>
    <h3>${item.title}</h3>
    <p>${item.summary}</p>
    <a class="story-link" href="${item.url}"${safeTarget}>Leer / ir a la fuente →</a>
  </article>`;
}

function renderTop() {
  const featured = news.filter(item => item.featured);
  leadStory.innerHTML = articleMarkup(featured[0], 'lead');
  secondaryStories.innerHTML = featured.slice(1, 3).map(item => articleMarkup(item, 'secondary')).join('');
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

const now = new Date();
lastUpdated.textContent = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(now);
document.querySelector('#year').textContent = now.getFullYear();
renderTop();
renderGrid();
