# COESA — Plataforma de IA

Plataforma de IA para o escritório de contabilidade **COESA Contabilidade**. O produto atual é o
**Assistente de Reforma Tributária**: um sistema RAG que responde dúvidas sobre LC 214/2025, IBS, CBS,
Split Payment e normas relacionadas (EC 132/2023), citando sempre as fontes legislativas indexadas.

> Construído sobre o **Framework DOE** (Diretivas → Orquestração → Execução). Veja `DOE/DOE.md` e
> `CLAUDE.md` para as regras de governança do agente de IA.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript |
| Testes UI | Vitest + Testing Library |
| Backend | Supabase Edge Functions (Deno) |
| Banco de dados | Supabase PostgreSQL + pgvector (índice HNSW) |
| Embeddings | OpenRouter → `text-embedding-3-small` (1536 dims) |
| LLM (simples) | `qwen/qwen-2.5-72b-instruct` via OpenRouter |
| LLM (complexo) | `google/gemini-flash-1.5` via OpenRouter |
| Ingestão | Python 3.x + pdfplumber + supabase-py |

---

## Estrutura do Projeto (Framework DOE)

```
projeto coesa/
├── CLAUDE.md / AGENTS.md / GEMINI.md  ← Camada 2: instruções do agente (espelhos)
├── DOE/                               ← Framework DOE (fonte canônica)
├── directives/                        ← Camada 1: POPs e Specs
│   ├── specs/                         ← Documentos de especificação técnica
│   ├── templates/                     ← Modelos reutilizáveis (referência)
│   ├── design-system.md
│   ├── rag-reforma-tributaria.md
│   └── rag-watchdog.md
├── execution/                         ← Camada 3: scripts determinísticos
│   └── rag-reforma/                   ← Pipeline de ingestão RAG (Python)
├── frontend/                          ← React + Vite UI
├── supabase/                          ← Edge Functions + Migrations
├── .agents/                           ← Vault de agentes e skills
└── base de conhecimento/              ← Documentos fonte para RAG (não versionado)
```

| Camada DOE | Diretório | Conteúdo |
|-----------|-----------|---------|
| Camada 1 — Diretivas | `directives/` | POPs e specs |
| Camada 2 — Orquestração | `CLAUDE.md`, `.agents/` | Agentes, skills, vault |
| Camada 3 — Execução | `execution/`, `supabase/functions/` | Scripts e Edge Functions |

---

## Fluxo da Aplicação

```
Usuário → ChatInput (mín. 10 chars)
        → useChat() hook
        → reforma.service.ts (fetch)
        → Edge Function /ask-reforma
        → RAG retrieval (HNSW, threshold 0.3, top 5)
        → LLM (qwen | gemini, roteado por complexidade)
        → { answer, sources, confidence, latency_ms, model_used }
        → MessageBubble + SourceCitations
```

---

## Como Rodar

### Pré-requisitos

Crie um arquivo `.env` na raiz com as credenciais:

```env
OPENROUTER_API_KEY=sk-or-...
SUPABASE_URL=https://<projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

### Frontend (React + Vite)

```bash
npm --prefix frontend install
npm --prefix frontend run dev      # servidor de desenvolvimento
npm --prefix frontend run build    # build de produção
npm --prefix frontend run test     # testes (Vitest)
```

### Ingestão RAG (Python)

```bash
pip install -r execution/rag-reforma/requirements.txt

python execution/rag-reforma/update_knowledge_base.py             # ingere todas as fontes
python execution/rag-reforma/update_knowledge_base.py --slug lcp-214   # uma fonte específica
python execution/rag-reforma/update_knowledge_base.py --dry-run        # prévia, sem gravar
```

### Edge Function (Deno)

```bash
deno test supabase/functions/ask-reforma/index.test.ts --allow-env
```

### Testes Python

```bash
python -m pytest execution/rag-reforma/ -v
```

---

## Como Adicionar Documentos à Base de Conhecimento

1. Registre a fonte em `execution/rag-reforma/sources.json` (slug, title, source_type, format, path).
2. Coloque o arquivo (`.pdf`, `.html` ou `.txt`) em `base de conhecimento/`.
3. Execute a ingestão: `python execution/rag-reforma/update_knowledge_base.py --slug <slug>`.
4. Verifique no Supabase Dashboard (tabela `knowledge_documents`) se os chunks foram inseridos.

Para rollback: o script é idempotente — deleta os chunks anteriores do slug antes de reinserir.

---

## Roadmap

- [ ] Autenticação de usuários (Supabase Auth)
- [ ] Histórico de conversas persistido no banco
- [ ] Suporte a múltiplos agentes (além de Reforma Tributária)
- [ ] Dashboard de analytics (queries, latência, uso de LLM)
- [ ] Ingestão automática via webhook quando novos documentos são adicionados

---

## Documentação Adicional

- **Spec técnica:** `directives/specs/plataforma-coesa.md` e `directives/specs/rag-reforma-tributaria.md`
- **Design system:** `directives/design-system.md`
- **POP de ingestão RAG:** `directives/rag-reforma-tributaria.md`
- **Watchdog de atualizações:** `directives/rag-watchdog.md`
