import hashlib
import html
import json
import re
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path

import feedparser

QUERIES = [
    ("Argentina", 'transporte cargas camiones Argentina when:45d'),
    ("Camiones", 'camiones pesados Argentina OR Brasil OR Chile OR Uruguay OR Paraguay when:45d'),
    ("Remolques", 'remolques semirremolques Argentina OR Brasil OR Uruguay when:60d'),
    ("Logística", 'logística transporte cargas Argentina Sudamérica when:45d'),
    ("Economía", 'transporte cargas combustible tarifas crédito tasas Argentina when:45d'),
    ("Rutas y normativa", 'rutas transporte cargas normativa Argentina bitrenes pesos dimensiones when:60d'),
    ("Región", 'transporte cargas Sudamérica fronteras puertos corredores Mercosur when:45d'),
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
]

MAX_AGE_DAYS = 75
OUT = Path(__file__).resolve().parents[1] / 'noticias' / 'data' / 'news.json'


def clean(text):
    text = html.unescape(text or '')
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize(text):
    text = clean(text).lower()
    text = re.sub(r'[^a-záéíóúüñ0-9 ]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


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


def main():
    items = []
    seen_titles = set()

    for category, query in QUERIES:
        feed = feedparser.parse(google_news_rss(query))
        for entry in feed.entries[:20]:
            source = clean((entry.get('source') or {}).get('title', 'Fuente externa'))
            title = clean_title(entry.get('title', ''), source)
            summary = clean(entry.get('summary', ''))
            link = entry.get('link', '')
            published_at = published_datetime(entry)
            key = normalize(title)

            if not title or not link or not key or key in seen_titles:
                continue
            if not is_recent(published_at):
                continue
            if not is_relevant(title, summary):
                continue

            seen_titles.add(key)
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

    payload = {
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'items': items[:60],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Noticias guardadas: {len(payload["items"])}')


if __name__ == '__main__':
    main()
