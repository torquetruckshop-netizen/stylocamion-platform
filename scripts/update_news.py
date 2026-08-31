import hashlib
import html
import json
import re
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path

import feedparser

QUERIES = [
    ("Ruta, salud y seguridad", 'camioneros salud sedentarismo estrés sobrepeso alimentación descanso conducción accidentes paradores Argentina when:365d'),
    ("Camiones y mercado", 'camiones Argentina patentamientos ventas lanzamientos camiones chinos crédito financiación when:120d'),
    ("Logística y puertos", 'logística última milla puertos descarga Vaca Muerta transporte cargas Argentina when:120d'),
    ("Técnica y equipos", 'neumáticos repuestos remolques semirremolques tecnología transporte Argentina Sudamérica when:120d'),
    ("Economía y costos", 'FADEEAC índice costos combustible tarifas tasas crédito camiones Argentina when:120d'),
    ("Región", 'transporte cargas Sudamérica fronteras puertos corredores Mercosur when:90d'),
]

BLOCKED_TERMS = [
    'europa', 'europeo', 'alemania', 'francia', 'reino unido', 'españa', 'italia',
]

REGIONAL_TERMS = [
    'argentina', 'brasil', 'chile', 'uruguay', 'paraguay', 'bolivia', 'perú', 'peru',
    'colombia', 'sudamérica', 'sudamerica', 'mercosur', 'latinoamérica', 'latinoamerica'
]

TRUSTED_SOURCE_TERMS = [
    'argentina.gob.ar', 'boletín oficial', 'boletin oficial', 'fadeeac', 'arlog',
    'who.int', 'msal.gob.ar', 'vialidad nacional', 'acara',
]

STOPWORDS = {
    'para', 'como', 'desde', 'hasta', 'sobre', 'entre', 'ante', 'tras', 'esta',
    'este', 'estos', 'estas', 'unas', 'unos', 'nuevo', 'nueva', 'nuevos',
    'nuevas', 'argentina', 'camion', 'camiones', 'transporte', 'cargas',
}
MAX_AGE_DAYS = 365
MAX_ITEMS_PER_CATEGORY = 10
OUT = Path(__file__).resolve().parents[1] / 'noticias' / 'data' / 'news.json'
ARCHIVE_DIR = OUT.parent / 'archive'


def clean(text):
    text = html.unescape(text or '')
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize(text):
    text = clean(text).lower()
    text = re.sub(r'[^a-záéíóúüñ0-9 ]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def title_tokens(title):
    return {
        token for token in normalize(title).split()
        if len(token) >= 4 and token not in STOPWORDS
    }


def is_near_duplicate(tokens, previous_token_sets):
    if len(tokens) < 3:
        return False
    for previous in previous_token_sets:
        overlap = len(tokens & previous)
        if overlap >= 3 and overlap / min(len(tokens), len(previous)) >= 0.6:
            return True
    return False


def clean_title(title, source):
    title = clean(title)
    source = clean(source)
    if source:
        suffix = f' - {source}'
        if title.lower().endswith(suffix.lower()):
            title = title[:-len(suffix)].strip()
    return title


def article_id(title, source):
    seed = f'{normalize(title)}|{normalize(source)}'.encode('utf-8')
    return hashlib.sha1(seed).hexdigest()[:14]


def published_datetime(entry):
    parsed = entry.get('published_parsed') or entry.get('updated_parsed')
    if not parsed:
        return None
    try:
        return datetime(*parsed[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def is_recent(published_at):
    if not published_at:
        return True
    return published_at >= datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)


def is_relevant(title, summary):
    haystack = f'{title} {summary}'.lower()
    if any(term in haystack for term in BLOCKED_TERMS) and not any(term in haystack for term in REGIONAL_TERMS):
        return False
    return True


def regional_score(title, summary, source, published_at):
    haystack = f'{title} {summary}'.lower()
    source_l = source.lower()
    score = 0

    if 'argentina' in haystack:
        score += 18
    if any(term in haystack for term in REGIONAL_TERMS):
        score += 10
    if any(term in source_l for term in TRUSTED_SOURCE_TERMS):
        score += 14

    if published_at:
        age_hours = max(0, (datetime.now(timezone.utc) - published_at).total_seconds() / 3600)
        score += max(0, 80 - min(age_hours / 10, 80))

    return round(score, 2)


def useful_summary(title, summary, source, category):
    summary = clean(summary)
    title_norm = normalize(title)
    summary_norm = normalize(summary)
    source_norm = normalize(source)

    if not summary or summary_norm == title_norm or summary_norm in {
        f'{title_norm} {source_norm}'.strip(),
        f'{title_norm} {source_norm} '.strip(),
    }:
        return f'Información reciente de {category.lower()} seleccionada por el radar regional de Stylo Camión.'

    if title_norm and title_norm in summary_norm and len(summary_norm) <= len(title_norm) + len(source_norm) + 20:
        return f'Información reciente de {category.lower()} seleccionada por el radar regional de Stylo Camión.'

    return summary[:260]


def google_news_rss(query):
    encoded = urllib.parse.quote(query)
    return f'https://news.google.com/rss/search?q={encoded}&hl=es-419&gl=AR&ceid=AR:es-419'


def parse_iso(value):
    try:
        return datetime.fromisoformat((value or '').replace('Z', '+00:00'))
    except (TypeError, ValueError):
        return None


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)


def merge_monthly_archive(items, updated_at):
    grouped = {}
    for item in items:
        published = parse_iso(item.get('published_at')) or datetime.now(timezone.utc)
        grouped.setdefault(published.strftime('%Y-%m'), []).append(item)

    for month, incoming in grouped.items():
        path = ARCHIVE_DIR / f'{month}.json'
        existing = []
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding='utf-8')).get('items', [])
            except (OSError, json.JSONDecodeError, AttributeError):
                existing = []

        merged = {
            item['id']: item
            for item in existing + incoming
            if isinstance(item, dict) and item.get('id')
        }
        ordered = sorted(
            merged.values(),
            key=lambda item: item.get('published_at') or '',
            reverse=True,
        )
        write_json(path, {'month': month, 'updated_at': updated_at, 'items': ordered})

    months = []
    for path in sorted(ARCHIVE_DIR.glob('????-??.json'), reverse=True):
        payload = json.loads(path.read_text(encoding='utf-8'))
        archived = payload.get('items', [])
        months.append({
            'month': path.stem,
            'file': path.name,
            'count': len(archived),
            'newest_at': archived[0].get('published_at') if archived else None,
        })
    write_json(ARCHIVE_DIR / 'index.json', {'updated_at': updated_at, 'months': months})


def main():
    items = []
    seen_titles = set()
    seen_token_sets = []

    for category, query in QUERIES:
        feed = feedparser.parse(google_news_rss(query))
        for entry in feed.entries[:24]:
            source = clean((entry.get('source') or {}).get('title', 'Fuente externa'))
            title = clean_title(entry.get('title', ''), source)
            summary = clean(entry.get('summary', ''))
            link = entry.get('link', '')
            published_at = published_datetime(entry)
            key = normalize(title)
            tokens = title_tokens(title)

            if not title or not link or not key or key in seen_titles:
                continue
            if is_near_duplicate(tokens, seen_token_sets):
                continue
            if not is_recent(published_at):
                continue
            if not is_relevant(title, summary):
                continue

            seen_titles.add(key)
            seen_token_sets.append(tokens)
            items.append({
                'id': article_id(title, source),
                'title': title,
                'summary': useful_summary(title, summary, source, category),
                'category': category,
                'source': source,
                'url': link,
                'published_at': published_at.isoformat() if published_at else None,
                'time': entry.get('published', 'Reciente'),
                '_score': regional_score(title, summary, source, published_at),
            })

    items.sort(key=lambda item: (item['_score'], item.get('published_at') or ''), reverse=True)
    for item in items:
        item.pop('_score', None)

    buckets = {category: [] for category, _query in QUERIES}
    for item in items:
        bucket = buckets[item['category']]
        if len(bucket) < MAX_ITEMS_PER_CATEGORY:
            bucket.append(item)

    selected_items = []
    while any(buckets.values()):
        for category, _query in QUERIES:
            if buckets[category]:
                selected_items.append(buckets[category].pop(0))

    updated_at = datetime.now(timezone.utc).isoformat()
    selected_items = selected_items[:60]
    payload = {
        'updated_at': updated_at,
        'items': selected_items,
    }

    write_json(OUT, payload)
    merge_monthly_archive(selected_items, updated_at)
    print(f'Noticias guardadas: {len(payload["items"])}')


if __name__ == '__main__':
    main()
