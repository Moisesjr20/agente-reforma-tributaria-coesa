# Spec Técnica: RAG Reforma Tributária (COESA)

> **Versão:** 2.0 — 2026-06-09
> **Status:** APROVADO
> **Projeto:** `projeto coesa/` — Plataforma de IA COESA Contabilidade

---

## 1. Visão Geral

Sistema RAG (Retrieval-Augmented Generation) especializado na Reforma Tributária Brasileira (LC 214/2025, IBS, CBS, Split Payment). O agente responde perguntas de contadores e clientes da COESA Contabilidade com base em documentos legislativos indexados, retornando respostas citadas com fonte e nível de confiança.

**Stack:**
- **Frontend:** React 18 + Vite 5 + TypeScript (`frontend/`)
- **Backend:** Supabase Edge Functions (Deno) — `supabase/functions/ask-reforma/`
- **Embeddings:** `openai/text-embedding-3-small` via OpenRouter (1536 dims)
- **LLMs:** `qwen/qwen-2.5-72b-instruct` (simples) | `google/gemini-flash-1.5` (complexas)
- **Banco:** Supabase PostgreSQL + pgvector (HNSW)
- **Ingestão:** Python (`execution/rag-reforma/update_knowledge_base.py`)

---

## 2. Fluxo Completo

```
[1] Usuário digita pergunta (min. 10 chars) no frontend
        ↓
[2] frontend/src/services/reforma.service.ts → POST /functions/v1/ask-reforma
        ↓
[3] Edge Function: normaliza query → detecta idioma e clareza
        ↓
[4] Gera embedding via OpenRouter (text-embedding-3-small)
        ↓
[5] RPC match_documents() — busca HNSW (threshold 0.3, top 5)
        ↓
[6] classifyComplexity() → roteia LLM (qwen-2.5 | gemini-flash)
        ↓
[7] LLM responde com contexto dos chunks recuperados
        ↓
[8] Retorna: { answer, sources[], confidence, latency_ms, model_used }
        ↓
[9] Frontend renderiza resposta + citações de fonte
```

---

## 3. Banco de Dados

### 3.1 Tabela Principal

```sql
-- Migration: supabase/migrations/001_rag_reforma_tributaria.sql
CREATE TABLE knowledge_documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users,  -- NULL = documento global
  content    TEXT NOT NULL,               -- chunk ~1000 chars
  metadata   JSONB,                       -- slug, title, source_type, chunk_index, content_hash
  embedding  vector(1536),               -- text-embedding-3-small
  created_at TIMESTAMP DEFAULT now()
);
```

### 3.2 Índice Vetorial HNSW

```sql
CREATE INDEX ON knowledge_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 3.3 RPC de Busca

```sql
-- Função: match_documents(query_embedding, match_threshold, match_count, target_user_id)
SELECT id, content, metadata,
       1 - (embedding <=> query_embedding) AS similarity
FROM knowledge_documents
WHERE (user_id IS NULL OR user_id = target_user_id)
  AND 1 - (embedding <=> query_embedding) >= match_threshold
ORDER BY similarity DESC
LIMIT match_count;
```

---

## 4. Parâmetros de Configuração

| Parâmetro | Valor | Localização |
|-----------|-------|-------------|
| Threshold de similaridade | `0.3` | `supabase/functions/ask-reforma/index.ts` |
| Máx. documentos retornados | `5` | `index.ts` |
| Tamanho do chunk | `1.000 chars` | `execution/rag-reforma/update_knowledge_base.py` |
| Overlap do chunk | `200 chars` | `update_knowledge_base.py` |
| Rate limit | `10 req/min` | `index.ts` |

---

## 5. Pipeline de Ingestão

### Uso

```bash
# Processar todos os documentos
python execution/rag-reforma/update_knowledge_base.py

# Processar apenas um slug
python execution/rag-reforma/update_knowledge_base.py --slug lcp-214

# Simular sem inserir
python execution/rag-reforma/update_knowledge_base.py --dry-run
```

### Processo

1. Lê `execution/rag-reforma/sources.json` (lista de documentos com slug, path, format)
2. Extrai texto: PDF via `pdfplumber`, HTML via `_HTMLTextExtractor`, TXT nativo
3. Divide em chunks de 1.000 chars com overlap de 200 chars
4. Detecta duplicatas via `content_hash` (MD5)
5. Deleta chunks anteriores do slug antes de reinserir (idempotente)
6. Gera embeddings via OpenRouter → insere em `knowledge_documents`
7. **Circuit Breaker:** aborta após 3 erros consecutivos por documento

### Variáveis de Ambiente (`.env` na raiz)

```env
OPENROUTER_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 6. Documentos Indexados

| Slug | Arquivo | Tipo |
|------|---------|------|
| `lcp-214` | `Lcp 214.html` | HTML |
| `perguntas-respostas` | `perguntas-e-respostas-v3.pdf` | PDF |
| `split-payment` | `manual_split_payment.docx.pdf` | PDF |
| `resolucao-cg-ibs-6` | `Resolução CG-IBS Nº 6-2026.pdf` | PDF |
| `plp-68-ibs-cbs` | `plp-68-2024_resumo-ibs-cbs.pdf` | PDF |
| *(ver sources.json para lista completa)* | | |

---

## 7. Arquivos-Chave

| Responsabilidade | Arquivo |
|-----------------|---------|
| Edge Function principal | `supabase/functions/ask-reforma/index.ts` |
| Testes Edge Function (Deno) | `supabase/functions/ask-reforma/index.test.ts` |
| Hook de chat (React) | `frontend/src/hooks/useChat.ts` |
| Serviço de API (infra) | `frontend/src/services/reforma.service.ts` |
| Ingestão Python | `execution/rag-reforma/update_knowledge_base.py` |
| Testes Python | `execution/rag-reforma/test_update_knowledge_base.py` |
| Fontes indexadas | `execution/rag-reforma/sources.json` |
| Migration vetorial | `supabase/migrations/001_rag_reforma_tributaria.sql` |
| Design System | `directives/design-system.md` |

---

## 8. Testes Automatizados (60 total)

| Camada | Framework | Arquivo | Testes |
|--------|-----------|---------|--------|
| Edge Function | Deno | `index.test.ts` | 16 |
| Frontend hook | Vitest | `useChat.test.ts` | ~11 |
| Frontend component | Vitest | `ChatInput.test.tsx` | ~11 |
| Ingestão Python | pytest | `test_update_knowledge_base.py` | 22 |

```bash
# Rodar todos os testes
deno test supabase/functions/ask-reforma/index.test.ts --allow-env
npm --prefix frontend run test
python -m pytest execution/rag-reforma/test_update_knowledge_base.py -v
```

---

## 9. Como Adicionar Novos Documentos

1. Colocar o arquivo `.pdf`, `.html` ou `.txt` em `base de conhecimento/REFORMA TRIBUTARIA IA/`
2. Adicionar entrada em `execution/rag-reforma/sources.json`
3. Executar `python execution/rag-reforma/update_knowledge_base.py --slug <novo-slug>`
4. Verificar no Supabase Dashboard (`knowledge_documents`) se os chunks foram inseridos
5. Testar com pergunta relacionada e confirmar `similarity >= 0.3` nas fontes retornadas

**Rollback:** excluir registros por `metadata->>'slug' = 'nome-do-slug'`
