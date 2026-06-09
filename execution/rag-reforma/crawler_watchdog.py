"""
crawler_watchdog.py — Watchdog semanal de atualizações RAG (COESA)

Fontes monitoradas (WATCH_SOURCES):
  1. https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
     Estratégia html_direct — detecta mudança por hash, re-ingere se atualizado.

  2. https://consumo.tributos.gov.br/
     Estratégia link_discovery — descobre PDFs linkados, baixa e ingere os novos.

Tabelas Supabase:
  knowledge_documents  → destino dos chunks (migration 001)
  crawl_state          → hash por URL (migration 003)
  crawl_log            → histórico de execuções (migration 003)

Uso:
  python execution/rag-reforma/crawler_watchdog.py
  python execution/rag-reforma/crawler_watchdog.py --dry-run
  python execution/rag-reforma/crawler_watchdog.py --force
"""

import argparse
import hashlib
import os
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Importa utilitários do pipeline de ingestão existente (Camada 3)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))
from update_knowledge_base import (
    _HTMLTextExtractor,
    extract_text_from_pdf,
    split_into_chunks,
    content_hash,
    get_embedding,
    insert_chunk,
    delete_existing,
    OPENROUTER_URL,
    CIRCUIT_BREAKER_MAX,
)

try:
    from dotenv import load_dotenv
except ImportError:
    print("[ERROR] pip install python-dotenv")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("[ERROR] pip install requests")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("[ERROR] pip install beautifulsoup4")
    sys.exit(1)

try:
    import openai
except ImportError:
    print("[ERROR] pip install openai")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("[ERROR] pip install supabase")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Fontes monitoradas — adicione novas URLs aqui
# ---------------------------------------------------------------------------
WATCH_SOURCES = [
    {
        "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm",
        "slug": "lcp-214",
        "title": "Lei Complementar 214/2025",
        "source_type": "lei",
        "strategy": "html_direct",
    },
    {
        "url": "https://consumo.tributos.gov.br/",
        "slug": "portal-cg-ibs",
        "title": "Portal CG-IBS — Consumo Tributos",
        "source_type": "portal",
        "strategy": "link_discovery",
        "base_domain": "consumo.tributos.gov.br",
    },
]

TMP_DIR = Path(__file__).parent.parent.parent / ".tmp" / "watchdog"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def fetch_url(url: str, timeout: int = 30) -> requests.Response:
    resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    resp.raise_for_status()
    return resp


def compute_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Supabase — crawl_state
# ---------------------------------------------------------------------------

def get_crawl_state(supabase: Client, url: str) -> dict | None:
    result = supabase.table("crawl_state").select("*").eq("url", url).execute()
    return result.data[0] if result.data else None


def upsert_crawl_state(supabase: Client, url: str, slug: str, new_hash: str):
    now = _now()
    existing = get_crawl_state(supabase, url)
    payload: dict = {
        "url": url,
        "slug": slug,
        "content_hash": new_hash,
        "last_crawled_at": now,
    }
    if existing is None:
        payload["last_changed_at"] = now
        supabase.table("crawl_state").insert(payload).execute()
    else:
        if existing.get("content_hash") != new_hash:
            payload["last_changed_at"] = now
        supabase.table("crawl_state").update(payload).eq("url", url).execute()


def write_crawl_log(
    supabase: Client,
    url: str,
    slug: str,
    status: str,
    hash_before: str | None = None,
    hash_after: str | None = None,
    chunks_inserted: int = 0,
    error_message: str | None = None,
):
    supabase.table("crawl_log").insert({
        "url": url,
        "slug": slug,
        "status": status,
        "hash_before": hash_before,
        "hash_after": hash_after,
        "chunks_inserted": chunks_inserted,
        "error_message": error_message,
    }).execute()


# ---------------------------------------------------------------------------
# Descoberta de links (link_discovery)
# ---------------------------------------------------------------------------

def discover_pdf_links(html: str, base_url: str, base_domain: str) -> list[dict]:
    """Retorna lista de {url, slug, title} para cada PDF linkado na página."""
    soup = BeautifulSoup(html, "html.parser")
    results, seen = [], set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full_url = urllib.parse.urljoin(base_url, href)
        parsed = urllib.parse.urlparse(full_url)

        if base_domain not in parsed.netloc:
            continue
        if not parsed.path.lower().endswith(".pdf"):
            continue
        if full_url in seen:
            continue
        seen.add(full_url)

        filename = Path(parsed.path).stem
        slug = "portal-cgibs-" + (
            filename.lower()
            .replace(" ", "-")
            .replace("_", "-")
        )[:80]
        title = a.get_text(strip=True) or filename.replace("-", " ").replace("_", " ").title()

        results.append({"url": full_url, "slug": slug, "title": title})

    return results


def discover_subpage_links(html: str, base_url: str, base_domain: str) -> list[str]:
    """Retorna URLs de subpáginas no mesmo domínio (1 nível)."""
    soup = BeautifulSoup(html, "html.parser")
    links: set[str] = set()
    for a in soup.find_all("a", href=True):
        full_url = urllib.parse.urljoin(base_url, a["href"].strip())
        parsed = urllib.parse.urlparse(full_url)
        if (
            base_domain in parsed.netloc
            and not parsed.path.lower().endswith(".pdf")
            and parsed.scheme in ("http", "https")
            and full_url != base_url
        ):
            links.add(full_url)
    return list(links)


# ---------------------------------------------------------------------------
# Ingestão de texto (comum às duas estratégias)
# ---------------------------------------------------------------------------

def ingest_text(
    text: str,
    slug: str,
    title: str,
    source_type: str,
    openai_client: openai.OpenAI,
    supabase_client: Client,
    dry_run: bool,
) -> int:
    chunks = split_into_chunks(text)
    total = len(chunks)

    if dry_run:
        print(f"  [DRY-RUN] {total} chunks (não inseridos)")
        return total

    delete_existing(supabase_client, slug)

    inserted = 0
    consecutive_errors = 0

    for i, chunk in enumerate(chunks, 1):
        metadata = {
            "slug": slug,
            "title": title,
            "source_type": source_type,
            "chunk_index": i,
            "total_chunks": total,
            "content_hash": content_hash(chunk),
            "origin": "watchdog",
        }
        try:
            embedding = get_embedding(openai_client, chunk)
            insert_chunk(supabase_client, chunk, embedding, metadata)
            inserted += 1
            consecutive_errors = 0
            print(f"  [OK] Chunk {i}/{total}", end="\r")
        except RuntimeError as e:
            print(f"\n  {e}")
            print(f"  [CIRCUIT BREAKER] Abortando '{slug}'.")
            break
        except Exception as e:
            consecutive_errors += 1
            print(f"\n  [ERROR] Chunk {i}: {e}")
            if consecutive_errors >= CIRCUIT_BREAKER_MAX:
                print(f"  [CIRCUIT BREAKER] {CIRCUIT_BREAKER_MAX} erros consecutivos. Abortando.")
                break

    print(f"  ✓ {inserted}/{total} chunks inseridos")
    return inserted


# ---------------------------------------------------------------------------
# Estratégia 1: html_direct
# ---------------------------------------------------------------------------

def run_html_direct(
    source: dict,
    state: dict | None,
    openai_client: openai.OpenAI,
    supabase_client: Client,
    dry_run: bool,
    force: bool,
) -> dict:
    url      = source["url"]
    slug     = source["slug"]
    old_hash = state["content_hash"] if state else None

    print(f"  Fetch: {url}")
    resp     = fetch_url(url)
    new_hash = compute_hash(resp.content)

    if not force and old_hash == new_hash:
        print("  [SKIP] Sem mudanças detectadas.")
        return {"status": "ok_no_change", "hash_before": old_hash, "hash_after": new_hash, "chunks": 0}

    print("  Mudança detectada → extraindo texto...")
    extractor = _HTMLTextExtractor()
    extractor.feed(resp.text)
    text = extractor.get_text()

    if not text.strip():
        return {"status": "error", "error": "no_text", "hash_before": old_hash, "hash_after": new_hash, "chunks": 0}

    chunks  = ingest_text(text, slug, source["title"], source["source_type"],
                          openai_client, supabase_client, dry_run)
    status  = "ok_updated" if old_hash else "ok_new"
    return {"status": status, "hash_before": old_hash, "hash_after": new_hash, "chunks": chunks}


# ---------------------------------------------------------------------------
# Estratégia 2: link_discovery
# ---------------------------------------------------------------------------

def run_link_discovery(
    source: dict,
    openai_client: openai.OpenAI,
    supabase_client: Client,
    dry_run: bool,
    force: bool,
) -> list[dict]:
    url         = source["url"]
    base_domain = source.get("base_domain", urllib.parse.urlparse(url).netloc)

    print(f"  Fetch portal: {url}")
    resp = fetch_url(url)

    # Coleta PDFs da página raiz + 1 nível de subpáginas (máx. 10)
    all_pdfs: list[dict] = discover_pdf_links(resp.text, url, base_domain)
    subpages = discover_subpage_links(resp.text, url, base_domain)

    print(f"  Subpáginas encontradas: {len(subpages)}")
    for sp_url in subpages[:10]:
        try:
            sp_resp = fetch_url(sp_url)
            all_pdfs.extend(discover_pdf_links(sp_resp.text, sp_url, base_domain))
            time.sleep(0.5)
        except Exception as e:
            print(f"  [WARN] {sp_url}: {e}")

    # Deduplica por URL
    seen_urls: set[str] = set()
    unique_pdfs = []
    for pdf in all_pdfs:
        if pdf["url"] not in seen_urls:
            seen_urls.add(pdf["url"])
            unique_pdfs.append(pdf)

    print(f"  PDFs descobertos: {len(unique_pdfs)}")

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    for pdf in unique_pdfs:
        pdf_url  = pdf["url"]
        pdf_slug = pdf["slug"]

        existing = get_crawl_state(supabase_client, pdf_url)
        if not force and existing:
            print(f"  [SKIP] Já indexado: {pdf_slug}")
            continue

        print(f"\n  [NEW] {pdf_slug}")
        try:
            pdf_resp = fetch_url(pdf_url, timeout=60)
            new_hash = compute_hash(pdf_resp.content)
            local_path = TMP_DIR / f"{pdf_slug}.pdf"
            local_path.write_bytes(pdf_resp.content)

            text = extract_text_from_pdf(local_path)
            if not text.strip():
                print(f"  [SKIP] PDF sem texto extraível.")
                results.append({"slug": pdf_slug, "status": "error", "error": "no_text"})
                continue

            chunks = ingest_text(text, pdf_slug, pdf["title"], "resolucao",
                                 openai_client, supabase_client, dry_run)

            if not dry_run:
                upsert_crawl_state(supabase_client, pdf_url, pdf_slug, new_hash)
                write_crawl_log(supabase_client, pdf_url, pdf_slug, "ok_new",
                                hash_after=new_hash, chunks_inserted=chunks)

            results.append({"slug": pdf_slug, "status": "ok_new", "chunks": chunks})
            time.sleep(1.0)

        except Exception as e:
            print(f"  [ERROR] {pdf_slug}: {e}")
            if not dry_run:
                write_crawl_log(supabase_client, pdf_url, pdf_slug, "error",
                                error_message=str(e))
            results.append({"slug": pdf_slug, "status": "error", "error": str(e)})

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="COESA RAG Watchdog — Monitor de Atualizações")
    parser.add_argument("--dry-run", action="store_true", help="Simula sem inserir no banco")
    parser.add_argument("--force",   action="store_true", help="Re-ingere mesmo sem mudança detectada")
    args = parser.parse_args()

    load_dotenv()

    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    supabase_url   = os.getenv("SUPABASE_URL")
    supabase_key   = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    missing = [k for k, v in {
        "OPENROUTER_API_KEY":        openrouter_key,
        "SUPABASE_URL":              supabase_url,
        "SUPABASE_SERVICE_ROLE_KEY": supabase_key,
    }.items() if not v]
    if missing:
        print(f"[ERROR] Variáveis ausentes no .env: {', '.join(missing)}")
        sys.exit(1)

    openai_client   = openai.OpenAI(api_key=openrouter_key, base_url=OPENROUTER_URL)
    supabase_client: Client = create_client(supabase_url, supabase_key)

    print("=" * 60)
    print("  COESA RAG Watchdog — Monitor de Atualizações Legislativas")
    if args.dry_run:
        print("  [DRY-RUN] Nenhuma inserção será feita.")
    if args.force:
        print("  [FORCE] Re-ingestão forçada (ignora hash).")
    print(f"  Iniciado em: {_now()}")
    print("=" * 60)

    total_chunks = 0
    errors       = 0

    for source in WATCH_SOURCES:
        print(f"\n{'─' * 60}")
        print(f"Fonte     : {source['title']}")
        print(f"Estratégia: {source['strategy']}")

        try:
            if source["strategy"] == "html_direct":
                state  = get_crawl_state(supabase_client, source["url"])
                result = run_html_direct(source, state, openai_client, supabase_client,
                                         args.dry_run, args.force)
                if not args.dry_run:
                    upsert_crawl_state(supabase_client, source["url"],
                                       source["slug"], result["hash_after"])
                    write_crawl_log(supabase_client, source["url"], source["slug"],
                                    result["status"],
                                    hash_before=result.get("hash_before"),
                                    hash_after=result.get("hash_after"),
                                    chunks_inserted=result.get("chunks", 0),
                                    error_message=result.get("error"))
                total_chunks += result.get("chunks", 0)
                if result["status"] == "error":
                    errors += 1

            elif source["strategy"] == "link_discovery":
                results = run_link_discovery(source, openai_client, supabase_client,
                                             args.dry_run, args.force)
                for r in results:
                    total_chunks += r.get("chunks", 0)
                    if r["status"] == "error":
                        errors += 1

        except Exception as e:
            print(f"\n[ERROR] '{source['slug']}': {e}")
            if not args.dry_run:
                write_crawl_log(supabase_client, source["url"], source["slug"],
                                "error", error_message=str(e))
            errors += 1

    print(f"\n{'═' * 60}")
    print(f"  Watchdog finalizado: {total_chunks} chunks | {errors} erro(s)")
    print(f"  Hora: {_now()}")
    print("═" * 60)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
