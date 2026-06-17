/**
 * ask-reforma — Edge Function pública
 * Fase 3 do agente RAG Reforma Tributária (COESA)
 *
 * POST /functions/v1/ask-reforma
 * Body: { "question": "..." }
 * Response: { answer, sources, confidence, latency_ms, model_used }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const COMPLEX_KEYWORDS = [
  "compare", "analise", "análise", "diferença", "explique", "como funciona",
  "quais são", "por que", "impacto", "consequência", "vantagem", "desvantagem",
  "relação entre", "diferença entre", "quando", "histórico", "evolução",
];

const SYSTEM_PROMPT = `Você é um especialista tributário sênior da COESA Contabilidade com profundo conhecimento da Reforma Tributária brasileira (EC 132/2023, LC 214/2025 e regulamentações do Comitê Gestor do IBS).

Responda com base EXCLUSIVAMENTE nos trechos fornecidos abaixo. Seja tecnicamente rigoroso, cite artigos e parágrafos quando disponíveis, e use linguagem técnico-jurídica correta.

Regras obrigatórias:
- Use apenas as informações dos trechos fornecidos
- Responda com TODAS as informações relevantes presentes nos trechos. Se os trechos tratam do tema mas não cobrem exatamente o recorte da pergunta, NÃO abra a resposta com uma recusa: apresente primeiro o que há de concreto e, ao final, sinalize de forma pontual e breve apenas o aspecto específico que não consta na base
- Reserve a frase "Não encontrei informação suficiente na base de conhecimento para responder com precisão" EXCLUSIVAMENTE para quando NENHUM trecho tiver relação com a pergunta
- NÃO insira marcadores de fonte no meio do texto. É PROIBIDO escrever referências como "(Documento [1])", "[N]", "conforme o Documento X", "trecho N", ou o título/identificador interno dos documentos (ex.: "(Econet — Reforma Tributária (Parte 11), trecho 28)") ao longo dos parágrafos
- Quando precisar embasar uma afirmação, cite APENAS o instrumento normativo pelo nome e dispositivo (ex.: "art. 5º da LC 214/2025", "Resolução CG-IBS nº 6/2026"), nunca os rótulos internos dos trechos do contexto
- As fontes consultadas já são exibidas ao usuário em um painel separado pela aplicação. Portanto, NÃO escreva uma seção "Fontes:", "Referências:" ou lista de documentos ao final — não repita os documentos consultados. Encerre a resposta no conteúdo
- Responda sempre em português do Brasil
- Para questões técnicas ou analíticas, desenvolva a resposta completamente: contexto, regra, exceções, impactos práticos e exemplos quando aplicável
- Não trunce a resposta por brevidade — uma explicação incompleta é pior do que uma resposta longa e precisa
- Use estrutura clara com títulos, listas e subdivisões quando a resposta envolver múltiplos aspectos
- CRÍTICO: se você introduzir uma lista com frases como "os seguintes pontos", "as seguintes regras", "os itens abaixo" etc., você OBRIGATORIAMENTE deve escrever TODOS os itens da lista antes de encerrar a resposta. Nunca deixe uma lista anunciada sem conteúdo`;

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, por IP)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Query preprocessing — remove meta-frases coloquiais do início
// ---------------------------------------------------------------------------

const REFORM_CONTEXT = "reforma tributaria brasileira IBS CBS LC 214 imposto bens servicos";

// Termos de domínio. Se a pergunta já é longa e específica (contém algum
// destes), NÃO diluímos o embedding com o contexto genérico acima.
const DOMAIN_HINT_RE =
  /\b(ibs|cbs|reforma|tribut|lc\s*214|imposto|al[ií]quot|nfs|nota fiscal|split|cesta|seletivo|cclasstrib|cclass|diferimento|monof[aá]sic|importa)\b/i;

const META_PATTERNS = [
  /^me\s+\w+\s+o\s+que\s+vc\s+.+?\s+sobre\s+/i,
  /^me\s+(fala|conta|diga|diz|explica)\s+(sobre\s+)?/i,
  /^o\s+que\s+vc\s+.+?\s+sobre\s+/i,
  /^pode\s+me\s+\w+\s+sobre\s+/i,
  /^quero\s+(saber|entender)\s+(sobre\s+)?/i,
  /^fala\s+sobre\s+/i,
];

// Remove meta-frases coloquiais do início e devolve o núcleo cru da pergunta.
// Usado diretamente como termo da busca full-text (sem augmentação genérica,
// que poluiria o ts_query lexical).
export function stripMeta(q: string): string {
  for (const p of META_PATTERNS) {
    const m = q.match(p);
    if (m && q.slice(m[0].length).trim().length >= 8) {
      return q.slice(m[0].length).trim();
    }
  }
  return q;
}

// Texto usado para o EMBEDDING. Augmenta com contexto da reforma apenas em
// perguntas curtas ou vagas — perguntas longas e específicas mantêm o sinal
// semântico intacto (evita o "puxão" para o tema geral que reduz o recall).
export function normalizeQuery(q: string): string {
  const core = stripMeta(q);
  const needsContext = core.length < 60 || !DOMAIN_HINT_RE.test(core);
  return needsContext ? core + " " + REFORM_CONTEXT : core;
}

// Sanitização determinística da resposta: remove marcadores internos de
// trecho/documento que o LLM eventualmente vaza no corpo, e limpa os
// separadores pendentes deixados dentro de parênteses de citação.
export function sanitizeAnswer(text: string): string {
  let t = text;
  // "trecho 54", "trechos 54, 55"
  t = t.replace(/\btrechos?\s+\d+(\s*,\s*\d+)*/gi, "");
  // "(Documento [1])", "Documento 1", "[1]"
  t = t.replace(/\(?\s*documento\s*\[?\s*\d+\s*\]?\s*\)?/gi, "");
  t = t.replace(/\[\s*\d+\s*\]/g, "");
  // limpar separadores pendentes antes de ")" (ex.: "...6/2026; e )" -> "...6/2026)")
  t = t.replace(/[;,]\s*(e\s+)?(?=\))/gi, "");
  t = t.replace(/\(\s*[;,]\s*/g, "(");
  t = t.replace(/\(\s*e\s+/gi, "(");
  t = t.replace(/\(\s*\)/g, "");
  // normalizar espaços e pontuação
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/[ \t]+([.,;:)])/g, "$1");
  t = t.replace(/\(\s+/g, "(");
  return t.trim();
}

// ---------------------------------------------------------------------------
// OpenRouter embedding (openai/text-embedding-3-small, 1536 dims)
// ---------------------------------------------------------------------------

async function embedQuery(question: string, openrouterKey: string): Promise<number[]> {
  const resp = await fetch(OPENROUTER_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: [question],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embed ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.data[0].embedding as number[];
}

// ---------------------------------------------------------------------------
// Complexity routing
// ---------------------------------------------------------------------------

interface Chunk {
  id: string;
  content: string;
  metadata: {
    slug: string;
    title: string;
    source_type: string;
    chunk_index: number;
    total_chunks?: number;
  };
  similarity: number;
}

// Diversidade por documento: limita quantos chunks de um mesmo documento
// entram no contexto, preservando a ordem de relevância.
export function applyDiversity(chunks: Chunk[], maxPerDoc: number): Chunk[] {
  const perDoc = new Map<string, number>();
  const out: Chunk[] = [];
  for (const c of chunks) {
    const slug = c.metadata.slug;
    const n = perDoc.get(slug) ?? 0;
    if (n >= maxPerDoc) continue;
    perDoc.set(slug, n + 1);
    out.push(c);
  }
  return out;
}

// Janela de vizinhança: para cada hit, calcula os índices de chunk adjacentes
// (±radius) do mesmo documento que ainda não estão presentes — o agente passa
// a "ler o parágrafo inteiro ao redor" do trecho que casou, não o fragmento.
export function neighborTargets(
  primary: Chunk[],
  radius: number,
): { slug: string; indices: number[] }[] {
  const bySlug = new Map<string, { have: Set<number>; want: Set<number>; total: number }>();
  for (const c of primary) {
    const slug = c.metadata.slug;
    const idx = c.metadata.chunk_index;
    const total = c.metadata.total_chunks ?? Number.MAX_SAFE_INTEGER;
    if (!bySlug.has(slug)) bySlug.set(slug, { have: new Set(), want: new Set(), total });
    const e = bySlug.get(slug)!;
    e.have.add(idx);
    for (let d = -radius; d <= radius; d++) {
      if (d === 0) continue;
      const ni = idx + d;
      if (ni >= 1 && ni <= e.total) e.want.add(ni);
    }
  }
  const res: { slug: string; indices: number[] }[] = [];
  for (const [slug, e] of bySlug) {
    const indices = [...e.want].filter((i) => !e.have.has(i));
    if (indices.length) res.push({ slug, indices });
  }
  return res;
}

export function classifyComplexity(
  question: string,
  chunks: Chunk[],
  charThreshold: number,
  simThreshold: number,
): "simple" | "complex" {
  if (question.length > charThreshold) return "complex";

  const avgSim =
    chunks.reduce((s, c) => s + c.similarity, 0) / (chunks.length || 1);
  if (avgSim < simThreshold) return "complex";

  const lower = question.toLowerCase();
  if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) return "complex";

  return "simple";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

if (import.meta.main) Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // Rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: "Muitas requisições. Aguarde 1 minuto e tente novamente." },
      429,
    );
  }

  const startMs = Date.now();

  // Parse body
  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido no corpo da requisição" }, 400);
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 10 || question.length > 1000) {
    return jsonResponse(
      { error: "O campo 'question' deve ter entre 10 e 1000 caracteres" },
      400,
    );
  }

  // Env
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const MODEL_SIMPLE =
    Deno.env.get("OPENROUTER_MODEL_SIMPLE") ?? "qwen/qwen-2.5-72b-instruct";
  const MODEL_COMPLEX =
    Deno.env.get("OPENROUTER_MODEL_COMPLEX") ?? "google/gemini-2.5-flash";
  const CHAR_THRESHOLD = parseInt(
    Deno.env.get("ROUTER_COMPLEXITY_CHAR_THRESHOLD") ?? "100",
  );
  const SIM_THRESHOLD = parseFloat(
    Deno.env.get("ROUTER_COMPLEXITY_SIMILARITY_THRESHOLD") ?? "0.82",
  );
  const MATCH_COUNT = parseInt(Deno.env.get("RAG_MATCH_COUNT") ?? "24");
  const NEIGHBOR_RADIUS = parseInt(Deno.env.get("RAG_NEIGHBOR_RADIUS") ?? "1");
  const MAX_PER_DOC = parseInt(Deno.env.get("RAG_MAX_PER_DOC") ?? "10");
  const MAX_CONTEXT_CHUNKS = parseInt(Deno.env.get("RAG_MAX_CONTEXT_CHUNKS") ?? "60");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // 1. Normalizar e embedar a pergunta
    const queryForEmbedding = normalizeQuery(question);     // embedding (augmentação condicional)
    const queryForFullText = stripMeta(question);           // termo cru p/ busca lexical
    const embedding = await embedQuery(queryForEmbedding, OPENROUTER_KEY);

    // 2. Busca híbrida (vetorial + full-text via RRF). Fallback automático
    //    para a busca vetorial pura enquanto a migração 004 não foi aplicada.
    let chunks: Chunk[] = [];
    let retrieval = "hybrid";
    const hybrid = await supabase.rpc("match_documents_hybrid", {
      query_text: queryForFullText,
      query_embedding: embedding,
      match_count: MATCH_COUNT,
    });
    if (hybrid.error) {
      retrieval = "vector";
      const fb = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.30,
        match_count: MATCH_COUNT,
      });
      if (fb.error) throw new Error(`RPC match_documents: ${fb.error.message}`);
      chunks = fb.data ?? [];
    } else {
      chunks = hybrid.data ?? [];
    }
    // Nenhum resultado relevante
    if (chunks.length === 0) {
      return jsonResponse({
        answer:
          "Não encontrei informações relevantes na base de conhecimento para responder sua pergunta. Tente reformulá-la ou pergunte sobre um aspecto específico da Reforma Tributária.",
        sources: [],
        confidence: 0,
        latency_ms: Date.now() - startMs,
        model_used: "none",
      });
    }

    // 3. Classificar complexidade e selecionar modelo (sobre os hits primários)
    const complexity = classifyComplexity(
      question,
      chunks,
      CHAR_THRESHOLD,
      SIM_THRESHOLD,
    );
    const model = complexity === "simple" ? MODEL_SIMPLE : MODEL_COMPLEX;

    // 4. Visão ampliada: diversidade por documento + janela de vizinhança
    const primary = applyDiversity(chunks, MAX_PER_DOC);

    const haveIds = new Set(primary.map((c) => c.id));
    const neighbors: Chunk[] = [];
    for (const t of neighborTargets(primary, NEIGHBOR_RADIUS)) {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("id, content, metadata")
        .eq("metadata->>slug", t.slug)
        .in("metadata->>chunk_index", t.indices.map(String));
      if (error || !data) continue;
      for (const r of data as Chunk[]) {
        if (!haveIds.has(r.id)) {
          haveIds.add(r.id);
          neighbors.push({ ...r, similarity: 0 });
        }
      }
    }

    // melhor similaridade por documento → ordena documentos por relevância
    const docScore = new Map<string, number>();
    for (const c of primary) {
      docScore.set(
        c.metadata.slug,
        Math.max(docScore.get(c.metadata.slug) ?? 0, c.similarity),
      );
    }

    // contexto agrupado por documento (mais relevante primeiro), trechos em
    // ordem natural dentro de cada documento — limitado a MAX_CONTEXT_CHUNKS
    const contextChunks = [...primary, ...neighbors]
      .sort((a, b) => {
        const sa = docScore.get(a.metadata.slug) ?? 0;
        const sb = docScore.get(b.metadata.slug) ?? 0;
        if (sb !== sa) return sb - sa;
        if (a.metadata.slug !== b.metadata.slug) {
          return a.metadata.slug < b.metadata.slug ? -1 : 1;
        }
        return a.metadata.chunk_index - b.metadata.chunk_index;
      })
      .slice(0, MAX_CONTEXT_CHUNKS);

    console.log(
      `retrieval=${retrieval} primary=${primary.length} neighbors=${neighbors.length} context=${contextChunks.length}`,
    );

    // 5. Métricas e fontes (deduplicadas por documento, melhor similaridade)
    const avgSimilarity =
      primary.reduce((s, c) => s + c.similarity, 0) / primary.length;

    const sourceMap = new Map<
      string,
      { slug: string; title: string; similarity: number }
    >();
    for (const c of primary) {
      const sim = Math.round(c.similarity * 1000) / 1000;
      const ex = sourceMap.get(c.metadata.slug);
      if (!ex || sim > ex.similarity) {
        sourceMap.set(c.metadata.slug, {
          slug: c.metadata.slug,
          title: c.metadata.title,
          similarity: sim,
        });
      }
    }
    const sources = [...sourceMap.values()].sort(
      (a, b) => b.similarity - a.similarity,
    );

    const context = contextChunks
      .map(
        (c, i) =>
          `[${i + 1}] ${c.metadata.title} (${c.metadata.slug}) — trecho ${c.metadata.chunk_index}\n${c.content}`,
      )
      .join("\n\n---\n\n");

    const userMessage = `Contexto extraído da base de conhecimento:\n\n${context}\n\n---\n\nPergunta: ${question}`;

    // 5. Chamar OpenRouter
    const llmResp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://coesa.com.br",
        "X-Title": "COESA RAG Reforma Tributária",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!llmResp.ok) {
      const errText = await llmResp.text();
      console.error(`OpenRouter ${llmResp.status}:`, errText);
      return jsonResponse({
        answer: "Serviço de resposta temporariamente indisponível. Tente novamente em instantes.",
        sources: sources,
        confidence: Math.round(avgSimilarity * 100) / 100,
        latency_ms: Date.now() - startMs,
        model_used: model,
        error_detail: `LLM ${llmResp.status}`,
      }, 503);
    }

    const llmData = await llmResp.json();
    const rawAnswer: string = llmData.choices?.[0]?.message?.content ?? "";
    const answer = sanitizeAnswer(rawAnswer);
    const latency_ms = Date.now() - startMs;

    // 6. Log (best-effort — não bloqueia resposta)
    supabase
      .from("query_logs")
      .insert({
        question,
        answer,
        model_used: model,
        chunks_used: contextChunks.map((c) => c.id),
        latency_ms,
      })
      .then(({ error }) => {
        if (error) console.error("log error:", error.message);
      });

    // 7. Responder
    return jsonResponse({
      answer,
      sources,
      confidence: Math.round(avgSimilarity * 100) / 100,
      latency_ms,
      model_used: model,
    });
  } catch (err) {
    console.error("ask-reforma error:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "Erro interno. Tente novamente em instantes." }, 500);
  }
}); // fim if (import.meta.main)
