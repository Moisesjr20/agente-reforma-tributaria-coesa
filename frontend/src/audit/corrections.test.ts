import { describe, it, expect } from 'vitest';
import { buildClassIndex, csvToObjects, type AuditContext } from './rules';
import { deriveItemCorrections, suggestedNcm } from './corrections';

const CCLASS_CSV =
  `"CST-IBS/CBS","Nome cClassTrib","cClassTrib","Tipo de Alíquota","pRedIBS","pRedCBS","indNFe","indNFCe","dIniVig","dFimVig"\n` +
  `"000","Tributação integral","000001","Padrão","0","0","1","1","2026-01-01",""\n` +
  `"200","Bares e Restaurantes","200047","Reduzida","40","40","1","1","2026-01-01",""\n`;

const ctx: AuditContext = { classIndex: buildClassIndex(csvToObjects(CCLASS_CSV)), tableVersion: 'test' };

describe('suggestedNcm', () => {
  it('extrai o NCM sugerido do texto', () => {
    expect(suggestedNcm({ 'NCM SUGERIDO / OBSERVAÇÃO': 'incompatível. Sugerido: 0709.93.00 (abóbora).' })).toBe('0709.93.00');
  });
  it('vazio quando não há sugestão', () => {
    expect(suggestedNcm({ 'NCM SUGERIDO / OBSERVAÇÃO': 'deveria estar no cap. 22.' })).toBe('');
  });
});

describe('deriveItemCorrections', () => {
  it('R2 propõe o CST par oficial (determinístico)', () => {
    const c = deriveItemCorrections({ __row: 5, 'cClassTrib (saída)': '200047', 'CST IBS/CBS (saída)': '000' }, ctx);
    const r2 = c.find((x) => x.regra === 'R2')!;
    expect(r2.para).toBe('200');
    expect(r2.campo).toBe('CST IBS/CBS (saída)');
    expect(r2.kind).toBe('deterministico');
  });

  it('R7 corrige código para 000001 em bebida alcoólica', () => {
    const c = deriveItemCorrections({ __row: 6, 'NATUREZA NA REFORMA': 'Saída – Bebida alcoólica', 'cClassTrib (saída)': '200047' }, ctx);
    const r7 = c.find((x) => x.regra === 'R7')!;
    expect(r7.para).toBe('000001');
  });

  it('R4 propõe REVENDA para álcool como insumo', () => {
    const c = deriveItemCorrections({ __row: 7, 'Categoria': 'DESTILADOS', 'GRUPO FISCAL CORRETO': 'INSUMO ALIMENTAR' }, ctx);
    const r4 = c.find((x) => x.regra === 'R4')!;
    expect(r4.para).toBe('REVENDA');
    expect(r4.campo).toBe('GRUPO FISCAL CORRETO');
  });

  it('R3 aplica NCM sugerido (determinístico)', () => {
    const c = deriveItemCorrections({ __row: 8, 'Categoria': 'HORTIFRUTI', 'NCM (atual)': '1704.90.10', 'NCM SUGERIDO / OBSERVAÇÃO': 'Sugerido: 0709.93.00' }, ctx);
    const r3 = c.find((x) => x.campo === 'NCM (atual)')!;
    expect(r3.para).toBe('0709.93.00');
    expect(r3.kind).toBe('deterministico');
  });

  it('NCM ausente sem sugestão → requer decisão (para vazio)', () => {
    const c = deriveItemCorrections({ __row: 9, 'Descricao do Item': 'ELEGANCIA', 'NCM (atual)': '00000000' }, ctx);
    const dec = c.find((x) => x.campo === 'NCM (atual)')!;
    expect(dec.kind).toBe('requer-decisao');
    expect(dec.para).toBe('');
  });

  it('item correto não gera correções', () => {
    const c = deriveItemCorrections({ __row: 10, 'Categoria': 'HORTIFRUTI', 'NCM (atual)': '0709.93.00', 'NATUREZA NA REFORMA': 'Insumo', 'cClassTrib (saída)': '—' }, ctx);
    expect(c).toHaveLength(0);
  });
});
