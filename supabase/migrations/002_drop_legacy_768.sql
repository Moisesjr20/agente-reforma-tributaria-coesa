-- ============================================================
-- Migração 002 — Remoção do schema legado (pipeline 768 dims)
-- Projeto: COESA Contabilidade
--
-- O RAG migrou para embeddings OpenAI 1536 dims (ver migração 001).
-- O path antigo (Jina/Google 768 dims) e seus objetos ficaram órfãos:
--   - função  match_chunks
--   - tabela  chunks
--   - tabela  documents
--
-- Rode este script UMA VEZ em bancos onde o schema antigo foi aplicado.
-- Em bancos novos (só com a migração 001) é um no-op seguro.
-- ============================================================

drop function if exists public.match_chunks(vector, float, int);
drop table    if exists public.chunks    cascade;
drop table    if exists public.documents cascade;

-- ============================================================
-- Verificação pós-execução (devem retornar 0 linhas):
--   select to_regclass('public.chunks');
--   select to_regclass('public.documents');
--   select proname from pg_proc where proname = 'match_chunks';
-- ============================================================
