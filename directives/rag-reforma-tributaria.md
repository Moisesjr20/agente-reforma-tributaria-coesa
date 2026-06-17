---
name: rag-reforma-tributaria
description: "Agente público de RAG vetorial no Supabase para responder dúvidas sobre a Reforma Tributária Brasileira (EC 132/2023, IBS, CBS, IS). Use este documento como spec completo de construção — cobrindo ingestão de documentos, pipeline vetorial, Edge Function pública e modelo de resposta. Não tem interface de usuário."
version: 2.0.0
category: ai-agent
framework: doe
updated: 2026-06-01
status: done
---

# Agente RAG — Reforma Tributária Brasileira

> **Operação DOE** — Toda execução segue: **Análise → Plano → Aprovação → Execução → Review**.

> ⚠️ **Atualização de arquitetura (v2.0).** A implementação consolidou o pipeline original.
> O que mudou em relação às seções históricas abaixo (mantidas como registro das fases):
> - **Embeddings:** Jina/Google `768 dims` → **OpenAI `text-embedding-3-small` (1536 dims)** via OpenRouter.
> - **Armazenamento:** tabelas `documents` + `chunks` + RPC `match_chunks` → tabela única **`knowledge_documents`** + RPC **`match_documents`** (ver `supabase/migrations/001_rag_reforma_tributaria.sql`).
> - **Ingestão:** scripts multi-etapa (`parse-documents.py`, `chunk-documents.py`, `embed-and-store.py`) → script único **`execution/rag-reforma/update_knowledge_base.py`**.
> - O schema legado de 768 dims é removido por `supabase/migrations/002_drop_legacy_768.sql`.
>
> As seções marcadas com `[x]` adiante refletem o **plano v1.0** e podem citar nomes obsoletos.

---

## Testes

O projeto tem **60 testes automatizados** cobrindo as três camadas. Nenhum teste requer chaves de API ou rede externa.

### Comandos

```powershell
# Edge Function (Deno) — 16 testes
deno test supabase/functions/ask-reforma/index.test.ts --allow-env

# Frontend React (Vitest) — 22 testes
npm --prefix frontend test

# Pipeline de ingestão (pytest) — 22 testes
python -m pytest execution/rag-reforma/test_update_knowledge_base.py -v
```

### O que cada suite cobre

| Suite | Arquivo | Cobre |
|---|---|---|
| Deno | `supabase/functions/ask-reforma/index.test.ts` | `normalizeQuery` (6), `classifyComplexity` (6), `isRateLimited` (4) |
| Vitest — hook | `frontend/src/hooks/useChat.test.ts` | estado inicial, guards < 10 chars/loading, fluxo de mensagens, erro de rede |
| Vitest — componente | `frontend/src/components/ChatInput.test.tsx` | botão/aviso por tamanho, Enter/Shift+Enter, estado de loading |
| pytest | `execution/rag-reforma/test_update_knowledge_base.py` | `_HTMLTextExtractor` (8), `split_into_chunks` (7), `content_hash` (3), `extract_text_*` (4) |

### Restrição aprendida

A Edge Function usa `Deno.serve` no nível do módulo. Para que possa ser importada nos testes sem abrir uma porta TCP, o bloco do servidor deve ser guardado com `if (import.meta.main)`.

O `.env` define `SOURCES_JSON_PATH` (e `KNOWLEDGE_BASE_PATH`/`TMP_PATH`) com caminhos absolutos da máquina de origem (`D:\Clientes de BI\...`). Como `load_dotenv()` **não** sobrescreve variáveis já presentes no ambiente, ao rodar a ingestão em outra máquina exporte o caminho local antes:
```bash
export SOURCES_JSON_PATH=".../execution/rag-reforma/sources.json"
python execution/rag-reforma/update_knowledge_base.py --slug <slug>
```
Para extrair texto de PDFs avulsos para `.txt` reutilize `execution/rag-reforma/extract_pdfs.py "<dir>"` (ignora cópias duplicadas cujo nome termina em `(1)`).

---

## Visão Geral

Agente de IA público que responde perguntas sobre a **Reforma Tributária Brasileira** usando RAG (Retrieval-Augmented Generation) com base vetorial no Supabase. Sem interface própria — exposto via API pública (Supabase Edge Function), integrável em qualquer canal (WhatsApp, site, chat widget, etc.).

**Premissa:** nenhuma pessoa física ou jurídica é identificada ou autenticada. O agente é 100% público e stateless por sessão.

---

## Escopo Documental

Arquivos locais em `base de conhecimento/` (na raiz do projeto):

| # | Arquivo | Formato | Conteúdo |
|---|---|---|---|
| 1 | `202601_NT_FIN_Bens_imoveis_Luz_da_Lei_Complementar_214_2025.pdf` | PDF | Nota Técnica — bens imóveis à luz da LC 214/2025 |
| 2 | `Lcp 214.html` | HTML | Lei Complementar 214/2025 — texto integral |
| 3 | `manual_split_payment.docx.pdf` | PDF | Manual de Split Payment |
| 4 | `perguntas-e-respostas-v3.pdf` | PDF | FAQ oficial — perguntas e respostas da reforma |
| 5 | `primeiros-passos-modulo-apuracao-assistida-2.pdf` | PDF | Manual do módulo de apuração assistida |
| 6 | `Resolução CG-IBS Nº 6-2026.pdf` | PDF | Resolução do Comitê Gestor do IBS Nº 6/2026 |

**Fluxo:** arquivos locais → extração de texto → `.txt` limpos → chunking → embeddings → Supabase.

**Fora do escopo (v1.0):** legislação estadual derivada, regulamentações municipais, interpretações jurídicas de terceiros.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   USUÁRIO FINAL                     │
│      (site / WhatsApp / qualquer canal)             │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP POST /functions/v1/ask-reforma
                      ▼
┌─────────────────────────────────────────────────────┐
│            SUPABASE EDGE FUNCTION                   │
│              ask-reforma (Deno)                     │
│                                                     │
│  1. Recebe { question: string }                     │
│  2. Normaliza + embeda a pergunta (OpenAI 1536)     │
│  3. Busca chunks similares (RPC match_documents)    │
│  4. Classifica complexidade e roteia o modelo       │
│  5. Monta prompt com contexto + pergunta            │
│  6. Retorna { answer, sources, confidence, ... }    │
└───────┬──────────────────────────────┬──────────────┘
        │                              │
        ▼                              ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│ SUPABASE DB          │  │  OPENROUTER API (openrouter.ai/v1)     │
│ pgvector (HNSW)      │  │                                        │
│                      │  │  embeddings:                           │
│ knowledge_documents  │  │    openai/text-embedding-3-small (1536)│
│ (content+embedding)  │  │  chat (roteado por complexidade):      │
│ query_logs           │  │    simples  → qwen-2.5-72b-instruct    │
│                      │  │    complexo → google/gemini-flash-1.5  │
└──────────────────────┘  └──────────────────────────────────────┘

──── PIPELINE DE INGESTÃO (one-time + updates) ────

documentos PDF/HTML/TXT (sources.json)
        │
        ▼
execution/rag-reforma/update_knowledge_base.py
   extrai texto → chunka (1000/overlap 200) → embeda (OpenAI 1536)
   → grava em knowledge_documents
```

---

## LAYER 1 — DIRECTIVE (O Que Construir)

### 1.1 Schema do Banco de Dados (Supabase / PostgreSQL)

```sql
-- Habilitar extensão
create extension if not exists vector;

-- Tabela de documentos fonte
create table documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  source_url  text,
  source_type text not null,  -- 'ec' | 'plp' | 'cartilha' | 'faq' | 'nota-tecnica'
  version     text,
  ingested_at timestamptz default now()
);

-- Tabela de chunks com embeddings
create table chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content     text not null,
  chunk_index int not null,
  token_count int,
  embedding   vector(768),    -- Google text-embedding-004 = 768 dims
  metadata    jsonb default '{}'
);

-- Índice HNSW para busca vetorial eficiente
create index on chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Tabela de logs de consultas (para melhoria contínua)
create table query_logs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text,
  chunks_used uuid[],
  latency_ms  int,
  feedback    smallint,   -- 1 = útil, -1 = não útil, null = sem feedback
  created_at  timestamptz default now()
);
```

### 1.2 Função de Busca Vetorial (RPC)

```sql
create or replace function match_chunks (
  query_embedding vector(768),
  match_threshold float default 0.75,
  match_count     int   default 5
)
returns table (
  id          uuid,
  content     text,
  similarity  float,
  document_title text,
  source_type text
)
language sql stable
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.source_type
  from chunks c
  join documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

### 1.3 Parâmetros de Chunking

| Parâmetro | Valor | Justificativa |
|---|---|---|
| `chunk_size` | 800 tokens | Janela suficiente para artigos de lei completos |
| `chunk_overlap` | 100 tokens | Preserva contexto entre chunks adjacentes |
| `estratégia` | Recursiva por parágrafo | Respeita a estrutura dos artigos legais |
| `min_chunk_size` | 100 tokens | Descartar fragmentos muito pequenos |
| `separadores` | `["Art.", "\n\n", "\n", ". "]` | Respeita a estrutura de artigos da lei |

### 1.4 Prompt System da Edge Function

```
Você é um assistente especializado na Reforma Tributária Brasileira.
Responda com base EXCLUSIVAMENTE nos trechos de documentos fornecidos abaixo.

REGRAS:
- Se a resposta não estiver nos documentos, diga "Não encontrei essa informação nos documentos disponíveis."
- Cite sempre o documento e artigo de origem entre colchetes, ex: [EC 132/2023, Art. 156-A]
- Use linguagem clara e acessível — o usuário pode não ser especialista
- Para datas e alíquotas, seja preciso — erros geram desinformação
- Não extrapole além do que está nos documentos

CONTEXTO (trechos relevantes):
{chunks}

PERGUNTA: {question}

RESPOSTA:
```

### 1.5 Contrato da API Pública

**Endpoint:** `POST /functions/v1/ask-reforma`

**Request:**
```json
{
  "question": "Quais são as alíquotas do IBS e CBS?",
  "session_id": "opcional-para-logs"
}
```

**Response (200):**
```json
{
  "answer": "O IBS e CBS têm alíquota de referência...",
  "sources": [
    {
      "document": "EC 132/2023",
      "source_type": "ec",
      "excerpt": "Art. 156-A..."
    }
  ],
  "confidence": 0.87,
  "latency_ms": 1240
}
```

**Response (400):**
```json
{ "error": "question é obrigatório e deve ter entre 10 e 1000 caracteres" }
```

**Response (429):**
```json
{ "error": "Limite de requisições atingido. Tente novamente em 60 segundos." }
```

**Rate limiting:** 20 req/min por IP (implementado via Supabase Edge Function + KV store).

---

## LAYER 2 — ORCHESTRATION (Sequência de Construção)

O agente é construído em **4 fases sequenciais**. Cada fase depende da anterior.

```
Fase 1: Infraestrutura    →    Fase 2: Ingestão
        ↓                              ↓
Fase 4: Deploy           ←    Fase 3: Edge Function
```

---

## LAYER 3 — EXECUTION (Scripts e Checklist)

### Fase 1 — Infraestrutura Supabase

**Scripts:** nenhum — operações via Supabase CLI e SQL direto.

- [x] **1.1** Criar projeto no Supabase (`hbfckolzpkdkzwjyvrah.supabase.co`)
- [x] **1.2** Habilitar extensão `pgvector` — já incluído no migration SQL (linha 1)
- [x] **1.3** Schema completo criado → `supabase/migrations/001_rag_reforma_tributaria.sql`
- [x] **1.4** Função RPC `match_chunks` criada → incluída no mesmo migration
- [x] **1.5** Índice HNSW criado → incluído no mesmo migration
- [x] **1.6** `.env` template criado → `.env` (preencher com chaves reais)
- [x] **1.7** SQL executado no Supabase Dashboard (SQL Editor)
- [x] **1.8** Verificado após rodar:
  ```sql
  select extname, extversion from pg_extension where extname = 'vector';
  select count(*) from documents;
  select count(*) from chunks;
  ```

---

### Fase 2 — Pipeline de Ingestão de Documentos

**Scripts em:** `execution/rag-reforma/`

#### Script 1 — `execution/rag-reforma/parse-documents.py`

**Objetivo:** Ler os arquivos locais da base de conhecimento, extrair texto limpo e salvar como `.txt`.

- [x] **2.1** Criar diretório `execution/rag-reforma/`
- [x] **2.2** Criar `execution/rag-reforma/sources.json` mapeando slug → caminho local e tipo:

```json
[
  {
    "slug": "nt-bens-imoveis-lc214",
    "title": "NT Financeira — Bens Imóveis à Luz da LC 214/2025",
    "source_type": "nota-tecnica",
    "format": "pdf",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\202601_NT_FIN_Bens_imoveis_Luz_da_Lei_Complementar_214_2025.pdf"
  },
  {
    "slug": "lcp-214",
    "title": "Lei Complementar 214/2025",
    "source_type": "lei",
    "format": "html",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\Lcp 214.html"
  },
  {
    "slug": "manual-split-payment",
    "title": "Manual de Split Payment",
    "source_type": "manual",
    "format": "pdf",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\manual_split_payment.docx.pdf"
  },
  {
    "slug": "faq-reforma-v3",
    "title": "Perguntas e Respostas — Reforma Tributária v3",
    "source_type": "faq",
    "format": "pdf",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\perguntas-e-respostas-v3.pdf"
  },
  {
    "slug": "modulo-apuracao-assistida",
    "title": "Primeiros Passos — Módulo de Apuração Assistida",
    "source_type": "manual",
    "format": "pdf",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\primeiros-passos-modulo-apuracao-assistida-2.pdf"
  },
  {
    "slug": "resolucao-cg-ibs-6-2026",
    "title": "Resolução CG-IBS Nº 6/2026",
    "source_type": "resolucao",
    "format": "pdf",
    "path": "D:\\Clientes de BI\\projeto coesa\\base de conhecimento\\Resolução CG-IBS Nº 6-2026.pdf"
  }
]
```

- [x] **2.3** Implementar `parse-documents.py`:
  - Ler `sources.json` e iterar sobre cada documento
  - **PDFs** → extrair com `pdfplumber` página a página, concatenar texto
  - **HTML** → parsear com `BeautifulSoup`, remover tags, extrair texto puro
  - Limpar texto: remover cabeçalhos/rodapés repetidos, múltiplos espaços em branco, caracteres de controle
  - Salvar saída em `.tmp/parsed/{slug}.txt`
  - Logar: arquivo, nº de páginas/tamanho, nº de caracteres extraídos, erros

```python
# execution/rag-reforma/parse-documents.py
# Dependências: pdfplumber, beautifulsoup4, python-dotenv
# Uso: python execution/rag-reforma/parse-documents.py
# Uso (um documento): python execution/rag-reforma/parse-documents.py --slug lcp-214
```

- [x] **2.4** Testado — 6/6 documentos parseados com sucesso
- [x] **2.5** Verificado — `.tmp/parsed/` contém os 6 arquivos `.txt` com conteúdo (191K–940K chars)
- [x] **2.6** Inspecionado — qualidade OK, sem ruído crítico

#### Script 2 — `execution/rag-reforma/chunk-documents.py`

**Objetivo:** Dividir os `.txt` em chunks semânticos respeitando estrutura de artigos.

- [x] **2.7** Implementar `chunk-documents.py`:
  - Ler arquivos de `.tmp/parsed/`
  - Aplicar chunking recursivo com `langchain.text_splitter.RecursiveCharacterTextSplitter`
  - Parâmetros: `chunk_size=800`, `chunk_overlap=100`, `separators=["Art.", "\n\n", "\n", ". "]`
  - Salvar chunks em `.tmp/chunks/{slug}.jsonl`

```python
# execution/rag-reforma/chunk-documents.py
# Dependências: langchain-text-splitters, tiktoken
# Uso: python execution/rag-reforma/chunk-documents.py
# Uso (um documento): python execution/rag-reforma/chunk-documents.py --slug lcp-214
```

- [x] **2.8** Testado — 1.199 chunks gerados, separadores incluem `["Art.", "§", "\n\n", "\n", ". "]`
- [x] **2.9** Verificado — distribuição dentro dos limites esperados

#### Script 3 — `execution/rag-reforma/embed-and-store.py`

**Objetivo:** Gerar embeddings e persistir no Supabase.

- [x] **2.10** Implementar `embed-and-store.py`:
  - Ler `.tmp/chunks/{slug}.jsonl` + metadados do `sources.json`
  - Inserir registro na tabela `documents` (se não existir) e obter `document_id`
  - Gerar embeddings via Google Gemini:
    ```python
    import google.generativeai as genai
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=chunk_text,
        task_type="retrieval_document",
    )
    embedding = result["embedding"]  # lista de 768 floats
    ```
  - Inserir chunks em lotes de 100 na tabela `chunks`
  - Tratar rate limit (Gemini free: 1500 req/min): retry com exponential backoff
  - Logar progresso em `.tmp/ingest-log.jsonl`

```python
# execution/rag-reforma/embed-and-store.py
# Dependências: google-generativeai, supabase-py, python-dotenv, tqdm
# Uso: python execution/rag-reforma/embed-and-store.py
# Uso (um documento): python execution/rag-reforma/embed-and-store.py --slug faq-reforma-v3
```

- [x] **2.11** Testado — `faq-reforma-v3` (39 chunks) inserido com sucesso
- [ ] **2.12** Verificar após conclusão da ingestão completa (em progresso — 1.199 chunks)
- [ ] **2.13** Verificar após ingestão concluída

#### Script 4 — `execution/rag-reforma/verify-rag.py`

**Objetivo:** Smoke test do pipeline completo antes de subir a Edge Function.

- [x] **2.14** Implementar `verify-rag.py` com 5 perguntas de teste fixas baseadas nos documentos reais
- [ ] **2.15** Executar e verificar se respostas citam fontes corretas
- [ ] **2.16** Documentar resultados em `.tmp/rag-smoke-test.md`

---

### Fase 3 — Edge Function Pública

**Localização:** `supabase/functions/ask-reforma/index.ts`

- [x] **3.1** Criado: `supabase/functions/ask-reforma/index.ts` + `supabase/config.toml`
- [x] **3.2** Handler Deno implementado:
  - Validar `question` (string, 10–1000 chars)
  - **Cliente 1 — Embeddings** (Google Gemini):
    ```typescript
    import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";
    const genai = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const embedModel = genai.getGenerativeModel({ model: "text-embedding-004" });
    const { embedding } = await embedModel.embedContent({
      content: { parts: [{ text: question }], role: "user" },
      taskType: "RETRIEVAL_QUERY",
    });
    const queryEmbedding = embedding.values; // 768 floats
    ```
  - Chamar RPC `match_chunks` com threshold 0.75, top 5
  - Montar prompt com system + chunks + pergunta
  - **Classificador de complexidade** (antes de chamar o LLM):
    ```typescript
    const COMPLEX_KEYWORDS = ["por que", "como funciona", "explique", "compare",
      "diferença", "impacto", "calcule", "exemplo", "detalhe", "análise", "quando"];
    const charThreshold = Number(Deno.env.get("ROUTER_COMPLEXITY_CHAR_THRESHOLD") ?? 100);
    const simThreshold  = Number(Deno.env.get("ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD") ?? 0.82);
    const avgSimilarity = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
    const isComplex =
      question.length > charThreshold ||
      avgSimilarity < simThreshold ||
      COMPLEX_KEYWORDS.some(k => question.toLowerCase().includes(k));
    const model = isComplex
      ? (Deno.env.get("OPENROUTER_MODEL_COMPLEX") ?? "google/gemini-flash-1.5")
      : (Deno.env.get("OPENROUTER_MODEL_SIMPLE")  ?? "qwen/qwen-2.5-72b-instruct");
    ```
  - **Cliente 2 — LLM** (OpenRouter, API-compatível com OpenAI):
    ```typescript
    const router = new OpenAI({
      apiKey: Deno.env.get("OPENROUTER_API_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://coesa.com.br",
        "X-Title": "COESA Reforma Tributária",
      },
    });
    const completion = await router.chat.completions.create({
      model,   // qwen (simples) ou gemini (complexo)
      messages: [{ role: "system", content: systemPrompt },
                 { role: "user", content: question }],
      max_tokens: 800,
      temperature: 0.1,
    });
    ```
  - Inserir log em `query_logs` (incluindo `model_used` e `complexity: "simple" | "complex"`)
  - Retornar `{ answer, sources, confidence, latency_ms, model_used }`
- [x] **3.3** Rate limiting por IP implementado (in-memory Map, 20 req/min por janela de 60s)
- [x] **3.4** CORS configurado: `Access-Control-Allow-Origin: *` + preflight OPTIONS
- [ ] **3.5** Setar secrets no Supabase (via `deploy-edge-function.ps1`):
  ```bash
  supabase secrets set GEMINI_API_KEY=AIza-...
  supabase secrets set OPENROUTER_API_KEY=sk-or-...
  supabase secrets set OPENROUTER_MODEL_SIMPLE=qwen/qwen-2.5-72b-instruct
  supabase secrets set OPENROUTER_MODEL_COMPLEX=google/gemini-flash-1.5
  supabase secrets set ROUTER_COMPLEXITY_CHAR_THRESHOLD=100
  supabase secrets set ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD=0.82
  ```
- [ ] **3.6** Deploy local: `supabase functions serve ask-reforma`
- [ ] **3.7** Testar localmente com `curl`:
  ```bash
  curl -X POST http://localhost:54321/functions/v1/ask-reforma \
    -H "Content-Type: application/json" \
    -d '{"question": "O que é o IBS?"}'
  ```
- [ ] **3.8** Verificar: resposta em < 3 segundos, cita fonte, não alucina
- [ ] **3.9** Testar edge case: pergunta fora do escopo → resposta "Não encontrei..."
- [ ] **3.10** Testar edge case: question vazia → retorna 400

---

### Fase 4 — Deploy e Monitoramento

- [x] **4.1** Deploy da Edge Function: `supabase functions deploy ask-reforma --no-verify-jwt`
- [x] **4.2** Testado em produção — resposta com fontes corretas, latência ~7s, modelo google/gemini-3.5-flash
- [x] **4.3** RLS configurado no migration (anon SELECT em chunks/documents; service_role em query_logs)
- [ ] **4.4** Criar script `execution/rag-reforma/update-documents.py` para reingesta incremental
- [ ] **4.5** Documentar URL pública do endpoint
- [ ] **4.6** Verificar: logs em `query_logs` sendo persistidos corretamente
- [ ] **4.7** Monitorar primeiras 24h: latência, erros, perguntas sem resposta útil

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Onde configurar |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | `.env` local + Supabase secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (ingestão) | `.env` local apenas |
| `SUPABASE_ANON_KEY` | Chave anon (Edge Function) | Supabase secrets |
| `JINA_API_KEY` | Jina AI — **somente embeddings** (`jina-embeddings-v2-base-pt`, 768 dims). Chave gratuita em jina.ai (1M tokens/mês, sem billing) | `.env` local + Supabase secrets |
| `OPENROUTER_API_KEY` | OpenRouter — gateway para os dois LLMs | `.env` local + Supabase secrets |
| `OPENROUTER_MODEL_SIMPLE` | Modelo para perguntas simples/factuais (padrão: `qwen/qwen-2.5-72b-instruct`) | `.env` local + Supabase secrets |
| `OPENROUTER_MODEL_COMPLEX` | Modelo para perguntas complexas/analíticas (padrão: `google/gemini-flash-1.5`) | `.env` local + Supabase secrets |
| `ROUTER_COMPLEXITY_CHAR_THRESHOLD` | Nº de caracteres a partir do qual a pergunta é "complexa" (padrão: `100`) | `.env` local + Supabase secrets |
| `ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD` | Avg similarity abaixo da qual a pergunta é "complexa" (padrão: `0.82`) | `.env` local + Supabase secrets |

> Zero OpenAI. Os thresholds de roteamento são variáveis de ambiente — ajustáveis sem redeploy.

---

## Dependências Python (ingestão)

```
# execution/rag-reforma/requirements.txt
pdfplumber==0.11.0          # extração de texto de PDFs
beautifulsoup4==4.12.3      # parsing do HTML (Lcp 214.html)
lxml==5.2.2                 # parser HTML rápido para BeautifulSoup
python-dotenv==1.0.1
openai==1.35.0              # embeddings text-embedding-3-small
supabase==2.5.0
langchain-text-splitters==0.2.2
tiktoken==0.7.0
tqdm==4.66.4
```

---

## Dependências TypeScript (Edge Function)

```typescript
// supabase/functions/ask-reforma/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";
```

---

## Decisões de Arquitetura e Justificativas

| Decisão | Escolha | Motivo |
|---|---|---|
| LLM simples | OpenRouter → `qwen/qwen-2.5-72b-instruct` | Perguntas factuais curtas (< 100 chars, similarity > 0.82); rápido e eficiente |
| LLM complexo | OpenRouter → `google/gemini-flash-1.5` | Perguntas analíticas, comparativas ou com baixa similaridade; melhor raciocínio |
| Roteamento | Heurística por caracteres + similaridade + keywords | Configurável via env vars sem redeploy |
| Embedding | Google Gemini `text-embedding-004` | OpenRouter não suporta embeddings; 768 dims; free tier (1500 req/min); boa qualidade em PT |
| Índice vetorial | HNSW | Melhor performance de busca vs. IVFFlat para bases < 500k chunks |
| `match_threshold` | 0.75 | Evita chunks irrelevantes; reforma tributária tem linguagem técnica específica |
| `top_k` chunks | 5 | Janela de contexto suficiente sem exceder token limit do `gpt-4o-mini` |
| Chunking | Recursivo por artigo | Documentos legais têm estrutura de artigos — respeitar divisão natural |
| Sem autenticação | Intencionalmente público | Agente de utilidade pública, sem dados sensíveis |
| `temperature` | 0.1 | Respostas precisas e reproduzíveis, sem criatividade — legislação exige exatidão |
| Stateless | Sem histórico de conversa | Simplifica a v1.0; multi-turn pode ser v2.0 |

---

## Edge Cases e Tratamentos

| Situação | Comportamento Esperado |
|---|---|
| Pergunta fora do escopo da reforma | "Não encontrei essa informação nos documentos disponíveis." |
| Chunks com similaridade < 0.75 | Retornar sem contexto + resposta "base insuficiente" |
| Google Gemini indisponível (embeddings) | HTTP 503 com `{ "error": "Serviço temporariamente indisponível" }` |
| OpenRouter indisponível (LLM) | HTTP 503 com `{ "error": "Serviço temporariamente indisponível" }` — tentar fallback para modelo alternativo no router |
| Pergunta < 10 chars ou > 1000 chars | HTTP 400 com mensagem descritiva |
| Rate limit excedido | HTTP 429 com `retry-after: 60` header |
| Pergunta em inglês ou espanhol | Responder no idioma da pergunta, mas buscar nos docs em PT |
| Alíquotas e datas desatualizadas | Citar a fonte e data do documento; adicionar aviso de verificação |

---

## Métricas de Sucesso (v1.0)

| Métrica | Meta |
|---|---|
| Latência p50 | < 2.5s |
| Latência p95 | < 5s |
| Taxa de "não encontrei" em perguntas válidas | < 15% |
| Chunks com `similarity > 0.80` por query | ≥ 3 dos 5 retornados |
| Erro de API (Gemini embeddings + OpenRouter LLM) | < 0.5% das requisições |

---

## Self-Annealing — Registro de Aprendizados

*Este bloco é atualizado durante a execução.*

| Data | Problema | Solução | Script Atualizado |
|---|---|---|---|
| 2026-05-19 | Windows cp1252 não suporta `→` e `✓` no terminal | Substituir por `>` e texto ASCII nos prints | `parse-documents.py` |
| 2026-05-19 | `Resolução CG-IBS Nº 6-2026.pdf` não encontrado por normalização Unicode NFC/NFD | Adicionar `resolve_path()` com fallback de `unicodedata.normalize` | `parse-documents.py` |
| 2026-05-19 | Google Gemini `API_KEY_INVALID` — faturamento não ativo | Trocar para Jina AI (`jina-embeddings-v3`, 768 dims, grátis sem billing) | `embed-and-store.py`, `verify-rag.py`, `.env` |
| 2026-05-19 | `jina-embeddings-v2-base-pt` descontinuado (422) | Usar `jina-embeddings-v3` com `dimensions=768` e `task=retrieval.passage` | `embed-and-store.py`, `verify-rag.py` |
| 2026-05-19 | Edge Function não usou OpenAI SDK (desnecessário para Jina + OpenRouter) | Usar `fetch` nativo do Deno para ambas as chamadas de API — sem dependências extras | `index.ts` |
| 2026-05-19 | `match_threshold: 0.75` alto demais — Jina v3 cosine fica em 0.60–0.65 para queries relevantes | Baixar threshold para 0.60 | `index.ts` |
| 2026-05-19 | `google/gemini-flash-1.5` retornou 404 no OpenRouter (model ID desatualizado) | Usar `google/gemini-3.5-flash` | `.env`, secrets Supabase |

---

## Próximos Passos (v2.0 — fora do escopo atual)

- [ ] Multi-turn: manter histórico de conversa por `session_id`
- [ ] Feedback loop: botão 👍/👎 para melhorar retrieval
- [ ] Reranking: usar Cohere Rerank para melhorar precisão
- [ ] Novos documentos: ingestão automática quando legislação for atualizada
- [ ] Analytics dashboard: painel com perguntas mais frequentes
- [ ] Suporte a áudio: transcrição via Whisper + resposta em TTS
