/**
 * Testes unitários — Edge Function ask-reforma
 * Runner: deno test supabase/functions/ask-reforma/index.test.ts
 *
 * Cobre apenas as funções puras exportadas (sem I/O, sem rede, sem env).
 */

import { assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert";

// ---------------------------------------------------------------------------
// Importar funções puras — sem executar o handler (Deno.serve)
// Usamos um stub mínimo para satisfazer a importação sem network
// ---------------------------------------------------------------------------

// Stub de createClient para evitar erro de importação ESM remoto nos testes
const _stubCreateClient = () => {};

// Importar diretamente as exportações do módulo
import {
  normalizeQuery,
  stripMeta,
  classifyComplexity,
  isRateLimited,
} from "./index.ts";

// ---------------------------------------------------------------------------
// normalizeQuery
// ---------------------------------------------------------------------------

Deno.test("normalizeQuery — mantém pergunta técnica sem meta-frase", () => {
  const q = "Quais são as alíquotas do IBS?";
  const result = normalizeQuery(q);
  // deve preservar a pergunta original e adicionar contexto ao final
  assertMatch(result, /Quais são as alíquotas do IBS\?/);
  assertMatch(result, /reforma tributaria brasileira/);
});

Deno.test("normalizeQuery — remove 'me fala sobre' do início", () => {
  const q = "me fala sobre o split payment na reforma";
  const result = normalizeQuery(q);
  assertEquals(result.startsWith("me fala"), false);
  assertMatch(result, /split payment na reforma/);
});

Deno.test("normalizeQuery — remove 'me explica sobre' do início", () => {
  const q = "me explica sobre as regras do IBS para serviços";
  const result = normalizeQuery(q);
  assertEquals(result.startsWith("me explica"), false);
  assertMatch(result, /regras do IBS para serviços/);
});

Deno.test("normalizeQuery — remove 'quero saber sobre' do início", () => {
  const q = "quero saber sobre o Comitê Gestor do IBS";
  const result = normalizeQuery(q);
  assertEquals(result.startsWith("quero saber"), false);
  assertMatch(result, /Comitê Gestor do IBS/);
});

Deno.test("normalizeQuery — NÃO remove meta-frase se o restante for < 8 chars", () => {
  // "me fala sobre IBS" — "IBS" tem 3 chars, abaixo do mínimo de 8
  const q = "me fala sobre IBS";
  const result = normalizeQuery(q);
  // deve manter a query original (sem strip), só acrescenta contexto
  assertMatch(result, /me fala sobre IBS/);
});

Deno.test("normalizeQuery — adiciona contexto em pergunta curta/vaga", () => {
  const q = "O que é o split payment?";
  const result = normalizeQuery(q);
  assertMatch(result, /IBS CBS LC 214/);
});

Deno.test("normalizeQuery — NÃO augmenta pergunta longa e específica de domínio", () => {
  const q = "Qual a data da obrigatoriedade da nota fiscal de serviço para locação?";
  const result = normalizeQuery(q);
  // longa (>= 60) e com termo de domínio ("nota fiscal") → mantém sinal intacto
  assertEquals(result, q);
  assertEquals(/reforma tributaria brasileira/.test(result), false);
});

Deno.test("stripMeta — remove meta-frase e devolve núcleo cru, sem contexto", () => {
  const q = "me fala sobre o split payment na reforma";
  const core = stripMeta(q);
  assertEquals(core, "o split payment na reforma");
  assertEquals(/IBS CBS LC 214/.test(core), false);
});

// ---------------------------------------------------------------------------
// classifyComplexity
// ---------------------------------------------------------------------------

const makeChunks = (sims: number[]) =>
  sims.map((similarity, i) => ({
    id: `c${i}`,
    content: "conteúdo",
    metadata: { slug: "doc", title: "Doc", source_type: "lei", chunk_index: i },
    similarity,
  }));

Deno.test("classifyComplexity — pergunta curta + alta similaridade + sem keywords = simple", () => {
  const chunks = makeChunks([0.90, 0.88, 0.85]);
  const result = classifyComplexity("O que é o IBS?", chunks, 100, 0.82);
  assertEquals(result, "simple");
});

Deno.test("classifyComplexity — pergunta longa (> charThreshold) = complex", () => {
  const longQ = "a".repeat(101);
  const chunks = makeChunks([0.95, 0.93]);
  const result = classifyComplexity(longQ, chunks, 100, 0.82);
  assertEquals(result, "complex");
});

Deno.test("classifyComplexity — similaridade média baixa (< simThreshold) = complex", () => {
  const chunks = makeChunks([0.50, 0.45, 0.40]);
  const result = classifyComplexity("O que é o IBS?", chunks, 100, 0.82);
  assertEquals(result, "complex");
});

Deno.test("classifyComplexity — keyword 'análise' presente = complex", () => {
  const chunks = makeChunks([0.92, 0.90]);
  const result = classifyComplexity("Faça uma análise do IBS", chunks, 100, 0.82);
  assertEquals(result, "complex");
});

Deno.test("classifyComplexity — keyword 'diferença entre' presente = complex", () => {
  const chunks = makeChunks([0.93, 0.91]);
  const result = classifyComplexity("Qual a diferença entre IBS e CBS?", chunks, 100, 0.82);
  assertEquals(result, "complex");
});

Deno.test("classifyComplexity — sem chunks (avgSim = 0) = complex", () => {
  const result = classifyComplexity("O que é o IBS?", [], 100, 0.82);
  assertEquals(result, "complex");
});

// ---------------------------------------------------------------------------
// isRateLimited
// ---------------------------------------------------------------------------

Deno.test("isRateLimited — primeira requisição nunca é limitada", () => {
  const ip = `test-ip-${Math.random()}`;
  assertEquals(isRateLimited(ip), false);
});

Deno.test("isRateLimited — abaixo do limite não bloqueia", () => {
  const ip = `test-ip-${Math.random()}`;
  // 1ª já foi contada, 2ª até 19ª não devem bloquear (limite = 20)
  for (let i = 0; i < 19; i++) {
    assertEquals(isRateLimited(ip), false, `tentativa ${i + 2} deve passar`);
  }
});

Deno.test("isRateLimited — bloqueia na 21ª requisição", () => {
  const ip = `test-ip-${Math.random()}`;
  // consome 20 slots (1ª a 20ª)
  for (let i = 0; i < 20; i++) isRateLimited(ip);
  // 21ª deve ser bloqueada
  assertEquals(isRateLimited(ip), true);
});

Deno.test("isRateLimited — IPs diferentes são independentes", () => {
  const ip1 = `test-ip-a-${Math.random()}`;
  const ip2 = `test-ip-b-${Math.random()}`;
  // exaurir ip1
  for (let i = 0; i < 21; i++) isRateLimited(ip1);
  // ip2 não deve ser afetado
  assertEquals(isRateLimited(ip2), false);
});
