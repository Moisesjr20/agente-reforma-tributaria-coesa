// runAudit.ts — orquestra parse + regras + agregação (espelha audit.mjs).
import { auditItem, type AuditContext, type MatrixItem, type Severity } from './rules';

export interface FindingRow {
  linha: number;
  item: string;
  categoria: string;
  ncm: string;
  regra: string;
  severidade: Severity;
  campo: string;
  diagnostico: string;
}

export interface AuditResult {
  count: number;
  itemsComProblema: number;
  bySeverity: Record<Severity, number>;
  byRule: Record<string, number>;
  rows: FindingRow[];
  tableVersion: string;
}

export const RULE_DESC: Record<string, string> = {
  R1: 'cClassTrib inexistente na tabela oficial',
  R2: 'Par CST × cClassTrib incoerente',
  R2b: 'cClassTrib não válido para NFC-e/NF-e',
  R3: 'NCM incompatível com a categoria',
  R4: 'Bebida alcoólica cadastrada como insumo',
  R5: 'Cadastro inválido (NCM zerado / teste)',
  R6: 'Imposto Seletivo não sinalizado (álcool)',
  R7: 'Natureza × cClassTrib incoerente',
};

export const RULE_ORDER = ['R1', 'R2', 'R2b', 'R3', 'R4', 'R5', 'R6', 'R7'];

const SEV_ORDER: Record<Severity, number> = { ERRO: 0, ALERTA: 1, INFO: 2 };

export function runAudit(items: MatrixItem[], ctx: AuditContext): AuditResult {
  const rows: FindingRow[] = [];
  const bySeverity: Record<Severity, number> = { ERRO: 0, ALERTA: 0, INFO: 0 };
  const byRule: Record<string, number> = {};
  let itemsComProblema = 0;

  for (const item of items) {
    const findings = auditItem(item, ctx);
    if (findings.length) itemsComProblema++;
    for (const f of findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
      rows.push({
        linha: item.__row ?? 0,
        item: String(item['Descricao do Item'] ?? ''),
        categoria: String(item['Categoria'] ?? ''),
        ncm: String(item['NCM (atual)'] ?? ''),
        regra: f.rule,
        severidade: f.severity,
        campo: f.campo,
        diagnostico: f.msg,
      });
    }
  }

  rows.sort((a, b) => SEV_ORDER[a.severidade] - SEV_ORDER[b.severidade] || a.linha - b.linha);

  return {
    count: items.length,
    itemsComProblema,
    bySeverity,
    byRule,
    rows,
    tableVersion: ctx.tableVersion,
  };
}

const csvEsc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function findingsToCsv(rows: FindingRow[]): string {
  const header = ['linha', 'item', 'categoria', 'ncm', 'regra', 'severidade', 'campo', 'diagnostico'] as const;
  return [header.map(csvEsc).join(',')]
    .concat(rows.map((r) => header.map((h) => csvEsc(r[h])).join(',')))
    .join('\n');
}
