#!/usr/bin/env python3
"""Sube fichas descargadas a Supabase Storage y registra su revisión."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / "output" / "catalog.json"


def request(url, key, method="GET", body=None, content_type="application/json", extra=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": content_type,
    }
    headers.update(extra or {})
    req = Request(url, data=body, headers=headers, method=method)
    with urlopen(req, timeout=45) as response:
        return response.read()


def safe(value):
    return re.sub(r"[^a-z0-9_-]+", "-", (value or "sin-modelo").lower()).strip("-")


def main():
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    records = json.loads(CATALOG.read_text(encoding="utf-8"))
    uploaded = 0

    for item in records:
        if item.get("kind") != "pdf" or not item.get("local_file"):
            continue
        local = ROOT / item["local_file"]
        storage_path = "/".join([
            item.get("country", "AR").lower(),
            safe(item.get("brand")),
            f'{item["sha256"]}.pdf',
        ])
        storage_url = (
            f"{base}/storage/v1/object/fichas-tecnicas/"
            + quote(storage_path, safe="/")
        )
        request(
            storage_url, key, method="POST", body=local.read_bytes(),
            content_type="application/pdf", extra={"x-upsert": "true"}
        )

        row = {
            "brand": item["brand"],
            "model": item.get("model"),
            "model_year": item.get("model_year"),
            "country": item.get("country", "AR"),
            "source_id": item["source_id"],
            "source_url": item["source_url"],
            "storage_path": storage_path,
            "sha256": item["sha256"],
            "status": "pending_review",
            "last_checked_at": item["checked_at"],
        }
        request(
            f"{base}/rest/v1/fichas_tecnicas?on_conflict=sha256",
            key, method="POST",
            body=json.dumps(row).encode("utf-8"),
            extra={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        uploaded += 1

    print(f"Fichas subidas y registradas: {uploaded}")


if __name__ == "__main__":
    main()
