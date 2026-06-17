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
- Se a informação não estiver nos trechos, diga: "Não encontrei informação suficiente na base de conhecimento para responder com precisão"
- NÃO insira marcadores de fonte no meio do texto. É PROIBIDO escrever referências como "(Documento [1])", "(Documento [2])", "[N]" ou "conforme o Documento X" ao longo dos parágrafos
- Quando precisar embasar uma afirmação, cite o instrumento normativo pelo nome e dispositivo (ex.: "art. 5º da LC 214/2025"), sem os marcadores numéricos dos trechos
- As fontes consultadas já são exibidas ao usuário em um painel separado. Se for útil consolidá-las, liste-as APENAS ao final da resposta, em uma seção "Fontes:" — nunca no meio do texto
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
  metadata: { slug: string; title: string; source_type: string; chunk_index: number };
  similarity: number;
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
  const MATCH_COUNT = parseInt(Deno.env.get("RAG_MATCH_COUNT") ?? "12");

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
    console.log(`retrieval=${retrieval} chunks=${chunks.length}`);

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

    // 3. Classificar complexidade e selecionar modelo
    const complexity = classifyComplexity(
      question,
      chunks,
      CHAR_THRESHOLD,
      SIM_THRESHOLD,
    );
    const model = complexity === "simple" ? MODEL_SIMPLE : MODEL_COMPLEX;

    // 4. Montar contexto e calcular métricas
    const avgSimilarity =
      chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;

    const sources = chunks.map((c) => ({
      slug: c.metadata.slug,
      title: c.metadata.title,
      similarity: Math.round(c.similarity * 1000) / 1000,
    }));

    const context = chunks
      .map(
        (c, i) =>
          `[${i + 1}] Documento: ${c.metadata.title} (${c.metadata.slug})\n${c.content}`,
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
    const answer: string = llmData.choices?.[0]?.message?.content ?? "";
    const latency_ms = Date.now() - startMs;

    // 6. Log (best-effort — não bloqueia resposta)
    supabase
      .from("query_logs")
      .insert({
        question,
        answer,
        model_used: model,
        chunks_used: chunks.map((c) => c.id),
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
