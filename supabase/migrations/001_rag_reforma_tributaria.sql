-- ============================================================
-- Migração 001 — RAG Reforma Tributária
-- Projeto: COESA Contabilidade — Agente Público
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. Habilitar extensão pgvector
create extension if not exists vector;

-- 2. Tabela de documentos fonte
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  source_type text not null check (source_type in ('lei', 'nota-tecnica', 'manual', 'faq', 'resolucao')),
  version     text,
  ingested_at timestamptz default now()
);

-- 3. Tabela de chunks com embeddings
create table if not exists chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content     text not null,
  chunk_index int  not null,
  token_count int,
  embedding   vector(768),    -- Google text-embedding-004 = 768 dims
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- 4. Índice HNSW para busca vetorial eficiente
create index if not exists chunks_embedding_hnsw_idx
  on chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 5. Tabela de logs de consultas
create table if not exists query_logs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text,
  model_used  text,
  chunks_used uuid[],
  latency_ms  int,
  feedback    smallint check (feedback in (-1, 1)),
  created_at  timestamptz default now()
);

-- 6. Função RPC de busca vetorial
create or replace function match_chunks (
  query_embedding vector(768),
  match_threshold float default 0.75,
  match_count     int   default 5
)
returns table (
  id             uuid,
  content        text,
  similarity     float,
  document_title text,
  source_type    text,
  slug           text
)
language sql stable
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title       as document_title,
    d.source_type,
    d.slug
  from chunks c
  join documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 7. Row Level Security
alter table documents  enable row level security;
alter table chunks     enable row level security;
alter table query_logs enable row level security;

-- Leitura pública para documents e chunks (agente público)
create policy "public read documents"
  on documents for select
  to anon, authenticated
  using (true);

create policy "public read chunks"
  on chunks for select
  to anon, authenticated
  using (true);

-- query_logs: somente service_role pode ler/escrever
create policy "service role only query_logs"
  on query_logs for all
  to service_role
  using (true);

-- ============================================================
-- Verificação pós-execução (rode após a migração):
-- select extname, extversion from pg_extension where extname = 'vector';
-- select count(*) from documents;
-- select count(*) from chunks;
-- ============================================================
