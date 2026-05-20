"""
update_knowledge_base.py — Script unificado de ingestão RAG (COESA)

Fluxo:
  1. Lê sources.json (slug, title, source_type, format, path)
  2. Extrai texto (PDF, HTML ou TXT)
  3. Divide em chunks (1000 chars, overlap 200)
  4. Gera embedding via OpenAI text-embedding-3-small (OpenRouter)
  5. Deleta chunks anteriores do slug e insere novos em knowledge_documents

Uso:
  python execution/rag-reforma/update_knowledge_base.py
  python execution/rag-reforma/update_knowledge_base.py --slug lcp-214
  python execution/rag-reforma/update_knowledge_base.py --dry-run

Variáveis de ambiente (.env na raiz do projeto):
  OPENROUTER_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import hashlib
import json
import os
import sys
from html.parser import HTMLParser
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("[ERROR] Dependência ausente: pip install python-dotenv")
    sys.exit(1)

try:
    import openai
except ImportError:
    print("[ERROR] Dependência ausente: pip install openai")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("[ERROR] Dependência ausente: pip install supabase")
    sys.exit(1)

try:
    import pdfplumber
except ImportError:
    print("[ERROR] Dependência ausente: pip install pdfplumber")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
CHUNK_SIZE      = 1000
CHUNK_OVERLAP   = 200
EMBEDDING_MODEL = "openai/text-embedding-3-small"
OPENROUTER_URL  = "https://openrouter.ai/api/v1"
TABLE           = "knowledge_documents"

SOURCES_JSON = Path(__file__).parent / "sources.json"


# ---------------------------------------------------------------------------
# Extração de texto
# ---------------------------------------------------------------------------

class _HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip_tags = {"script", "style", "head"}
        self._in_skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._skip_tags:
            self._in_skip += 1

    def handle_endtag(self, tag):
        if tag in self._skip_tags and self._in_skip > 0:
            self._in_skip -= 1

    def handle_data(self, data):
        if self._in_skip == 0:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self) -> str:
        return " ".join(self._parts)


def extract_text_from_pdf(path: Path) -> str:
    try:
        with pdfplumber.open(path) as pdf:
            return "".join(
                (page.extract_text() or "") + "\n" for page in pdf.pages
            ).strip()
    except Exception as e:
        print(f"  [WARN] Erro ao ler PDF '{path.name}': {e}")
        return ""


def extract_text_from_html(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            raw = path.read_text(encoding=encoding)
            extractor = _HTMLTextExtractor()
            extractor.feed(raw)
            return extractor.get_text()
        except (UnicodeDecodeError, Exception):
            continue
    print(f"  [WARN] Não foi possível decodificar '{path.name}'")
    return ""


def extract_text_from_txt(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return path.read_text(encoding=encoding).strip()
        except (UnicodeDecodeError, Exception):
            continue
    print(f"  [WARN] Não foi possível decodificar '{path.name}'")
    return ""


def extract_text(path: Path, fmt: str) -> str:
    if fmt == "pdf":
        return extract_text_from_pdf(path)
    if fmt == "html":
        return extract_text_from_html(path)
    return extract_text_from_txt(path)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def split_into_chunks(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def content_hash(content: str) -> str:
    return hashlib.md5(content.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def get_embedding(client: openai.OpenAI, text: str) -> list[float]:
    return client.embeddings.create(model=EMBEDDING_MODEL, input=text).data[0].embedding


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def delete_existing(supabase: Client, slug: str):
    supabase.table(TABLE).delete().eq("metadata->>slug", slug).execute()


def insert_chunk(supabase: Client, content: str, embedding: list[float], metadata: dict):
    supabase.table(TABLE).insert(
        {"content": content, "embedding": embedding, "metadata": metadata, "user_id": None}
    ).execute()


# ---------------------------------------------------------------------------
# Processar documento
# ---------------------------------------------------------------------------

def process_document(
    doc: dict,
    openai_client: openai.OpenAI,
    supabase_client: Client,
    dry_run: bool,
) -> dict:
    slug  = doc["slug"]
    path  = Path(doc["path"])
    fmt   = doc.get("format", "pdf")

    print(f"\n{'─'*55}")
    print(f"Documento : {doc['title']}")
    print(f"Arquivo   : {path.name}")

    if not path.exists():
        print(f"  [ERRO] Arquivo não encontrado: {path}")
        return {"slug": slug, "status": "error", "reason": "file_not_found"}

    text = extract_text(path, fmt)
    if not text:
        print(f"  [SKIP] Nenhum texto extraído.")
        return {"slug": slug, "status": "error", "reason": "no_text"}

    chunks = split_into_chunks(text)
    total  = len(chunks)
    print(f"  Chunks    : {total}")

    if dry_run:
        for i, chunk in enumerate(chunks, 1):
            print(f"  [DRY-RUN] Chunk {i}/{total} — {len(chunk)} chars")
        return {"slug": slug, "status": "ok", "inserted": total}

    # Limpar registros anteriores deste documento
    delete_existing(supabase_client, slug)

    inserted = 0
    for i, chunk in enumerate(chunks, 1):
        metadata = {
            "slug":         slug,
            "title":        doc["title"],
            "source_type":  doc["source_type"],
            "chunk_index":  i,
            "total_chunks": total,
            "content_hash": content_hash(chunk),
        }
        try:
            embedding = get_embedding(openai_client, chunk)
            insert_chunk(supabase_client, chunk, embedding, metadata)
            inserted += 1
            print(f"  [OK] Chunk {i}/{total}", end="\r")
        except Exception as e:
            print(f"\n  [ERROR] Chunk {i}: {e}")

    print(f"  ✓ {inserted}/{total} chunks inseridos")
    return {"slug": slug, "status": "ok", "inserted": inserted}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Ingestão RAG COESA — knowledge_documents")
    parser.add_argument("--slug",    type=str, help="Processar apenas este documento")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem inserir no banco")
    args = parser.parse_args()

    load_dotenv()

    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    supabase_url   = os.getenv("SUPABASE_URL")
    supabase_key   = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    missing = [k for k, v in {
        "OPENROUTER_API_KEY":       openrouter_key,
        "SUPABASE_URL":             supabase_url,
        "SUPABASE_SERVICE_ROLE_KEY": supabase_key,
    }.items() if not v]
    if missing:
        print(f"[ERROR] Variáveis ausentes no .env: {', '.join(missing)}")
        sys.exit(1)

    openai_client   = openai.OpenAI(api_key=openrouter_key, base_url=OPENROUTER_URL)
    supabase_client: Client = create_client(supabase_url, supabase_key)

    sources_path = Path(os.getenv("SOURCES_JSON_PATH", str(SOURCES_JSON)))
    with open(sources_path, encoding="utf-8") as f:
        sources = json.load(f)

    if args.slug:
        sources = [s for s in sources if s["slug"] == args.slug]
        if not sources:
            print(f"[ERROR] Slug '{args.slug}' não encontrado em sources.json")
            sys.exit(1)

    print("=" * 55)
    print(f"  COESA RAG — Ingestão ({len(sources)} documento(s))")
    if args.dry_run:
        print("  [DRY-RUN] Nenhuma inserção será feita no banco.")
    print("=" * 55)

    results = [
        process_document(doc, openai_client, supabase_client, args.dry_run)
        for doc in sources
    ]

    ok     = [r for r in results if r["status"] == "ok"]
    errors = [r for r in results if r["status"] == "error"]
    total  = sum(r.get("inserted", 0) for r in ok)

    print(f"\n{'═'*55}")
    print(f"  {len(ok)} doc(s) | {total} chunks no Supabase")
    for r in errors:
        print(f"  ✗ {r['slug']}: {r.get('reason', 'erro')}")
    print("═" * 55)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
