-- ============================================================
-- Migração 001 — Schema RAG Reforma Tributária (canônico)
-- Projeto: COESA Contabilidade — Agente Público
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- Embeddings: OpenAI text-embedding-3-small (1536 dims) via OpenRouter
-- Ingestão:   execution/rag-reforma/update_knowledge_base.py
-- Consumo:    supabase/functions/ask-reforma (RPC match_documents)
-- ============================================================

-- 1. Habilitar extensão pgvector
create extension if not exists vector;

-- 2. Base de conhecimento (chunks + embeddings)
--    user_id NULL = documento global (agente público COESA)
create table if not exists public.knowledge_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  content    text not null,
  metadata   jsonb default '{}'::jsonb,
  embedding  vector(1536),
  created_at timestamptz default now()
);

-- 3. Índice HNSW para busca vetorial eficiente
create index if not exists knowledge_documents_embedding_hnsw_idx
  on public.knowledge_documents
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. RPC de busca vetorial (consumida pela Edge Function ask-reforma)
create or replace function public.match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count     int,
  target_user_id  uuid default null
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language plpgsql as $$
begin
  return query
  select
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) as similarity
  from public.knowledge_documents kd
  where (kd.user_id = target_user_id or kd.user_id is null)
    and 1 - (kd.embedding <=> query_embedding) > match_threshold
  order by kd.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Logs de consultas (best-effort, escrito pela Edge Function)
create table if not exists public.query_logs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text,
  model_used  text,
  chunks_used uuid[],
  latency_ms  int,
  feedback    smallint check (feedback in (-1, 1)),
  created_at  timestamptz default now()
);

-- 6. Row Level Security
alter table public.knowledge_documents enable row level security;
alter table public.query_logs          enable row level security;

-- Leitura pública dos documentos globais (agente público)
create policy "public read global docs"
  on public.knowledge_documents for select
  to anon, authenticated
  using (user_id is null);

-- service_role tem acesso total (ingestão + Edge Function)
create policy "service role full access"
  on public.knowledge_documents for all
  to service_role
  using (true);

-- query_logs: somente service_role lê/escreve
create policy "service role only query_logs"
  on public.query_logs for all
  to service_role
  using (true);

-- ============================================================
-- Verificação pós-execução:
--   select extname, extversion from pg_extension where extname = 'vector';
--   select count(*) from knowledge_documents;
--   select match_documents(array_fill(0, array[1536])::vector(1536), 0.3, 3);
-- ============================================================
