#!/usr/bin/env python3
"""Recolector seguro de fichas oficiales para Stylo Camión.

Nunca publica automáticamente: genera un catálogo pending_review y conserva
fuente, fecha y SHA-256 para evitar duplicados.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from collections import deque
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
MAX_BYTES = 40 * 1024 * 1024
USER_AGENT = "StyloCamionFichaBot/0.1 (+https://stylocamion.com)"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.title_parts = [], []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title and data.strip():
            self.title_parts.append(data.strip())

    @property
    def title(self):
        return " ".join(self.title_parts)


def now():
    return datetime.now(timezone.utc).isoformat()


def fetch(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=30) as response:
        size = response.headers.get("Content-Length")
        if size and int(size) > MAX_BYTES:
            raise ValueError("archivo demasiado grande")
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError("archivo demasiado grande")
        return body, response.headers.get_content_type(), response.geturl()


def is_allowed(url, source):
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname in source["allowed_hosts"]


def infer_year(text):
    current = datetime.now(timezone.utc).year
    years = [int(y) for y in re.findall(r"(?<!\\d)(19[7-9]\\d|20[0-2]\\d)(?!\\d)", text)]
    years = [y for y in years if 1970 <= y <= current + 1]
    return max(years) if years else None


def crawl(source, dry_run=False):
    queue = deque(source["seeds"])
    seen, records = set(), []
    pages = 0
    docs = OUTPUT / "documents"
    docs.mkdir(parents=True, exist_ok=True)

    while queue and pages < source["max_pages"]:
        url = urldefrag(queue.popleft())[0]
        if url in seen or not is_allowed(url, source):
            continue
        seen.add(url)
        likely_pdf = urlparse(url).path.lower().endswith(".pdf")
        if not likely_pdf and url not in source["seeds"] and source["page_pattern"] not in url:
            continue

        if dry_run:
            print(source["id"], url)
            continue

        record = {
            "source_id": source["id"], "brand": source["brand"],
            "country": source["country"], "source_url": url,
            "checked_at": now(), "status": "pending_review"
        }
        try:
            body, content_type, final_url = fetch(url)
            pdf = content_type == "application/pdf" or body[:4] == b"%PDF"
            record["final_url"] = final_url
            record["sha256"] = hashlib.sha256(body).hexdigest()
            if pdf:
                filename = f'{source["id"]}-{record["sha256"][:16]}.pdf'
                path = docs / filename
                if not path.exists():
                    path.write_bytes(body)
                record.update({"kind": "pdf", "local_file": str(path.relative_to(ROOT))})
            else:
                pages += 1
                parser = PageParser()
                parser.feed(body.decode("utf-8", errors="replace"))
                record.update({
                    "kind": "model_page", "model": parser.title.split(" - ")[0] or None,
                    "model_year": infer_year(parser.title + " " + final_url)
                })
                for href in parser.links:
                    candidate = urldefrag(urljoin(final_url, href))[0]
                    if is_allowed(candidate, source):
                        path = urlparse(candidate).path.lower()
                        if path.endswith(".pdf") or source["page_pattern"] in candidate:
                            queue.append(candidate)
            records.append(record)
        except Exception as exc:
            record.update({"kind": "error", "error": str(exc)[:300]})
            records.append(record)
        time.sleep(0.75)
    return records


def sort_key(item):
    year = item.get("model_year")
    return (item.get("brand", "").lower(), year is None, -(year or 0), item.get("model") or "")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    OUTPUT.mkdir(exist_ok=True)
    config = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))
    records = []
    for source in config["sources"]:
        records.extend(crawl(source, args.dry_run))
    records.sort(key=sort_key)
    if not args.dry_run:
        (OUTPUT / "catalog.json").write_text(
            json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Catálogo generado: {len(records)} registros")


if __name__ == "__main__":
    main()
