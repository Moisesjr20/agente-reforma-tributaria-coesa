# Spec Técnica: Plataforma de IA COESA Contabilidade

> **Versão:** 1.0 — 2026-06-09
> **Status:** APROVADO
> **Projeto:** `projeto coesa/`

---

## 1. Contexto e Objetivo

Plataforma de IA para o escritório de contabilidade **COESA Contabilidade**. Serve contadores e clientes para consultas especializadas via chat com base em documentos legislativos e normativos indexados.

**Produto atual:** Assistente de Reforma Tributária — responde dúvidas sobre LC 214/2025, IBS, CBS, Split Payment e normas relacionadas.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + Vite + TypeScript | 18.3 / 5.4 / 5.5 |
| Testes UI | Vitest + Testing Library | 2.0 / 16.0 |
| Backend | Supabase Edge Functions (Deno) | - |
| Banco de dados | Supabase PostgreSQL + pgvector | - |
| Embeddings | OpenRouter → text-embedding-3-small | 1536 dims |
| LLM simples | qwen/qwen-2.5-72b-instruct via OpenRouter | - |
| LLM complexo | google/gemini-flash-1.5 via OpenRouter | - |
| Ingestão | Python 3.x + pdfplumber + supabase-py | - |
| Deploy | Supabase Cloud (Edge Functions) | - |

---

## 3. Identidade Visual

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#C9A227` | Dourado COESA — CTAs, destaques |
| `--color-secondary` | `#2D2D2D` | Carvão — textos, fundos |
| `--font-display` | Playfair Display | Títulos e headers |
| `--font-ui` | DM Sans | Corpo e UI |
| `--font-mono` | JetBrains Mono | Dados numéricos, código |

Estética: **Luxury Minimal** — profissional, premium, confiável.

> Referência completa: `directives/design-system.md`

---

## 4. Arquitetura de Domínios

```
projeto coesa/
├── frontend/                  ← UI (React)
│   └── src/
│       ├── components/        ← Componentes de apresentação
│       ├── hooks/             ← Estado e lógica de aplicação
│       ├── services/          ← Camada de infraestrutura (API, HTTP)
│       ├── types.ts           ← Contratos de domínio
│       └── styles/            ← Tokens CSS do design system
│
├── supabase/
│   ├── functions/ask-reforma/ ← Edge Function (orquestração RAG)
│   └── migrations/            ← Schema do banco de dados
│
└── execution/rag-reforma/     ← Pipeline de ingestão (Python)
```

**Regra de Isolamento (Inegociável #4):**
- `hooks/` conhece `services/` — nunca o contrário
- `services/` contém URLs, headers HTTP, credenciais de API
- `hooks/` contém apenas lógica de estado React
- Nenhuma URL hardcoded em componentes ou hooks

---

## 5. Fluxo da Aplicação

```
Usuário → ChatInput (min. 10 chars)
        → useChat() hook
        → reforma.service.ts (fetch)
        → Edge Function /ask-reforma
        → RAG retrieval (HNSW)
        → LLM (qwen | gemini)
        → { answer, sources, confidence, latency_ms, model_used }
        → MessageBubble + SourceCitations
```

---

## 6. Entidades de Domínio

```typescript
// frontend/src/types.ts
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
  confidence?: number;
  latency_ms?: number;
  model_used?: string;
  timestamp: Date;
}

interface Source {
  title: string;
  slug: string;
  similarity: number;
}

interface ApiResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  latency_ms: number;
  model_used: string;
}
```

---

## 7. Variáveis de Ambiente

```env
# .env na raiz do projeto
OPENROUTER_API_KEY=sk-or-...
SUPABASE_URL=https://<projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

---

## 8. Framework DOE — Camadas do Projeto

| Camada DOE | Diretório | Conteúdo |
|-----------|-----------|---------|
| Camada 1 — Diretivas | `directives/` | POPs e specs (este arquivo) |
| Camada 2 — Orquestração | `CLAUDE.md`, `.agents/` | Agentes, skills, vault |
| Camada 3 — Execução | `execution/`, `supabase/functions/` | Scripts e Edge Functions |

---

## 9. Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Busca vetorial | HNSW (pgvector) | Alta performance com baixa latência no Supabase |
| Roteamento de LLM | Complexidade da query | qwen-2.5 (simples) é mais barato; gemini-flash para raciocínio |
| Chunking | 1000 chars, overlap 200 | Balanceia precisão semântica vs. custo de embedding |
| Threshold | 0.3 | Elimina ruído sem descartar contexto relevante |
| Frontend | Vite + React (sem Next.js) | Deploy estático; sem necessidade de SSR neste MVP |

---

## 10. Roadmap (Próximas Features)

- [ ] Autenticação de usuários (Supabase Auth)
- [ ] Histórico de conversas persistido no banco
- [ ] Suporte a múltiplos agentes (além de Reforma Tributária)
- [ ] Dashboard de analytics (queries, latência, uso de LLM)
- [ ] Ingestão automática via webhook quando novos documentos são adicionados
