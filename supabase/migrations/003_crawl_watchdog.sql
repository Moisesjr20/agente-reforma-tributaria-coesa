-- ============================================================
-- Migração 003 — Watchdog de Atualizações RAG
-- Projeto: COESA Contabilidade — Agente Público
--
-- Tabelas:
--   crawl_state → último hash conhecido por URL monitorada
--   crawl_log   → histórico de cada execução do watchdog
-- ============================================================

-- Estado atual de cada URL monitorada
create table if not exists public.crawl_state (
  id               uuid primary key default gen_random_uuid(),
  url              text unique not null,
  slug             text not null,
  content_hash     text,
  last_crawled_at  timestamptz,
  last_changed_at  timestamptz,
  created_at       timestamptz default now()
);

-- Histórico de execuções do watchdog
create table if not exists public.crawl_log (
  id               uuid primary key default gen_random_uuid(),
  url              text not null,
  slug             text not null,
  status           text not null check (
    status in ('ok_no_change', 'ok_updated', 'ok_new', 'error')
  ),
  hash_before      text,
  hash_after       text,
  chunks_inserted  int default 0,
  error_message    text,
  executed_at      timestamptz default now()
);

-- Row Level Security
alter table public.crawl_state enable row level security;
alter table public.crawl_log   enable row level security;

create policy "service role full access crawl_state"
  on public.crawl_state for all
  to service_role using (true);

create policy "service role full access crawl_log"
  on public.crawl_log for all
  to service_role using (true);

-- ============================================================
-- Verificação pós-execução:
--   select * from crawl_state;
--   select * from crawl_log order by executed_at desc limit 10;
-- ============================================================
