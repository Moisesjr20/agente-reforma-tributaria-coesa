# POP — RAG Watchdog: Monitor Semanal de Atualizações

> **Versão:** 1.0 — 2026-06-09
> **Status:** APROVADO

---

## Objetivo

Manter a base de conhecimento do agente COESA automaticamente atualizada, detectando e ingerindo novos conteúdos legislativos toda semana sem intervenção manual.

---

## Arquitetura

```
[Cron na VPS — toda segunda 08:00 UTC]
          ↓
execution/rag-reforma/crawler_watchdog.py
          ↓
  ┌───────┴──────────────────────┐
  │                              │
html_direct                 link_discovery
(planalto.gov.br)           (consumo.tributos.gov.br)
  │                              │
Detecta mudança             Descobre PDFs novos
por SHA-256                 em 2 níveis de link
  │                              │
  sem mudança → skip         não visto → download → .tmp/watchdog/
  mudança → re-ingere        ↓
  ↓                      extract_text_from_pdf()
  └──────────────────────────────┘
          ↓
    split_into_chunks() → get_embedding() [Circuit Breaker 3x]
          ↓
    knowledge_documents (Supabase)
          ↓
    crawl_state + crawl_log (auditoria)
```

---

## Estratégias de Monitoramento

### `html_direct`
- Busca o HTML da URL
- Calcula SHA-256 do conteúdo
- Compara com o hash armazenado em `crawl_state`
- Se diferente: re-ingere o texto completo com o mesmo `slug`
- Usa quando o conteúdo inteiro da URL é o documento (ex: texto da lei)

### `link_discovery`
- Busca a página raiz
- Descobre todos os links para `.pdf` no mesmo domínio
- Visita até 10 subpáginas (1 nível) para encontrar mais PDFs
- Para cada PDF novo (não presente em `crawl_state`): baixa, extrai, ingere
- Usa quando a URL é um portal com múltiplos documentos linkados

---

## Fontes Monitoradas

| URL | Slug | Estratégia |
|-----|------|------------|
| `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm` | `lcp-214` | `html_direct` |
| `https://consumo.tributos.gov.br/` | `portal-cg-ibs` | `link_discovery` |

### Adicionar nova URL

1. Editar `execution/rag-reforma/crawler_watchdog.py`
2. Adicionar entrada em `WATCH_SOURCES`:
```python
{
    "url": "https://nova-url.gov.br/pagina",
    "slug": "meu-novo-slug",
    "title": "Título Descritivo",
    "source_type": "resolucao",   # lei | resolucao | nota-tecnica | faq | manual
    "strategy": "html_direct",    # ou "link_discovery"
}
```
3. Para `link_discovery`, adicionar também: `"base_domain": "nova-url.gov.br"`
4. Rodar `--dry-run` para validar antes da próxima execução agendada

---

## Configuração na VPS

### Pré-requisitos

```bash
# Python 3.10+
python3 --version

# Dependências
pip install -r execution/rag-reforma/requirements.txt

# .env na raiz do projeto (obrigatório)
cat .env
# OPENROUTER_API_KEY=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### Instalação do cron

```bash
bash execution/rag-reforma/setup_cron.sh
```

O script:
1. Verifica Python e dependências
2. Valida o `.env`
3. Registra entrada no `crontab` do usuário atual
4. Pergunta antes de sobrescrever um cron existente

### Verificar instalação

```bash
crontab -l
# deve mostrar:
# 0 8 * * 1 cd /path/to/projeto ... crawler_watchdog.py >> .tmp/watchdog.log 2>&1
```

### Remover cron

```bash
bash execution/rag-reforma/setup_cron.sh --remove
```

---

## Comandos de Operação

```bash
# Execução completa (produção)
python execution/rag-reforma/crawler_watchdog.py

# Simular sem inserir no banco
python execution/rag-reforma/crawler_watchdog.py --dry-run

# Forçar re-ingestão (ignora hash — útil após mudança de parâmetros)
python execution/rag-reforma/crawler_watchdog.py --force

# Rodar testes unitários
python -m pytest execution/rag-reforma/test_crawler_watchdog.py -v

# Ver logs em tempo real
tail -f .tmp/watchdog.log
```

---

## Tabelas de Auditoria (Supabase)

### `crawl_state`
Estado atual de cada URL monitorada.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `url` | text unique | URL monitorada |
| `slug` | text | Slug no knowledge_documents |
| `content_hash` | text | SHA-256 da última versão vista |
| `last_crawled_at` | timestamptz | Última execução |
| `last_changed_at` | timestamptz | Última vez que mudou |

### `crawl_log`
Histórico imutável de todas as execuções.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `url` | text | URL processada |
| `slug` | text | Slug afetado |
| `status` | text | `ok_no_change` \| `ok_updated` \| `ok_new` \| `error` |
| `hash_before` | text | Hash anterior (null = primeira vez) |
| `hash_after` | text | Hash após a execução |
| `chunks_inserted` | int | Chunks inseridos em `knowledge_documents` |
| `error_message` | text | Mensagem de erro (quando `status = error`) |
| `executed_at` | timestamptz | Timestamp da execução |

**Consultas úteis:**

```sql
-- Histórico das últimas 10 execuções
select url, slug, status, chunks_inserted, executed_at
from crawl_log
order by executed_at desc
limit 10;

-- URLs que mudaram nos últimos 30 dias
select url, slug, last_changed_at
from crawl_state
where last_changed_at > now() - interval '30 days';

-- Erros recentes
select url, error_message, executed_at
from crawl_log
where status = 'error'
order by executed_at desc
limit 5;
```

---

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| `[ERROR] Variáveis ausentes no .env` | `.env` não encontrado ou variável faltando | Verificar `.env` na raiz do projeto |
| `HTTP 403` ou `HTTP 429` | Site bloqueou o crawler | Aumentar `time.sleep()` ou ajustar `HEADERS` |
| `PDF sem texto extraível` | PDF é imagem (scaneado) | Adicionar OCR via `pytesseract` (fora do escopo atual) |
| `[CIRCUIT BREAKER]` ativado | API OpenRouter/Supabase instável | Verificar status das APIs; rodar novamente mais tarde |
| Cron não executa | `.env` não carregado pelo cron | Verificar que `setup_cron.sh` usou `set -a && . .env` |

---

## Circuit Breaker

Herdado de `update_knowledge_base.py`:
- **Máximo de 3 tentativas** por chunk ao gerar embeddings
- **Máximo de 3 erros consecutivos** por documento antes de abortar
- Em caso de ativação: status `error` é gravado em `crawl_log` e `sys.exit(1)` ao final

---

## Arquivos-Chave

| Arquivo | Responsabilidade |
|---------|-----------------|
| `execution/rag-reforma/crawler_watchdog.py` | Script principal do watchdog |
| `execution/rag-reforma/setup_cron.sh` | Instalação do cron na VPS |
| `execution/rag-reforma/test_crawler_watchdog.py` | Testes unitários |
| `supabase/migrations/003_crawl_watchdog.sql` | Schema das tabelas de auditoria |
| `.tmp/watchdog/` | PDFs temporários baixados (efêmero, ignorado pelo git) |
| `.tmp/watchdog.log` | Log de execuções do cron |
