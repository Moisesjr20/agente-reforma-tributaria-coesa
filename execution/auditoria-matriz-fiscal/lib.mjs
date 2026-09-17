// lib.mjs — Camada 3 (lógica determinística de auditoria)
//
// Funções PURAS de validação da Matriz Fiscal COESA contra as tabelas oficiais
// cClassTrib / CST-IBS/CBS (LC 214/2025). Sem I/O, sem rede — 100% testável.
//
// Convenção de severidade: "ERRO" (bloqueia config no ERP) > "ALERTA" (revisar)
// > "INFO" (ponto de atenção jurídico).

// ---------------------------------------------------------------------------
// Parsing / normalização
// ---------------------------------------------------------------------------

// Parser CSV mínimo com suporte a campos entre aspas e vírgulas internas.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\r") { /* ignore */ }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Converte CSV (com cabeçalho) em array de objetos.
export function csvToObjects(text) {
  const rows = parseCsv(text).filter((r) => r.length && r.some((c) => c !== ""));
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

// Trata "—", "-", "n/a", vazio como "sem valor".
export function isBlank(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "—" || s === "-" || s === "–" || s === "n/a" || s === "na";
}

// Extrai só os dígitos de um código (cClassTrib/CST podem vir com espaços).
export function digits(v) {
  return String(v ?? "").replace(/\D/g, "");
}

// NCM: só dígitos; capítulo = 2 primeiros dígitos; posição = 4 primeiros.
export function ncmDigits(v) { return digits(v); }
export function ncmChapter(v) { const d = ncmDigits(v); return d.length >= 2 ? d.slice(0, 2) : ""; }
export function ncmPosition(v) { const d = ncmDigits(v); return d.length >= 4 ? d.slice(0, 4) : ""; }

// ---------------------------------------------------------------------------
// Índice das tabelas oficiais
// ---------------------------------------------------------------------------

// Constrói Map: cClassTrib(6díg) -> metadados oficiais.
export function buildClassIndex(cclassObjects) {
  const idx = new Map();
  for (const o of cclassObjects) {
    const code = digits(o["cClassTrib"]);
    if (!code) continue;
    idx.set(code, {
      cst: digits(o["CST-IBS/CBS"]),
      nome: o["Nome cClassTrib"] ?? "",
      tipoAliquota: o["Tipo de Alíquota"] ?? "",
      pRedIBS: o["pRedIBS"] ?? "",
      pRedCBS: o["pRedCBS"] ?? "",
      indNFe: o["indNFe"] ?? "",
      indNFCe: o["indNFCe"] ?? "",
      dIniVig: o["dIniVig"] ?? "",
      dFimVig: o["dFimVig"] ?? "",
    });
  }
  return idx;
}

export function buildCstSet(cstObjects) {
  const s = new Set();
  for (const o of cstObjects) {
    const c = digits(o["CST-IBS/CBS"]);
    if (c) s.add(c);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Heurísticas de domínio (restaurante)
// ---------------------------------------------------------------------------

// Detecção de álcool baseada em CATEGORIA (sinal confiável e sem ambiguidade
// na planilha) + posição NCM alcoólica. Evita falsos-positivos de substring
// na descrição ("CHAMPIGNON"≠champagne, "COPO NADIR WHISKY"=utensílio,
// "CAFÉ EXPRESSO"/"NESPRESSO"/"ÁGUA DE COCO"=não alcoólicos).
export const ALCO_CATEGORIES = new Set([
  "vinhos e espumantes",
  "carta de vinhos",
  "destilados",
  "cervejas",
]);

// Capítulo 22 posições alcoólicas (2203 cerveja … 2208 destilados).
const ALCO_NCM_POS = new Set(["2203", "2204", "2205", "2206", "2207", "2208"]);

export function isAlcoholic(item) {
  const cat = String(item["Categoria"] ?? "").trim().toLowerCase();
  if (ALCO_CATEGORIES.has(cat)) return true;
  if (ALCO_NCM_POS.has(ncmPosition(item["NCM (atual)"]))) return true;
  return false;
}

// Cadastro de teste / inválido (nome de fornecedor, "teste", "não utilizar"…).
const JUNK_RE = /\b(teste|n[ãa]o utilizar|nao utilizar|ltda|distribuidora|dist\b|distribui|fornecedor|importacao\d|eleg[âa]ncia)\b/i;

export function looksLikeJunk(item) {
  const desc = String(item["Descricao do Item"] ?? "");
  return JUNK_RE.test(desc);
}

// A linha é de SAÍDA tributada (tem cClassTrib de saída preenchido)?
export function hasSaida(item) {
  return !isBlank(item["cClassTrib (saída)"]);
}

// ---------------------------------------------------------------------------
// Regras — cada uma retorna array de findings {rule, severity, campo, msg}
// ---------------------------------------------------------------------------

// R1 — cClassTrib (saída e entrada) precisa existir na tabela oficial.
export function ruleR1_codeExists(item, ctx) {
  const out = [];
  for (const campo of ["cClassTrib (saída)", "cClassTrib ENTRADA (crédito)"]) {
    const raw = item[campo];
    if (isBlank(raw)) continue;
    const code = digits(raw);
    // Campos de entrada às vezes trazem "000001 (padrão)" -> extrai o código.
    if (!code) continue;
    if (!ctx.classIndex.has(code)) {
      out.push({ rule: "R1", severity: "ERRO", campo, msg: `cClassTrib '${code}' não consta na tabela oficial ${ctx.tableVersion}` });
    }
  }
  return out;
}

// R2 — par CST × cClassTrib (saída) coerente com a tabela oficial.
export function ruleR2_pairing(item, ctx) {
  if (!hasSaida(item)) return [];
  const code = digits(item["cClassTrib (saída)"]);
  const cst = digits(item["CST IBS/CBS (saída)"]);
  const meta = ctx.classIndex.get(code);
  if (!meta) return []; // R1 já reporta código inexistente
  const out = [];
  if (cst && meta.cst && cst !== meta.cst) {
    out.push({ rule: "R2", severity: "ERRO", campo: "CST IBS/CBS (saída)", msg: `CST '${cst}' não é o par oficial de cClassTrib '${code}' (esperado CST '${meta.cst}')` });
  }
  return out;
}

// R2b — código válido para o documento que o restaurante emite (NFC-e / NF-e).
export function ruleR2b_docType(item, ctx) {
  if (!hasSaida(item)) return [];
  const code = digits(item["cClassTrib (saída)"]);
  const meta = ctx.classIndex.get(code);
  if (!meta) return [];
  if (meta.indNFCe === "0" && meta.indNFe === "0") {
    return [{ rule: "R2b", severity: "ALERTA", campo: "cClassTrib (saída)", msg: `cClassTrib '${code}' não é sinalizado como válido para NFC-e nem NF-e na tabela oficial` }];
  }
  return [];
}

// R3 — capítulo do NCM compatível com a categoria/natureza.
export function ruleR3_ncmChapter(item) {
  const ncm = ncmDigits(item["NCM (atual)"]);
  if (!ncm) return []; // R5 cobre ausência
  const chap = ncmChapter(ncm);
  const cat = String(item["Categoria"] ?? "");
  const out = [];
  // Hortifrúti in natura deve estar nos caps. 07 (hortaliças) ou 08 (frutas).
  if (/hortifruti|hortifrúti/i.test(cat)) {
    if (["17", "18", "19", "21"].includes(chap)) {
      out.push({ rule: "R3", severity: "ERRO", campo: "NCM (atual)", msg: `Categoria HORTIFRUTI com NCM do cap. ${chap} (preparação/confeitaria) — incompatível com in natura (caps. 07/08)` });
    }
  }
  // Categoria alcoólica (bebida) deve ter NCM do cap. 22. Se não tiver, ou o
  // NCM está errado (ex.: vinho no cap. 07) ou a categoria está errada
  // (ex.: xarope/rolha em DESTILADOS) — ambos exigem revisão.
  const catL = cat.trim().toLowerCase();
  if (isAlcoholic(item) && chap && chap !== "22") {
    const via = ALCO_CATEGORIES.has(catL) ? `categoria alcoólica '${cat.trim()}'` : "sinal alcoólico";
    out.push({ rule: "R3", severity: "ERRO", campo: "NCM (atual)", msg: `${via} mas NCM do cap. ${chap} (não é bebida do cap. 22) — revisar NCM ou categoria` });
  }
  return out;
}

// R4 — bebida alcoólica cadastrada como INSUMO (deveria ser revenda/saída integral).
export function ruleR4_alcoholInsumo(item) {
  if (!isAlcoholic(item)) return [];
  const grupo = String(item["GRUPO FISCAL CORRETO"] ?? "");
  if (/insumo/i.test(grupo)) {
    return [{ rule: "R4", severity: "ALERTA", campo: "GRUPO FISCAL CORRETO", msg: `Bebida alcoólica classificada como '${grupo.trim()}' — reclassificar para REVENDA (saída integral, fora do regime de bar/restaurante, art. 273 §2º III)` }];
  }
  return [];
}

// R5 — NCM ausente / zerado ou cadastro de teste.
export function ruleR5_invalidCadastro(item) {
  const ncm = ncmDigits(item["NCM (atual)"]);
  const out = [];
  if (!ncm || /^0+$/.test(ncm)) {
    out.push({ rule: "R5", severity: "ERRO", campo: "NCM (atual)", msg: "NCM ausente ou zerado (00000000) — cadastrar antes de configurar o IBS/CBS" });
  }
  if (looksLikeJunk(item)) {
    out.push({ rule: "R5", severity: "ALERTA", campo: "Descricao do Item", msg: "Descrição sugere cadastro de teste / nome de fornecedor — sanear ou excluir" });
  }
  return out;
}

// R6 — Imposto Seletivo: bebida alcoólica marcada só como tributação integral
// (000001) sem sinalização de IS. LC 214/2025 sujeita bebidas alcoólicas ao IS.
export function ruleR6_impostoSeletivo(item) {
  if (!isAlcoholic(item)) return [];
  const code = digits(item["cClassTrib (saída)"]);
  const consid = String(item["CONSIDERAÇÕES COESA"] ?? "") + String(item["FUNDAMENTO LC 214/25"] ?? "");
  if (code === "000001" && !/seletivo|\bIS\b/i.test(consid)) {
    return [{ rule: "R6", severity: "INFO", campo: "cClassTrib (saída)", msg: "Bebida alcoólica tratada como tributação integral (000001) sem menção ao Imposto Seletivo — confirmar incidência do IS (LC 214/2025)" }];
  }
  return [];
}

// R7 — coerência natureza declarada × faixa de cClassTrib de saída.
export function ruleR7_naturezaCoerencia(item) {
  if (!hasSaida(item)) return [];
  const nat = String(item["NATUREZA NA REFORMA"] ?? "").toLowerCase();
  const code = digits(item["cClassTrib (saída)"]);
  const out = [];
  // Saída de bebida alcoólica -> deve ser 000001 (integral).
  if (/bebida alco/i.test(nat) && code !== "000001") {
    out.push({ rule: "R7", severity: "ALERTA", campo: "cClassTrib (saída)", msg: `Natureza 'bebida alcoólica' mas cClassTrib '${code}' (esperado 000001 — tributação integral)` });
  }
  // Regime de bar/restaurante -> deve ser 200047.
  if (/bares e restaurantes|regime de bares/i.test(nat) && code !== "200047") {
    out.push({ rule: "R7", severity: "ALERTA", campo: "cClassTrib (saída)", msg: `Natureza 'regime de bares e restaurantes' mas cClassTrib '${code}' (esperado 200047 — redução 40%)` });
  }
  return out;
}

export const ALL_RULES = [
  ruleR1_codeExists,
  ruleR2_pairing,
  ruleR2b_docType,
  ruleR3_ncmChapter,
  ruleR4_alcoholInsumo,
  ruleR5_invalidCadastro,
  ruleR6_impostoSeletivo,
  ruleR7_naturezaCoerencia,
];

// Roda todas as regras sobre um item.
export function auditItem(item, ctx) {
  const findings = [];
  for (const rule of ALL_RULES) {
    try {
      findings.push(...rule(item, ctx));
    } catch (e) {
      findings.push({ rule: rule.name, severity: "ERRO", campo: "(motor)", msg: `Falha na regra: ${e.message}` });
    }
  }
  return findings;
}
