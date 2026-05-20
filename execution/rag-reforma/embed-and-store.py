"""
embed-and-store.py — Fase 2, Script 3
Gera embeddings via Google Gemini text-embedding-004 e persiste no Supabase

Uso:
  python execution/rag-reforma/embed-and-store.py              # processa todos
  python execution/rag-reforma/embed-and-store.py --slug faq-reforma-v3
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

load_dotenv()

SOURCES_JSON   = os.getenv("SOURCES_JSON_PATH", r"execution\rag-reforma\sources.json")
TMP_PATH       = Path(os.getenv("TMP_PATH", ".tmp"))
CHUNKS_DIR     = TMP_PATH / "chunks"
LOG_FILE       = TMP_PATH / "ingest-log.jsonl"

BATCH_SIZE     = 50
MAX_RETRIES    = 5
RETRY_DELAY    = 2.0

JINA_API_KEY   = os.environ["JINA_API_KEY"]
JINA_MODEL     = "jina-embeddings-v3"
JINA_DIMS      = 768
JINA_URL       = "https://api.jina.ai/v1/embeddings"

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


def embed_text(text: str, retries: int = 0) -> list[float]:
    try:
        resp = requests.post(
            JINA_URL,
            headers={"Authorization": f"Bearer {JINA_API_KEY}", "Content-Type": "application/json"},
            json={"model": JINA_MODEL, "input": [text], "dimensions": JINA_DIMS, "task": "retrieval.passage"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]
    except Exception as e:
        if retries >= MAX_RETRIES:
            raise
        wait = RETRY_DELAY * (2 ** retries)
        print(f"\n    Erro embedding (retry {retries+1}/{MAX_RETRIES}): {e} - aguardando {wait:.1f}s")
        time.sleep(wait)
        return embed_text(text, retries + 1)


def upsert_document(doc: dict) -> str:
    result = (
        supabase.table("documents")
        .upsert(
            {
                "title":       doc["title"],
                "slug":        doc["slug"],
                "source_type": doc["source_type"],
            },
            on_conflict="slug",
        )
        .execute()
    )
    return result.data[0]["id"]


def delete_existing_chunks(document_id: str):
    supabase.table("chunks").delete().eq("document_id", document_id).execute()


def insert_chunks_batch(rows: list[dict]):
    supabase.table("chunks").insert(rows).execute()


def process_document(doc: dict) -> dict:
    slug       = doc["slug"]
    chunks_file = CHUNKS_DIR / f"{slug}.jsonl"

    print(f"\n{'─'*50}")
    print(f"Documento: {doc['title']}")

    if not chunks_file.exists():
        print(f"  ERRO: {chunks_file} não encontrado — rode chunk-documents.py primeiro")
        return {"slug": slug, "status": "error", "reason": "chunks_not_found"}

    chunks = []
    with chunks_file.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    print(f"  {len(chunks)} chunks para processar")

    # upsert documento e limpar chunks anteriores
    document_id = upsert_document(doc)
    delete_existing_chunks(document_id)
    print(f"  document_id: {document_id}")

    rows = []
    inserted = 0
    log_entries = []

    for chunk in tqdm(chunks, desc="  Embeddings", unit="chunk", ncols=70):
        embedding = embed_text(chunk["content"])

        rows.append({
            "document_id": document_id,
            "content":     chunk["content"],
            "chunk_index": chunk["chunk_index"],
            "token_count": chunk["token_count"],
            "embedding":   embedding,
        })

        if len(rows) >= BATCH_SIZE:
            insert_chunks_batch(rows)
            inserted += len(rows)
            log_entries.append({"slug": slug, "inserted": len(rows)})
            rows = []

        # respeitar rate limit Gemini free (1500 req/min = ~25/s)
        time.sleep(0.05)

    if rows:
        insert_chunks_batch(rows)
        inserted += len(rows)

    # gravar log
    with LOG_FILE.open("a", encoding="utf-8") as lf:
        for entry in log_entries:
            lf.write(json.dumps(entry, ensure_ascii=False) + "\n")
        lf.write(json.dumps({"slug": slug, "status": "ok", "total": inserted}) + "\n")

    print(f"  ✓ {inserted} chunks inseridos no Supabase")
    return {"slug": slug, "status": "ok", "inserted": inserted}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Processar apenas este documento")
    args = parser.parse_args()

    with open(SOURCES_JSON, encoding="utf-8") as f:
        sources = json.load(f)

    if args.slug:
        sources = [s for s in sources if s["slug"] == args.slug]
        if not sources:
            print(f"Slug '{args.slug}' não encontrado em sources.json")
            sys.exit(1)

    print(f"\nIniciando ingestão de {len(sources)} documento(s)...\n")
    results = [process_document(doc) for doc in sources]

    ok      = [r for r in results if r["status"] == "ok"]
    errors  = [r for r in results if r["status"] == "error"]
    total   = sum(r.get("inserted", 0) for r in ok)

    print(f"\n{'═'*50}")
    print(f"✓ {len(ok)} documentos | {total} chunks no Supabase")
    for r in errors:
        print(f"  ✗ {r['slug']}: {r['reason']}")
    print(f"\nLog em: {LOG_FILE}\n")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
