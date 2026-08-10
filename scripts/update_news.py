import json
import re
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import feedparser

QUERIES = [
    ("Argentina", 'transporte cargas camiones Argentina'),
    ("Camiones", 'camiones pesados Argentina OR Brasil OR Chile OR Uruguay OR Paraguay'),
    ("Remolques", 'remolques semirremolques Argentina OR Brasil OR Uruguay'),
    ("Logística", 'logística transporte cargas Argentina Sudamérica'),
    ("Economía", 'transporte cargas combustible tarifas crédito Argentina'),
    ("Rutas y normativa", 'rutas transporte cargas normativa Argentina'),
    ("Región", 'transporte cargas Sudamérica fronteras puertos corredores'),
]

BLOCKED_TERMS = [
    'europa', 'europeo', 'alemania', 'francia', 'reino unido', 'españa', 'italia',
]

REGIONAL_TERMS = [
    'argentina', 'brasil', 'chile', 'uruguay', 'paraguay', 'bolivia', 'perú', 'peru',
    'colombia', 'sudamérica', 'sudamerica', 'mercosur', 'latinoamérica', 'latinoamerica'
]

OUT = Path(__file__).resolve().parents[1] / 'noticias' / 'data' / 'news.json'


def clean(text):
    text = re.sub(r'<[^>]+>', ' ', text or '')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def is_relevant(title, summary):
    haystack = f'{title} {summary}'.lower()
    if any(term in haystack for term in BLOCKED_TERMS) and not any(term in haystack for term in REGIONAL_TERMS):
        return False
    return True


def google_news_rss(query):
    encoded = urllib.parse.quote(query)
    return f'https://news.google.com/rss/search?q={encoded}&hl=es-419&gl=AR&ceid=AR:es-419'


def main():
    items = []
    seen = set()
    for category, query in QUERIES:
        feed = feedparser.parse(google_news_rss(query))
        for entry in feed.entries[:14]:
            title = clean(entry.get('title', ''))
            summary = clean(entry.get('summary', ''))
            link = entry.get('link', '')
            source = clean((entry.get('source') or {}).get('title', 'Fuente externa'))
            if not title or not link or title.lower() in seen:
                continue
            if not is_relevant(title, summary):
                continue
            seen.add(title.lower())
            items.append({
                'title': title,
                'summary': summary[:320] if summary else 'Información reciente seleccionada para el radar regional de Stylo Camión.',
                'category': category,
                'source': source,
                'url': link,
                'time': entry.get('published', 'Reciente'),
            })

    payload = {
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'items': items[:60],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Noticias guardadas: {len(payload["items"])}')


if __name__ == '__main__':
    main()
