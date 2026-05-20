"""
parse-documents.py — Fase 2, Script 1
Lê os arquivos da base de conhecimento (PDF e HTML) e extrai texto limpo para .txt

Uso:
  python execution/rag-reforma/parse-documents.py              # processa todos
  python execution/rag-reforma/parse-documents.py --slug lcp-214  # processa um
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

import pdfplumber
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

SOURCES_JSON = os.getenv("SOURCES_JSON_PATH", r"execution\rag-reforma\sources.json")
TMP_PATH     = Path(os.getenv("TMP_PATH", ".tmp"))
PARSED_DIR   = TMP_PATH / "parsed"
PARSED_DIR.mkdir(parents=True, exist_ok=True)


def clean_text(text: str) -> str:
    text = re.sub(r"\x00", "", text)
    text = re.sub(r"\r\n|\r", "\n", text)

    # Remove linhas com <= 3 chars: vazamento de DRM/watermark de PDFs protegidos
    lines = text.split("\n")
    lines = [l for l in lines if len(l.strip()) > 3 or l.strip() == ""]
    text = "\n".join(lines)

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\.{4,}", "...", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def detect_repeated_patterns(pages_text: list[str], threshold_ratio: float = 0.30) -> set[str]:
    """Linhas que aparecem no topo/fim de muitas páginas são cabeçalho/rodapé."""
    counts: dict[str, int] = {}
    for page in pages_text:
        lines = [l.strip() for l in page.split("\n") if len(l.strip()) > 8]
        for line in set(lines[:4] + lines[-4:]):
            counts[line] = counts.get(line, 0) + 1
    min_count = max(2, int(len(pages_text) * threshold_ratio))
    return {line for line, n in counts.items() if n >= min_count}


def parse_pdf(path: str) -> str:
    pages_text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

    if not pages_text:
        return ""

    repeated = detect_repeated_patterns(pages_text)
    cleaned = []
    for page in pages_text:
        page_lines = [l for l in page.split("\n") if l.strip() not in repeated]
        cleaned.append("\n".join(page_lines))

    return "\n\n".join(cleaned)


def parse_html(path: str) -> str:
    with open(path, encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f.read(), "lxml")

    # remove scripts, estilos e nav
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    return soup.get_text(separator="\n")


def resolve_path(path: str) -> Path | None:
    """Tenta encontrar o arquivo mesmo com diferenças de normalização Unicode no nome."""
    p = Path(path)
    if p.exists():
        return p
    # fallback: buscar pelo nome no diretório pai
    parent = p.parent
    if parent.exists():
        name = p.name
        for f in parent.iterdir():
            if f.name.encode("utf-8", errors="replace") == name.encode("utf-8", errors="replace"):
                return f
            # comparação normalizada
            import unicodedata
            if unicodedata.normalize("NFC", f.name) == unicodedata.normalize("NFC", name):
                return f
            if unicodedata.normalize("NFD", f.name) == unicodedata.normalize("NFD", name):
                return f
    return None


def process_document(doc: dict) -> dict:
    slug   = doc["slug"]
    path   = doc["path"]
    fmt    = doc["format"]
    output = PARSED_DIR / f"{slug}.txt"

    print(f"  > {slug} ({fmt})", end=" ... ", flush=True)

    resolved = resolve_path(path)
    if not resolved:
        print("ERRO: arquivo nao encontrado")
        return {"slug": slug, "status": "error", "reason": "file_not_found"}
    path = str(resolved)

    try:
        if fmt == "pdf":
            raw = parse_pdf(path)
        elif fmt == "html":
            raw = parse_html(path)
        else:
            print(f"ERRO: formato '{fmt}' não suportado")
            return {"slug": slug, "status": "error", "reason": f"unsupported_format:{fmt}"}

        text = clean_text(raw)

        if len(text) < 200:
            print("AVISO: texto muito curto — pode ser PDF escaneado (sem OCR)")
            return {"slug": slug, "status": "warning", "reason": "text_too_short", "chars": len(text)}

        output.write_text(text, encoding="utf-8")
        print(f"OK ({len(text):,} chars)")
        return {"slug": slug, "status": "ok", "chars": len(text), "output": str(output)}

    except Exception as e:
        print(f"ERRO: {e}")
        return {"slug": slug, "status": "error", "reason": str(e)}


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

    print(f"\nProcessando {len(sources)} documento(s)...\n")
    results = [process_document(doc) for doc in sources]

    ok      = [r for r in results if r["status"] == "ok"]
    warn    = [r for r in results if r["status"] == "warning"]
    errors  = [r for r in results if r["status"] == "error"]

    print(f"\n{'─'*50}")
    print(f"OK: {len(ok)}  Avisos: {len(warn)}  Erros: {len(errors)}")
    for r in errors:
        print(f"  ERRO {r['slug']}: {r['reason']}")
    for r in warn:
        print(f"  AVISO {r['slug']}: {r['reason']} ({r.get('chars', 0)} chars)")
    print(f"\nArquivos salvos em: {PARSED_DIR}\n")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
