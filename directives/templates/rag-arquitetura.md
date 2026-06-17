# Diretiva: Arquitetura RAG — Plataforma ULTRA de IA

> **Localização:** `D:\Clientes de BI\projeto gs\arquitetura-rag.md`  
> **Versão:** 1.0 — 2026-06-09  
> **Status:** APROVADO  
> **Projeto:** `plataforma de ia/`

---

## 1. Visão Geral

O RAG (Retrieval-Augmented Generation) da plataforma ULTRA é um sistema de contexto em camadas que enriquece o prompt enviado ao LLM com documentos relevantes recuperados por busca vetorial, posicionamento do usuário e memória acumulada entre sessões. Nenhum dado é alucinado: tudo que o agente sabe sobre o cliente vem de fontes indexadas e recuperadas em tempo real.

---

## 2. Fluxo Completo — Mensagem do Usuário → Resposta do Agente

```
[1] Usuário envia mensagem
        ↓
[2] Mensagem salva no banco (tabela conversations)
        ↓
[3] Execução paralela:
    ├── searchKnowledgeBase(query, userId)   ← busca vetorial
    ├── fetchUserPositioning(userId)         ← ICP, Copy Mestre, Manual
    └── fetchLearningBank(userId)            ← memória cross-sessão
        ↓
[4] buildContext(documents, positioning, learningBank)
        ↓
[5] buildSystemPrompt(agent, skill, ragContext)
        ↓
[6] LLM via OpenRouter → resposta em streaming (SSE)
        ↓
[7] Resposta salva no banco
[8] A cada 10 mensagens → updateLearningBank()
```

---

## 3. Camadas de Contexto (Ordem de Prioridade)

O contexto é montado em ordem de prioridade. Cada camada tem um orçamento máximo de caracteres:

| Ordem | Camada | Fonte | Limite |
|-------|--------|-------|--------|
| 1ª | **Learning Bank** | `user_learning_bank` | 2.000 chars |
| 2ª | **ICP + StoryBrand** | `user_icp_storybrand` | 4.000 chars |
| 3ª | **Copy Mestre** | `user_copy_mestre` | 4.000 chars |
| 4ª | **Manual Estratégico** | `user_manual_estrategico` | 3.000 chars |
| 5ª | **Documentos RAG** | `knowledge_documents` (vetor) | 12.000 chars |

**Orçamento total do RAG:** 12.000 chars (configurável em `rag.ts → contextWindow`).  
As camadas 1–4 têm limites fixos. A camada 5 preenche o espaço restante.

---

## 4. Banco de Dados (Supabase / PostgreSQL)

### 4.1 Tabela principal de documentos

```sql
-- Tabela: knowledge_documents
-- Migration: supabase/migrations/20240505_deep_rag_architecture.sql

id          UUID PRIMARY KEY
user_id     UUID REFERENCES auth.users  -- NULL = documento global
content     TEXT                        -- chunk de ~1000 chars
metadata    JSONB  -- { source, agent, type, chunk_index, total_chunks, content_hash }
embedding   vector(1536)                -- openai/text-embedding-3-small
created_at  TIMESTAMP
```

- `user_id = NULL` → documento global (compartilhado entre todos os usuários)
- `user_id = <uuid>` → documento privado do usuário
- `metadata.type = 'rag'` → chunk padrão de busca
- `metadata.type = 'skill'` → skeleton do agente Augusto (não entra no RAG, é injetado separadamente)

### 4.2 Índice vetorial HNSW

```sql
-- Migration: supabase/migrations/20260507_vector_index_and_usage_rpc.sql
CREATE INDEX ON knowledge_documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

O HNSW garante busca aproximada de vizinhos mais próximos com alta performance.

### 4.3 Função RPC de busca

```sql
-- Função: match_documents(query_embedding, match_threshold, match_count, target_user_id)
-- Retorna documentos com similaridade de cosseno ≥ threshold
-- Combina docs globais (user_id IS NULL) + docs do usuário
SELECT id, content, metadata,
       1 - (embedding <=> query_embedding) AS similarity
FROM knowledge_documents
WHERE user_id IS NULL OR user_id = target_user_id
  AND 1 - (embedding <=> query_embedding) >= match_threshold
ORDER BY similarity DESC
LIMIT match_count;
```

### 4.4 Tabelas de posicionamento (por usuário)

| Tabela | Conteúdo | Gerado por |
|--------|----------|------------|
| `user_icp_storybrand` | Perfil do herói, problemas, desejos, transformação | Wizard de onboarding |
| `user_copy_mestre` | Tom de voz, narrativa, diferenciadores, big idea | `positioning-service.ts` |
| `user_manual_estrategico` | Diretrizes editoriais P1–P4 | `positioning-service.ts` |
| `user_learning_bank` | Preferências acumuladas, estilo, nicho, ICP | Atualizado a cada 10 msgs |

---

## 5. Pipeline de Ingestão de Documentos

### 5.1 Script principal (Python)

```bash
# Arquivo: execution/update_knowledge_base.py

# Exemplos de uso:
python execution/update_knowledge_base.py --agent augusto
python execution/update_knowledge_base.py --agent "carol sdr"
python execution/update_knowledge_base.py --agent augusto --file "copy-mestre.txt" --dry-run
```

**Processo interno:**
1. Lê arquivos PDF/TXT de `base deconhecimento/<agente>/`
2. Detecta arquivos não-indexáveis (system_prompt, modelo de resposta) e os ignora
3. Detecta arquivos de skill (nome contém "skeleton" ou "-skill") → insere com `type: "skill"`
4. Divide texto em chunks de **1.000 chars com overlap de 200 chars**
5. Gera embeddings via OpenRouter (`openai/text-embedding-3-small`, 1536 dimensões)
6. Insere na tabela `knowledge_documents` como documento global (`user_id = NULL`)

**Metadados inseridos por chunk:**
```json
{
  "source": "nome-do-arquivo.txt",
  "agent": "augusto",
  "type": "rag",
  "chunk_index": 1,
  "total_chunks": 5,
  "content_hash": "md5_do_conteudo"
}
```

### 5.2 Script especializado (TypeScript — Carol SDR)

```bash
# Arquivo: scripts/ingest_carol_manual.ts
# Uso: npx ts-node scripts/ingest_carol_manual.ts
```

- Específico para o "Manual de Quebra de Objeções"
- Chunking por seções (separadores `___`) e depois por frases
- Idempotente: apaga versões anteriores antes de reinserir

---

## 6. Geração de Embeddings

| Contexto | Método | API |
|----------|--------|-----|
| Busca em tempo real (browser) | `getEmbedding(text)` em `src/services/openai.ts` | `POST /api/embeddings` → OpenRouter |
| Ingestão em batch | `update_knowledge_base.py` | OpenRouter direto |

**Modelo:** `openai/text-embedding-3-small`  
**Dimensões:** 1536  
**Rota proxy do servidor:** `POST /api/embeddings` em `server/index.ts` (timeout: 30s)

---

## 7. Parâmetros de Configuração (Tunáveis em Runtime)

Todos em `src/services/rag.ts`:

| Parâmetro | Valor padrão | Descrição |
|-----------|-------------|-----------|
| `threshold` | `0.3` | Similaridade mínima (0–1) para incluir um documento |
| `maxResults` | `5` | Máximo de documentos retornados por busca |
| `contextWindow` | `12.000 chars` | Orçamento total dos documentos RAG no prompt |
| `enabled` | `true` | Liga/desliga o RAG globalmente |

Controle via UI: componente `src/components/rag-controls.tsx`.

---

## 8. Sistema de Skills (Augusto — Separado do RAG)

Os **skeletons** do agente Augusto não entram no fluxo de busca vetorial. São injetados diretamente no mega prompt quando detectado o tipo de conteúdo:

| Skill Key | Arquivo de origem | Quando injetado |
|-----------|-------------------|-----------------|
| `p1-reels` | `Skill de SKELETON P1 REELS.txt` | mensagem menciona P1 + reels |
| `p1-carrossel` | `Skill de SKELETON P1 CARROSSEL.txt` | mensagem menciona P1 + carrossel |
| `p2-reels` | `Skill de SKELETON P2 REELS.txt` | mensagem menciona P2 + reels |
| `p2-carrossel` | `Skill de SKELETON P2 CARROSSEL.txt` | mensagem menciona P2 + carrossel |
| `p3-reels` | `Skill de SKELETON P3 REELS.txt` | mensagem menciona P3 + reels |
| `p3-carrossel` | `Skill de SKELETON P3 CARROSSEL.txt` | mensagem menciona P3 + carrossel |
| `destaques` | `Skill de SKELETON DESTAQUES.txt` | mensagem menciona destaques |

**Loader:** `src/data/agent-skills.ts` → `loadAugustoSkills()` / `getAugustoSkill()`  
**Injeção:** `buildSystemPrompt()` em `src/services/openai.ts` (apenas para Augusto)

---

## 9. Memória Cross-Sessão (Learning Bank)

O Learning Bank acumula aprendizados sobre o usuário ao longo de todas as sessões:

```
A cada 10 mensagens → generateSessionSummary() → updateLearningBank()
```

- **Capacidade:** 1.500 chars (conteúdo consolidado)
- **Conteúdo:** preferências de estilo, nicho, persona do ICP, decisões editoriais recorrentes
- **Prioridade:** injetado primeiro no contexto (antes do posicionamento)
- **Tabela:** `user_learning_bank` (uma linha por usuário, atualizada por merge)

---

## 10. Agentes e Seus Documentos de Base

| Agente | ID | Documentos indexados (RAG) | Sistema não-indexado |
|--------|----|---------------------------|----------------------|
| Augusto | `augusto` | Skeletons P1/P2/P3 (como `skill`) | `prompt_system.txt`, `modelo de resposta*.txt` |
| Carol SDR | `carol-sdr` | Manual de objeções, funil social selling, scripts | `system_prompt.txt` |
| Estrategista | `estrategista` | *(a definir)* | `system_prompt.txt`, `exemplo-conversa-ideal.md` |
| Analista de Call | `analista-call` | Checklists, roteiros, scripts de sessão | `system-prompt.txt` |
| Designer | `designer` | Referências (pasta `references/`) | `system_prompt.txt` |

**Localização física:** `plataforma de ia/base deconhecimento/<agente>/`

---

## 11. Arquivos-Chave

| Responsabilidade | Arquivo |
|-----------------|---------|
| Serviço RAG central | `src/services/rag.ts` |
| Busca vetorial (hook) | `src/hooks/use-chat.ts` |
| Embeddings + system prompt | `src/services/openai.ts` |
| Skills do Augusto | `src/data/agent-skills.ts` |
| Configuração dos agentes | `src/data/agents.ts` |
| System prompts (Vite ?raw) | `src/data/agent-system-prompts.ts` |
| Posicionamento do usuário | `src/services/positioning-service.ts` |
| Learning bank | `src/services/learning-bank.ts` |
| Ingestão Python | `execution/update_knowledge_base.py` |
| Ingestão Carol (TS) | `scripts/ingest_carol_manual.ts` |
| Schema banco vetorial | `supabase/migrations/20240505_deep_rag_architecture.sql` |
| Índice HNSW + RPC usage | `supabase/migrations/20260507_vector_index_and_usage_rpc.sql` |
| Tabelas de posicionamento | `supabase/migrations/20260514_positioning_tables.sql` |
| Manual Estratégico | `supabase/migrations/20260515_manual_estrategico.sql` |
| Learning bank (migration) | `supabase/migrations/20260513_learning_bank.sql` |
| UI de controle RAG | `src/components/rag-controls.tsx` |
| Servidor proxy (embeddings) | `server/index.ts` |
| POP de gestão RAG | `directives/rag-knowledge-base.md` |

---

## 12. Como Adicionar Novos Documentos à Base de Conhecimento

1. Colocar o arquivo `.txt` ou `.pdf` em `plataforma de ia/base deconhecimento/<agente>/`
2. Executar:
   ```bash
   python execution/update_knowledge_base.py --agent <id-do-agente>
   ```
3. Verificar no Supabase Dashboard (tabela `knowledge_documents`) se os chunks foram inseridos.
4. Testar com uma mensagem que acione aquele conteúdo e confirmar que `similarity >= 0.3`.

Para rollback: excluir os registros pelo campo `metadata->>'source' = 'nome-do-arquivo.txt'`.

---

## 13. Regras de Não-Indexação

O script Python ignora automaticamente arquivos que contenham no nome:
- `system_prompt` / `prompt_system` → são system prompts do agente, não RAG
- `modelo de resposta` → templates de formato, não conhecimento

Esses arquivos são carregados diretamente por Vite via `?raw` em `agent-system-prompts.ts`.
