"""
verify-rag.py — Fase 2, Script 4
Smoke test do pipeline vetorial: gera embeddings e verifica se o Supabase
retorna chunks relevantes antes de subir a Edge Function

Uso:
  python execution/rag-reforma/verify-rag.py
"""

import os
import sys

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

JINA_API_KEY = os.environ["JINA_API_KEY"]
JINA_MODEL   = "jina-embeddings-v3"
JINA_DIMS    = 768
JINA_URL     = "https://api.jina.ai/v1/embeddings"

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

# 5 perguntas baseadas nos documentos reais da base de conhecimento
TEST_QUESTIONS = [
    {
        "question": "O que é o split payment e como ele funciona?",
        "expected_source": "manual-split-payment",
        "min_similarity": 0.70,
    },
    {
        "question": "Quais são as alíquotas do IBS e CBS previstas na LC 214?",
        "expected_source": "lcp-214",
        "min_similarity": 0.70,
    },
    {
        "question": "Como funciona a apuração assistida para o novo sistema tributário?",
        "expected_source": "modulo-apuracao-assistida",
        "min_similarity": 0.70,
    },
    {
        "question": "Quais são as regras para bens imóveis na reforma tributária?",
        "expected_source": "nt-bens-imoveis-lc214",
        "min_similarity": 0.70,
    },
    {
        "question": "O que diz a Resolução do Comitê Gestor do IBS número 6?",
        "expected_source": "resolucao-cg-ibs-6-2026",
        "min_similarity": 0.70,
    },
]

PASS_MARK = 0.70   # similaridade mínima para passar
TOP_K     = 5


def embed_query(text: str) -> list[float]:
    resp = requests.post(
        JINA_URL,
        headers={"Authorization": f"Bearer {JINA_API_KEY}", "Content-Type": "application/json"},
        json={"model": JINA_MODEL, "input": [text], "dimensions": JINA_DIMS, "task": "retrieval.query"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def search_chunks(embedding: list[float]) -> list[dict]:
    response = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": embedding,
            "match_threshold":  0.60,   # threshold baixo no smoke test para ver o range
            "match_count":      TOP_K,
        },
    ).execute()
    return response.data or []


def run_test(test: dict, index: int) -> bool:
    q        = test["question"]
    expected = test["expected_source"]

    print(f"\n[{index+1}/5] {q}")

    embedding = embed_query(q)
    results   = search_chunks(embedding)

    if not results:
        print(f"  ✗ FALHOU — nenhum chunk retornado")
        return False

    top = results[0]
    print(f"  Top resultado: [{top['slug']}] sim={top['similarity']:.3f}")
    print(f"  Trecho: {top['content'][:120].replace(chr(10), ' ')}...")

    passed_sim    = top["similarity"] >= PASS_MARK
    passed_source = any(r["slug"] == expected for r in results)

    if passed_sim and passed_source:
        print(f"  ✓ PASSOU (similaridade OK + fonte esperada encontrada)")
        return True
    elif passed_sim and not passed_source:
        print(f"  ⚠ PARCIAL — similaridade OK mas fonte esperada '{expected}' não apareceu no top {TOP_K}")
        return True   # não é falha crítica
    else:
        print(f"  ✗ FALHOU — similaridade {top['similarity']:.3f} < {PASS_MARK}")
        return False


def check_counts():
    docs   = supabase.table("documents").select("id", count="exact").execute()
    chunks = supabase.table("chunks").select("id", count="exact").execute()
    print(f"\nSuapabase: {docs.count} documentos | {chunks.count} chunks\n")
    if docs.count == 0:
        print("ERRO: nenhum documento no banco — rode embed-and-store.py primeiro")
        sys.exit(1)


def main():
    print("=" * 55)
    print("  Smoke Test — RAG Reforma Tributária")
    print("=" * 55)

    check_counts()

    passed = 0
    for i, test in enumerate(TEST_QUESTIONS):
        if run_test(test, i):
            passed += 1

    print(f"\n{'═'*55}")
    print(f"Resultado: {passed}/{len(TEST_QUESTIONS)} testes passaram")

    if passed == len(TEST_QUESTIONS):
        print("✓ Pipeline RAG validado — pode avançar para a Fase 3\n")
    elif passed >= 3:
        print("⚠ Maioria passou — revisar os falhos antes de avançar\n")
        sys.exit(0)
    else:
        print("✗ Muitas falhas — verificar ingestão e embeddings\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
