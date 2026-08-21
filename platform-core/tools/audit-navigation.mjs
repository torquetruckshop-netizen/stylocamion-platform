const DEFAULT_URLS = [
  'https://stylocamion.com',
  'https://cuentas.stylocamion.com',
  'https://ventas.stylocamion.com',
  'https://cargas.stylocamion.com',
  'https://noticias.stylocamion.com',
  'https://choferes.stylocamion.com',
];

const urls = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_URLS;
let failed = false;
const discovered = new Set();

for (const url of urls) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
    const oldBlog = /blog\.stylocamion\.com/i.test(body);
    for (const href of extractLinks(body, response.url)) {
      if (isStyloUrl(href)) discovered.add(href);
    }
    const result = {
      url,
      status: response.status,
      finalUrl: response.url,
      title,
      https: response.url.startsWith('https://'),
      oldBlogReference: oldBlog,
    };
    console.log(JSON.stringify(result));
    if (!response.ok || !result.https || oldBlog) failed = true;
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({ url, error: error.message }));
  }
}

for (const batch of chunks([...discovered], 8)) {
  const results = await Promise.all(batch.map(checkLink));
  for (const result of results) {
    console.log(JSON.stringify({ link: result }));
    if (result.status >= 400 || result.error || result.legacyHost) failed = true;
  }
}

process.exitCode = failed ? 1 : 0;

function extractLinks(html, base) {
  return [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((match) => {
      try { return new URL(match[1].replace(/&amp;/g, '&'), base).href; }
      catch { return null; }
    })
    .filter(Boolean);
}

function isStyloUrl(url) {
  const host = new URL(url).hostname;
  return host === 'stylocamion.com'
    || host.endsWith('.stylocamion.com')
    || host.endsWith('.stylocamion.chatgpt.site');
}

async function checkLink(url) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return {
      url,
      status: response.status,
      finalUrl: response.url,
      legacyHost: response.url.includes('.stylocamion.chatgpt.site'),
    };
  } catch (error) {
    return { url, error: error.message };
  }
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}
