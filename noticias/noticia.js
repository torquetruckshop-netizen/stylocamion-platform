const articlePage = document.querySelector('#articlePage');
const articleSide = document.querySelector('#articleSide');
const relatedNews = document.querySelector('#relatedNews');
const params = new URLSearchParams(window.location.search);
const requestedId = params.get('id') || '';
let activeUtterance = null;

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

function displayTime(item) {
  const raw = item.published_at || item.time;
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return item.time || 'Reciente';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' }).format(parsed);
}

function contextText(category) {
  const copy = {
    'Argentina': 'La seguimos porque puede afectar condiciones de operación, costos, normativa o decisiones de empresas transportistas en el mercado argentino.',
    'Región': 'La seguimos por su posible impacto sobre corredores internacionales, fronteras, puertos y movimientos de carga dentro de Sudamérica.',
    'Camiones': 'La seguimos porque los cambios de producto, tecnología y oferta de unidades inciden en renovación de flota, productividad y costo total de operación.',
    'Remolques': 'La seguimos porque remolques, semirremolques e implementos son parte central de la productividad y configuración de una operación de transporte.',
    'Logística': 'La seguimos porque aporta información para planificación, productividad, distribución y gestión de cadenas de suministro.',
    'Economía': 'La seguimos porque tasas, combustible, tarifas y actividad económica modifican costos por kilómetro, financiación y decisiones de inversión.',
    'Rutas y normativa': 'La seguimos porque los cambios regulatorios y de infraestructura pueden modificar circulación, configuraciones habilitadas y planificación operativa.'
  };
  return copy[category] || 'La seguimos por su relevancia para las decisiones operativas y comerciales del transporte regional.';
}

function actionFor(category) {
  if (['Camiones', 'Remolques', 'Economía'].includes(category)) {
    return { label: 'Explorar Stylo Ventas', text: 'Unidades, remolques y oportunidades comerciales.', url: 'https://ventas.stylocamion.com' };
  }
  if (['Logística', 'Argentina', 'Región', 'Rutas y normativa'].includes(category)) {
    return { label: 'Explorar Stylo Cargas', text: 'Cargas y oportunidades para la operación logística.', url: 'https://cargas.stylocamion.com' };
  }
  return { label: 'Volver a la plataforma', text: 'Acceder al ecosistema completo de Stylo Camión.', url: '/' };
}

function relatedMarkup(item) {
  const href = `noticia.html?id=${encodeURIComponent(clientId(item))}`;
  return `<article class="news-card related-card">
    <div class="meta"><span class="tag">${escapeHtml(item.category || 'Actualidad')}</span><span>${escapeHtml(item.source || 'Fuente identificada')}</span></div>
    <h3><a class="headline-link" href="${href}">${escapeHtml(item.title)}</a></h3>
    <a class="story-link" href="${href}">Leer en Stylo Camión →</a>
  </article>`;
}

function speechText(item, category, source) {
  return [
    'Stylo Camión Noticias.',
    item.title,
    item.summary || '',
    'Por qué importa.',
    contextText(category),
    `Fuente: ${source}.`
  ].filter(Boolean).join(' ');
}

function setupAudioReader(item, category, source) {
  const play = document.querySelector('#listenPlay');
  const pause = document.querySelector('#listenPause');
  const stop = document.querySelector('#listenStop');
  const status = document.querySelector('#listenStatus');

  if (!play || !status) return;

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    play.disabled = true;
    if (pause) pause.disabled = true;
    if (stop) stop.disabled = true;
    status.textContent = 'La lectura por voz no está disponible en este navegador.';
    return;
  }

  function setStatus(text) {
    status.textContent = text;
  }

  play.addEventListener('click', () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('Reproduciendo');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText(item, category, source));
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase() === 'es-ar') || voices.find(voice => voice.lang.toLowerCase().startsWith('es')) || null;
    utterance.lang = utterance.voice?.lang || 'es-AR';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setStatus('Reproduciendo');
    utterance.onend = () => setStatus('Lectura finalizada');
    utterance.onerror = () => setStatus('No se pudo reproducir la lectura en este dispositivo.');
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });

  pause?.addEventListener('click', () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus('Pausado');
    }
  });

  stop?.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    activeUtterance = null;
    setStatus('Detenido');
  });
}

function renderArticle(item, allItems) {
  const category = item.category || 'Actualidad';
  const source = item.source || 'Fuente identificada';
  const sourceUrl = /^https?:\/\//i.test(item.url || '') ? item.url : '';
  const action = actionFor(category);
  const pageUrl = window.location.href;
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(pageUrl)}`;

  document.title = `${item.title} | Stylo Camión Noticias`;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.setAttribute('content', item.summary || 'Noticia seleccionada por Stylo Camión.');

  articlePage.innerHTML = `
    <a class="back-link" href="index.html">← Volver a Noticias</a>
    <div class="article-kicker"><span class="tag">${escapeHtml(category)}</span><span>${escapeHtml(source)}</span><span>·</span><span>${escapeHtml(displayTime(item))}</span></div>
    <h1>${escapeHtml(item.title)}</h1>
    <p class="article-lead">${escapeHtml(item.summary || '')}</p>
    <section class="listen-box" id="escuchar" aria-label="Escuchar esta noticia">
      <div class="listen-copy">
        <span class="listen-label">MODO RUTA</span>
        <strong>Escuchar esta noticia</strong>
        <p>Título, resumen y contexto leídos en voz alta. Activá la reproducción antes de iniciar la marcha o mediante controles manos libres.</p>
      </div>
      <div class="listen-controls">
        <button type="button" class="listen-primary" id="listenPlay">Escuchar</button>
        <button type="button" id="listenPause">Pausar</button>
        <button type="button" id="listenStop">Detener</button>
        <span id="listenStatus" aria-live="polite">Listo para escuchar</span>
      </div>
    </section>
    <div class="article-divider"></div>
    <section class="article-context">
      <p class="eyebrow">POR QUÉ IMPORTA</p>
      <h2>Qué significa para el sector</h2>
      <p>${escapeHtml(contextText(category))}</p>
    </section>
    <section class="article-source-note">
      <strong>Sobre esta publicación</strong>
      <p>Stylo Camión selecciona, ordena y contextualiza información publicada por fuentes identificadas. Para ampliar datos, declaraciones o documentación original, consultá la publicación de origen.</p>
      ${sourceUrl ? `<a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Ver fuente original: ${escapeHtml(source)} →</a>` : ''}
    </section>
    <div class="share-row">
      <strong>Compartir</strong>
      <a href="${xUrl}" target="_blank" rel="noopener">X</a>
      <button type="button" id="copyLink">Copiar enlace</button>
      <span id="copyStatus" aria-live="polite"></span>
    </div>`;

  articleSide.insertAdjacentHTML('beforeend', `
    <section class="action-box">
      <span class="side-label">RELACIONADO CON TU OPERACIÓN</span>
      <strong>${escapeHtml(action.label)}</strong>
      <p>${escapeHtml(action.text)}</p>
      <a href="${escapeHtml(action.url)}">Ingresar →</a>
    </section>`);

  const related = allItems
    .filter(candidate => clientId(candidate) !== clientId(item))
    .sort((a, b) => Number(b.category === category) - Number(a.category === category))
    .slice(0, 3);
  relatedNews.innerHTML = related.map(relatedMarkup).join('');

  setupAudioReader(item, category, source);

  document.querySelector('#copyLink')?.addEventListener('click', async () => {
    const status = document.querySelector('#copyStatus');
    try {
      await navigator.clipboard.writeText(pageUrl);
      status.textContent = 'Enlace copiado';
    } catch (error) {
      status.textContent = 'Copiá la dirección del navegador';
    }
  });
}

function renderMissing() {
  articlePage.innerHTML = `
    <a class="back-link" href="index.html">← Volver a Noticias</a>
    <p class="eyebrow">STYLO CAMIÓN · NOTICIAS</p>
    <h1>Esta noticia ya no está disponible en el radar actual.</h1>
    <p class="article-lead">El radar se renueva automáticamente para priorizar información reciente. Podés volver a la portada y continuar con las últimas noticias.</p>
    <a class="source-link" href="index.html">Ir a Últimas noticias →</a>`;
}

async function init() {
  try {
    const response = await fetch(`data/news.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Feed no disponible');
    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const item = items.find(candidate => clientId(candidate) === requestedId);
    if (!item) return renderMissing();
    renderArticle(item, items);
  } catch (error) {
    renderMissing();
  }
}

window.addEventListener('beforeunload', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});

document.querySelector('#year').textContent = new Date().getFullYear();
init();