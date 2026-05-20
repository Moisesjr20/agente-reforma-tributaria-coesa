"""
chunk-documents.py — Fase 2, Script 2
Divide os .txt parseados em chunks semânticos respeitando estrutura de artigos legais

Uso:
  python execution/rag-reforma/chunk-documents.py              # processa todos
  python execution/rag-reforma/chunk-documents.py --slug lcp-214
"""

import argparse
import json
import os
import sys
from pathlib import Path

import tiktoken
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

SOURCES_JSON = os.getenv("SOURCES_JSON_PATH", r"execution\rag-reforma\sources.json")
TMP_PATH     = Path(os.getenv("TMP_PATH", ".tmp"))
PARSED_DIR   = TMP_PATH / "parsed"
CHUNKS_DIR   = TMP_PATH / "chunks"
CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE    = 800
CHUNK_OVERLAP = 100
MIN_CHUNK     = 100
SEPARATORS    = ["Art.", "§", "\n\n", "\n", ". ", " ", ""]

enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(enc.encode(text))


def chunk_document(doc: dict) -> dict:
    slug   = doc["slug"]
    parsed = PARSED_DIR / f"{slug}.txt"
    output = CHUNKS_DIR / f"{slug}.jsonl"

    print(f"  → {slug}", end=" ... ", flush=True)

    if not parsed.exists():
        print("ERRO: .txt não encontrado — rode parse-documents.py primeiro")
        return {"slug": slug, "status": "error", "reason": "parsed_not_found"}

    text = parsed.read_text(encoding="utf-8")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=SEPARATORS,
        length_function=count_tokens,
    )

    raw_chunks = splitter.split_text(text)

    # filtrar chunks muito pequenos
    chunks = [c for c in raw_chunks if count_tokens(c) >= MIN_CHUNK]
    skipped = len(raw_chunks) - len(chunks)

    with output.open("w", encoding="utf-8") as f:
        for i, content in enumerate(chunks):
            record = {
                "slug":        slug,
                "chunk_index": i,
                "content":     content,
                "token_count": count_tokens(content),
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    token_counts = [count_tokens(c) for c in chunks]
    avg_tokens   = sum(token_counts) // len(token_counts) if token_counts else 0
    max_tokens   = max(token_counts) if token_counts else 0

    print(f"OK — {len(chunks)} chunks | avg {avg_tokens}t | max {max_tokens}t" +
          (f" | {skipped} descartados" if skipped else ""))

    return {"slug": slug, "status": "ok", "chunks": len(chunks), "avg_tokens": avg_tokens}


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

    print(f"\nChunkando {len(sources)} documento(s)...\n")
    results = [chunk_document(doc) for doc in sources]

    ok     = [r for r in results if r["status"] == "ok"]
    errors = [r for r in results if r["status"] == "error"]
    total  = sum(r.get("chunks", 0) for r in ok)

    print(f"\n{'─'*50}")
    print(f"✓ {len(ok)} documentos | {total} chunks totais")
    for r in errors:
        print(f"  ✗ {r['slug']}: {r['reason']}")
    print(f"\nArquivos salvos em: {CHUNKS_DIR}\n")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
