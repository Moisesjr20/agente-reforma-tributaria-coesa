-- ============================================================
-- Migração 002 — Padronização RAG (alinhamento com GS Platform)
-- Cria knowledge_documents (vector 1536) + match_documents RPC
-- Execute no Supabase SQL Editor antes de rodar o novo script de ingestão
-- ============================================================

-- 1. Tabela knowledge_documents (espelho do GS, vector 1536)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = documento global
  content    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}'::jsonb,
  embedding  vector(1536),  -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índice HNSW para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_hnsw_idx
  ON public.knowledge_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. RPC match_documents (mesma assinatura do GS Platform)
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count     int,
  target_user_id  UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_documents kd
  WHERE (kd.user_id = target_user_id OR kd.user_id IS NULL)
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Leitura pública para documentos globais (agente público COESA)
CREATE POLICY "public read global docs"
  ON public.knowledge_documents FOR SELECT
  TO anon, authenticated
  USING (user_id IS NULL);

-- service_role tem acesso total (ingestão + Edge Function)
CREATE POLICY "service role full access"
  ON public.knowledge_documents FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- Verificação pós-execução:
-- SELECT count(*) FROM knowledge_documents;
-- SELECT match_documents('[0,0,...,0]'::vector(1536), 0.3, 3);
-- ============================================================
