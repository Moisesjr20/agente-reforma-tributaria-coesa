"""
extract_pdfs.py — Extrai texto de PDFs para arquivos .txt (COESA)

Reutiliza a função de extração blindada de update_knowledge_base.py.
Gera um .txt ao lado de cada .pdf. Pula cópias duplicadas cujo nome
termina em "(1).pdf" (idênticas por convenção do repositório).

Uso:
  python execution/rag-reforma/extract_pdfs.py "<diretório com PDFs>"
"""

import sys
from pathlib import Path

from update_knowledge_base import extract_text_from_pdf


def main():
    if len(sys.argv) < 2:
        print("[ERROR] Informe o diretório com os PDFs.")
        sys.exit(1)

    sys.stdout.reconfigure(encoding="utf-8")
    target = Path(sys.argv[1])
    if not target.is_dir():
        print(f"[ERROR] Diretório não encontrado: {target}")
        sys.exit(1)

    pdfs = sorted(p for p in target.glob("*.pdf") if not p.stem.endswith("(1)"))
    print(f"PDFs a processar (duplicatas '(1)' ignoradas): {len(pdfs)}")

    errors = 0
    for pdf in pdfs:
        txt_path = pdf.with_suffix(".txt")
        print(f"\n→ {pdf.name}")
        text = extract_text_from_pdf(pdf)
        if not text:
            print("  [ERRO] Nenhum texto extraído.")
            errors += 1
            continue
        txt_path.write_text(text, encoding="utf-8")
        print(f"  [OK] {len(text)} chars → {txt_path.name}")

    print(f"\n{'═'*55}")
    print(f"  {len(pdfs) - errors}/{len(pdfs)} PDFs extraídos com sucesso")
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
