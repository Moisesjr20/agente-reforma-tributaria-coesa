// corrections.ts — deriva CORREÇÕES a partir das regras/tabelas oficiais.
//
// Duas classes:
//  - 'deterministico': o valor correto sai das tabelas/regras (CST par, natureza
//    → código, NCM sugerido pela análise). Aplicável 100% no navegador.
//  - 'requer-decisao': precisa de julgamento (NCM ausente/errado sem sugestão,
//    código inexistente). O usuário preenche o valor ou consulta a IA (opt-in).
import {
  digits, ncmChapter, ncmDigits, isAlcoholic, hasSaida,
  type MatrixItem, type AuditContext,
} from './rules';

export type CorrectionKind = 'deterministico' | 'requer-decisao';

export interface Correction {
  id: string;          // `${linha}|${campo}`
  linha: number;
  itemDesc: string;
  campo: string;       // cabeçalho da coluna a corrigir
  de: string;          // valor atual
  para: string;        // valor proposto ('' quando requer decisão)
  regra: string;
  motivo: string;      // justificativa / base legal
  kind: CorrectionKind;
}

// Extrai um NCM sugerido do texto da coluna "NCM SUGERIDO / OBSERVAÇÃO".
export function suggestedNcm(item: MatrixItem): string {
  const txt = String(item['NCM SUGERIDO / OBSERVAÇÃO'] ?? '');
  const m = txt.match(/sugerido:?\s*(\d{4}\.?\d{2}\.?\d{2})/i);
  return m ? m[1] : '';
}

function push(out: Correction[], seen: Set<string>, c: Correction) {
  // Dedup por (linha, campo): mantém a 1ª (regras vêm em ordem de prioridade),
  // mas uma correção determinística com valor supera uma 'requer-decisao' vazia.
  const existing = out.find((x) => x.id === c.id);
  if (!existing) { out.push(c); seen.add(c.id); return; }
  if (existing.kind === 'requer-decisao' && !existing.para && c.para) {
    Object.assign(existing, c);
  }
}

export function deriveItemCorrections(item: MatrixItem, ctx: AuditContext): Correction[] {
  const out: Correction[] = [];
  const seen = new Set<string>();
  const linha = item.__row ?? 0;
  const itemDesc = String(item['Descricao do Item'] ?? '');
  const mk = (campo: string, de: string, para: string, regra: string, motivo: string, kind: CorrectionKind): Correction =>
    ({ id: `${linha}|${campo}`, linha, itemDesc, campo, de, para, regra, motivo, kind });

  // R2 — CST de saída fora do par oficial.
  if (hasSaida(item)) {
    const code = digits(item['cClassTrib (saída)']);
    const cst = digits(item['CST IBS/CBS (saída)']);
    const meta = ctx.classIndex.get(code);
    if (meta && cst && meta.cst && cst !== meta.cst) {
      push(out, seen, mk('CST IBS/CBS (saída)', String(item['CST IBS/CBS (saída)'] ?? ''), meta.cst, 'R2',
        `Par oficial do cClassTrib ${code} é CST ${meta.cst} (tabela ${ctx.tableVersion}).`, 'deterministico'));
    }
  }

  // R7 — natureza declarada × código de saída esperado.
  if (hasSaida(item)) {
    const nat = String(item['NATUREZA NA REFORMA'] ?? '').toLowerCase();
    const code = digits(item['cClassTrib (saída)']);
    if (/bebida alco/i.test(nat) && code !== '000001') {
      push(out, seen, mk('cClassTrib (saída)', String(item['cClassTrib (saída)'] ?? ''), '000001', 'R7',
        'Bebida alcoólica: tributação integral, cClassTrib 000001 (fora do regime, art. 273 §2º III).', 'deterministico'));
    } else if (/bares e restaurantes|regime de bares/i.test(nat) && code !== '200047') {
      push(out, seen, mk('cClassTrib (saída)', String(item['cClassTrib (saída)'] ?? ''), '200047', 'R7',
        'Fornecimento no regime de bar/restaurante: cClassTrib 200047, redução de 40% (art. 275).', 'deterministico'));
    }
  }

  // R4 — bebida alcoólica cadastrada como insumo → revenda.
  if (isAlcoholic(item) && /insumo/i.test(String(item['GRUPO FISCAL CORRETO'] ?? ''))) {
    push(out, seen, mk('GRUPO FISCAL CORRETO', String(item['GRUPO FISCAL CORRETO'] ?? ''), 'REVENDA', 'R4',
      'Bebida alcoólica não entra no regime de bar/restaurante (art. 273 §2º III) — reclassificar como revenda (saída integral).', 'deterministico'));
  }

  // R3/R5 — NCM: aplica o sugerido quando a análise o indicou; senão, decisão.
  const ncm = ncmDigits(item['NCM (atual)']);
  const chap = ncmChapter(ncm);
  const sug = suggestedNcm(item);
  const cat = String(item['Categoria'] ?? '');
  const ncmProblem =
    (!ncm || /^0+$/.test(ncm)) ||
    (isAlcoholic(item) && chap && chap !== '22') ||
    (/hortifruti|hortifrúti/i.test(cat) && ['17', '18', '19', '21'].includes(chap));
  if (ncmProblem) {
    if (sug) {
      push(out, seen, mk('NCM (atual)', String(item['NCM (atual)'] ?? ''), sug, 'R3',
        `NCM sugerido pela análise: ${sug}.`, 'deterministico'));
    } else {
      push(out, seen, mk('NCM (atual)', String(item['NCM (atual)'] ?? ''), '', 'R3/R5',
        'NCM ausente ou incompatível com a categoria e sem sugestão automática — definir o NCM correto.', 'requer-decisao'));
    }
  }

  // R1 — cClassTrib de saída inexistente na tabela oficial.
  if (hasSaida(item)) {
    const code = digits(item['cClassTrib (saída)']);
    if (code && !ctx.classIndex.has(code)) {
      push(out, seen, mk('cClassTrib (saída)', String(item['cClassTrib (saída)'] ?? ''), '', 'R1',
        `cClassTrib ${code} não existe na tabela oficial — definir um código válido.`, 'requer-decisao'));
    }
  }

  return out;
}

export function deriveCorrections(items: MatrixItem[], ctx: AuditContext): Correction[] {
  const all: Correction[] = [];
  for (const item of items) all.push(...deriveItemCorrections(item, ctx));
  // determinísticas primeiro, depois por linha.
  const rank = (k: CorrectionKind) => (k === 'deterministico' ? 0 : 1);
  all.sort((a, b) => rank(a.kind) - rank(b.kind) || a.linha - b.linha);
  return all;
}
