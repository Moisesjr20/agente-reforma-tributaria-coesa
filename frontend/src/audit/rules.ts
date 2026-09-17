// rules.ts — regras de auditoria da Matriz Fiscal (porta TypeScript)
//
// Espelha execution/auditoria-matriz-fiscal/lib.mjs (Camada 3). Funções PURAS,
// sem I/O — o teste de paridade (rules.test.ts) usa as mesmas fixtures da suíte
// Node para impedir divergência entre as duas cópias.
//
// Severidade: "ERRO" (bloqueia config no ERP) > "ALERTA" (revisar) > "INFO".

export type Severity = 'ERRO' | 'ALERTA' | 'INFO';

export interface Finding {
  rule: string;
  severity: Severity;
  campo: string;
  msg: string;
}

/** Linha da aba "MATRIZ REFORMA" — chaves são os cabeçalhos da planilha. */
export interface MatrixItem {
  __row?: number;
  [key: string]: string | number | undefined;
}

export interface ClassMeta {
  cst: string;
  nome: string;
  tipoAliquota: string;
  pRedIBS: string;
  pRedCBS: string;
  indNFe: string;
  indNFCe: string;
  dIniVig: string;
  dFimVig: string;
}

export interface AuditContext {
  classIndex: Map<string, ClassMeta>;
  cstSet?: Set<string>;
  tableVersion: string;
}

// ---------------------------------------------------------------------------
// Parsing / normalização
// ---------------------------------------------------------------------------

/** Parser CSV mínimo com suporte a campos entre aspas e vírgulas internas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r') { /* ignore */ }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Converte CSV (com cabeçalho) em array de objetos. */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((r) => r.length && r.some((c) => c !== ''));
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ''; });
    return o;
  });
}

/** Trata "—", "-", "n/a", vazio como "sem valor". */
export function isBlank(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '' || s === '—' || s === '-' || s === '–' || s === 'n/a' || s === 'na';
}

/** Extrai só os dígitos de um código. */
export function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

export function ncmDigits(v: unknown): string { return digits(v); }
export function ncmChapter(v: unknown): string { const d = ncmDigits(v); return d.length >= 2 ? d.slice(0, 2) : ''; }
export function ncmPosition(v: unknown): string { const d = ncmDigits(v); return d.length >= 4 ? d.slice(0, 4) : ''; }

// ---------------------------------------------------------------------------
// Índice das tabelas oficiais
// ---------------------------------------------------------------------------

export function buildClassIndex(cclassObjects: Record<string, string>[]): Map<string, ClassMeta> {
  const idx = new Map<string, ClassMeta>();
  for (const o of cclassObjects) {
    const code = digits(o['cClassTrib']);
    if (!code) continue;
    idx.set(code, {
      cst: digits(o['CST-IBS/CBS']),
      nome: o['Nome cClassTrib'] ?? '',
      tipoAliquota: o['Tipo de Alíquota'] ?? '',
      pRedIBS: o['pRedIBS'] ?? '',
      pRedCBS: o['pRedCBS'] ?? '',
      indNFe: o['indNFe'] ?? '',
      indNFCe: o['indNFCe'] ?? '',
      dIniVig: o['dIniVig'] ?? '',
      dFimVig: o['dFimVig'] ?? '',
    });
  }
  return idx;
}

export function buildCstSet(cstObjects: Record<string, string>[]): Set<string> {
  const s = new Set<string>();
  for (const o of cstObjects) {
    const c = digits(o['CST-IBS/CBS']);
    if (c) s.add(c);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Heurísticas de domínio (restaurante)
// ---------------------------------------------------------------------------

// Detecção de álcool por CATEGORIA (sinal confiável) + posição NCM alcoólica.
export const ALCO_CATEGORIES = new Set([
  'vinhos e espumantes',
  'carta de vinhos',
  'destilados',
  'cervejas',
]);

const ALCO_NCM_POS = new Set(['2203', '2204', '2205', '2206', '2207', '2208']);

export function isAlcoholic(item: MatrixItem): boolean {
  const cat = String(item['Categoria'] ?? '').trim().toLowerCase();
  if (ALCO_CATEGORIES.has(cat)) return true;
  if (ALCO_NCM_POS.has(ncmPosition(item['NCM (atual)']))) return true;
  return false;
}

const JUNK_RE = /\b(teste|n[ãa]o utilizar|nao utilizar|ltda|distribuidora|dist\b|distribui|fornecedor|importacao\d|eleg[âa]ncia)\b/i;

export function looksLikeJunk(item: MatrixItem): boolean {
  const desc = String(item['Descricao do Item'] ?? '');
  return JUNK_RE.test(desc);
}

export function hasSaida(item: MatrixItem): boolean {
  return !isBlank(item['cClassTrib (saída)']);
}

// ---------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------

export function ruleR1_codeExists(item: MatrixItem, ctx: AuditContext): Finding[] {
  const out: Finding[] = [];
  for (const campo of ['cClassTrib (saída)', 'cClassTrib ENTRADA (crédito)']) {
    const raw = item[campo];
    if (isBlank(raw)) continue;
    const code = digits(raw);
    if (!code) continue;
    if (!ctx.classIndex.has(code)) {
      out.push({ rule: 'R1', severity: 'ERRO', campo, msg: `cClassTrib '${code}' não consta na tabela oficial ${ctx.tableVersion}` });
    }
  }
  return out;
}

export function ruleR2_pairing(item: MatrixItem, ctx: AuditContext): Finding[] {
  if (!hasSaida(item)) return [];
  const code = digits(item['cClassTrib (saída)']);
  const cst = digits(item['CST IBS/CBS (saída)']);
  const meta = ctx.classIndex.get(code);
  if (!meta) return [];
  const out: Finding[] = [];
  if (cst && meta.cst && cst !== meta.cst) {
    out.push({ rule: 'R2', severity: 'ERRO', campo: 'CST IBS/CBS (saída)', msg: `CST '${cst}' não é o par oficial de cClassTrib '${code}' (esperado CST '${meta.cst}')` });
  }
  return out;
}

export function ruleR2b_docType(item: MatrixItem, ctx: AuditContext): Finding[] {
  if (!hasSaida(item)) return [];
  const code = digits(item['cClassTrib (saída)']);
  const meta = ctx.classIndex.get(code);
  if (!meta) return [];
  if (meta.indNFCe === '0' && meta.indNFe === '0') {
    return [{ rule: 'R2b', severity: 'ALERTA', campo: 'cClassTrib (saída)', msg: `cClassTrib '${code}' não é sinalizado como válido para NFC-e nem NF-e na tabela oficial` }];
  }
  return [];
}

export function ruleR3_ncmChapter(item: MatrixItem): Finding[] {
  const ncm = ncmDigits(item['NCM (atual)']);
  if (!ncm) return [];
  const chap = ncmChapter(ncm);
  const cat = String(item['Categoria'] ?? '');
  const out: Finding[] = [];
  if (/hortifruti|hortifrúti/i.test(cat)) {
    if (['17', '18', '19', '21'].includes(chap)) {
      out.push({ rule: 'R3', severity: 'ERRO', campo: 'NCM (atual)', msg: `Categoria HORTIFRUTI com NCM do cap. ${chap} (preparação/confeitaria) — incompatível com in natura (caps. 07/08)` });
    }
  }
  const catL = cat.trim().toLowerCase();
  if (isAlcoholic(item) && chap && chap !== '22') {
    const via = ALCO_CATEGORIES.has(catL) ? `categoria alcoólica '${cat.trim()}'` : 'sinal alcoólico';
    out.push({ rule: 'R3', severity: 'ERRO', campo: 'NCM (atual)', msg: `${via} mas NCM do cap. ${chap} (não é bebida do cap. 22) — revisar NCM ou categoria` });
  }
  return out;
}

export function ruleR4_alcoholInsumo(item: MatrixItem): Finding[] {
  if (!isAlcoholic(item)) return [];
  const grupo = String(item['GRUPO FISCAL CORRETO'] ?? '');
  if (/insumo/i.test(grupo)) {
    return [{ rule: 'R4', severity: 'ALERTA', campo: 'GRUPO FISCAL CORRETO', msg: `Bebida alcoólica classificada como '${grupo.trim()}' — reclassificar para REVENDA (saída integral, fora do regime de bar/restaurante, art. 273 §2º III)` }];
  }
  return [];
}

export function ruleR5_invalidCadastro(item: MatrixItem): Finding[] {
  const ncm = ncmDigits(item['NCM (atual)']);
  const out: Finding[] = [];
  if (!ncm || /^0+$/.test(ncm)) {
    out.push({ rule: 'R5', severity: 'ERRO', campo: 'NCM (atual)', msg: 'NCM ausente ou zerado (00000000) — cadastrar antes de configurar o IBS/CBS' });
  }
  if (looksLikeJunk(item)) {
    out.push({ rule: 'R5', severity: 'ALERTA', campo: 'Descricao do Item', msg: 'Descrição sugere cadastro de teste / nome de fornecedor — sanear ou excluir' });
  }
  return out;
}

export function ruleR6_impostoSeletivo(item: MatrixItem): Finding[] {
  if (!isAlcoholic(item)) return [];
  const code = digits(item['cClassTrib (saída)']);
  const consid = String(item['CONSIDERAÇÕES COESA'] ?? '') + String(item['FUNDAMENTO LC 214/25'] ?? '');
  if (code === '000001' && !/seletivo|\bIS\b/i.test(consid)) {
    return [{ rule: 'R6', severity: 'INFO', campo: 'cClassTrib (saída)', msg: 'Bebida alcoólica tratada como tributação integral (000001) sem menção ao Imposto Seletivo — confirmar incidência do IS (LC 214/2025)' }];
  }
  return [];
}

export function ruleR7_naturezaCoerencia(item: MatrixItem): Finding[] {
  if (!hasSaida(item)) return [];
  const nat = String(item['NATUREZA NA REFORMA'] ?? '').toLowerCase();
  const code = digits(item['cClassTrib (saída)']);
  const out: Finding[] = [];
  if (/bebida alco/i.test(nat) && code !== '000001') {
    out.push({ rule: 'R7', severity: 'ALERTA', campo: 'cClassTrib (saída)', msg: `Natureza 'bebida alcoólica' mas cClassTrib '${code}' (esperado 000001 — tributação integral)` });
  }
  if (/bares e restaurantes|regime de bares/i.test(nat) && code !== '200047') {
    out.push({ rule: 'R7', severity: 'ALERTA', campo: 'cClassTrib (saída)', msg: `Natureza 'regime de bares e restaurantes' mas cClassTrib '${code}' (esperado 200047 — redução 40%)` });
  }
  return out;
}

type Rule = (item: MatrixItem, ctx: AuditContext) => Finding[];

export const ALL_RULES: Rule[] = [
  ruleR1_codeExists,
  ruleR2_pairing,
  ruleR2b_docType,
  (item) => ruleR3_ncmChapter(item),
  (item) => ruleR4_alcoholInsumo(item),
  (item) => ruleR5_invalidCadastro(item),
  (item) => ruleR6_impostoSeletivo(item),
  (item) => ruleR7_naturezaCoerencia(item),
];

export function auditItem(item: MatrixItem, ctx: AuditContext): Finding[] {
  const findings: Finding[] = [];
  for (const rule of ALL_RULES) {
    try {
      findings.push(...rule(item, ctx));
    } catch (e) {
      findings.push({ rule: 'motor', severity: 'ERRO', campo: '(motor)', msg: `Falha na regra: ${(e as Error).message}` });
    }
  }
  return findings;
}
