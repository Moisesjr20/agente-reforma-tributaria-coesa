-- ============================================================
-- Migração 004 — Busca Híbrida (vetorial + full-text) com RRF
-- Projeto: COESA Contabilidade — Agente Público
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- Motivação: a busca puramente vetorial perdia chunks que contêm o
-- termo exato (ex.: "NFS-e", "locação"). A busca híbrida combina o
-- ranking semântico (embedding) com o ranking lexical (full-text
-- português) via Reciprocal Rank Fusion (RRF), elevando o recall.
--
-- Consumo: supabase/functions/ask-reforma (RPC match_documents_hybrid,
--          com fallback automático para match_documents).
-- ============================================================

-- 1. Coluna full-text gerada (configuração 'portuguese') + índice GIN
alter table public.knowledge_documents
  add column if not exists content_tsv tsvector
  generated always as (to_tsvector('portuguese', content)) stored;

create index if not exists knowledge_documents_content_tsv_idx
  on public.knowledge_documents using gin (content_tsv);

-- 2. RPC de busca híbrida (RRF)
create or replace function public.match_documents_hybrid (
  query_text       text,
  query_embedding  vector(1536),
  match_count      int,
  full_text_weight float default 1.0,
  semantic_weight  float default 1.0,
  rrf_k            int   default 50,
  target_user_id   uuid  default null
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable
as $$
with fts as (
  select
    kd.id,
    row_number() over (
      order by ts_rank_cd(kd.content_tsv, websearch_to_tsquery('portuguese', query_text)) desc
    ) as rank_ix
  from public.knowledge_documents kd
  where (kd.user_id = target_user_id or kd.user_id is null)
    and query_text <> ''
    and kd.content_tsv @@ websearch_to_tsquery('portuguese', query_text)
  order by rank_ix
  limit least(match_count, 30) * 2
),
sem as (
  select
    kd.id,
    row_number() over (order by kd.embedding <=> query_embedding) as rank_ix
  from public.knowledge_documents kd
  where (kd.user_id = target_user_id or kd.user_id is null)
  order by rank_ix
  limit least(match_count, 30) * 2
)
select
  kd.id,
  kd.content,
  kd.metadata,
  1 - (kd.embedding <=> query_embedding) as similarity
from fts
full outer join sem on fts.id = sem.id
join public.knowledge_documents kd on kd.id = coalesce(fts.id, sem.id)
order by
  coalesce(1.0 / (rrf_k + fts.rank_ix), 0.0) * full_text_weight +
  coalesce(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight
  desc
limit least(match_count, 30);
$$;

-- ============================================================
-- Verificação pós-execução:
--   select count(*) from knowledge_documents where content_tsv @@ websearch_to_tsquery('portuguese', 'NFS-e locação');
--   select id, metadata->>'slug' as slug, round(similarity::numeric, 3) as sim
--   from match_documents_hybrid('nota fiscal de serviço locação',
--        array_fill(0, array[1536])::vector(1536), 6);
-- ============================================================
