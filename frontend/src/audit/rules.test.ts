// rules.test.ts — paridade da porta TS com a suíte Node (lib.test.mjs)
import { describe, it, expect } from 'vitest';
import {
  parseCsv, csvToObjects, isBlank, digits, ncmChapter, ncmPosition,
  buildClassIndex, isAlcoholic, looksLikeJunk, hasSaida,
  ruleR1_codeExists, ruleR2_pairing, ruleR3_ncmChapter, ruleR4_alcoholInsumo,
  ruleR5_invalidCadastro, ruleR6_impostoSeletivo, ruleR7_naturezaCoerencia,
  auditItem, type AuditContext,
} from './rules';

const CCLASS_CSV =
  `"CST-IBS/CBS","Nome cClassTrib","cClassTrib","Tipo de Alíquota","pRedIBS","pRedCBS","indNFe","indNFCe","dIniVig","dFimVig"\n` +
  `"000","Tributação integral","000001","Padrão","0","0","1","1","2026-01-01",""\n` +
  `"200","Bares e Restaurantes","200047","Reduzida","40","40","1","1","2026-01-01",""\n` +
  `"200","Hortícolas/frutas/ovos","200014","Zero","100","100","1","1","2026-01-01",""\n` +
  `"410","Exclusão gorjeta","410019","Padrão","0","0","1","1","2026-01-01",""\n`;

const ctx: AuditContext = {
  classIndex: buildClassIndex(csvToObjects(CCLASS_CSV)),
  tableVersion: 'test',
};

describe('parsing', () => {
  it('parseCsv respeita aspas e vírgulas internas', () => {
    const rows = parseCsv(`a,"b,c",d\n1,2,3\n`);
    expect(rows[0]).toEqual(['a', 'b,c', 'd']);
    expect(rows[1]).toEqual(['1', '2', '3']);
  });
  it('csvToObjects mapeia cabeçalho', () => {
    const o = csvToObjects(`x,y\n1,2\n`);
    expect(o[0].x).toBe('1');
    expect(o[0].y).toBe('2');
  });
  it('isBlank trata travessão e n/a', () => {
    expect(isBlank('—')).toBe(true);
    expect(isBlank('-')).toBe(true);
    expect(isBlank('')).toBe(true);
    expect(isBlank('n/a')).toBe(true);
    expect(isBlank('000001')).toBe(false);
  });
  it('digits / ncmChapter / ncmPosition', () => {
    expect(digits('200047')).toBe('200047');
    expect(ncmChapter('0709.93.00')).toBe('07');
    expect(ncmPosition('2204.10.00')).toBe('2204');
  });
});

describe('índice oficial', () => {
  it('mapeia código -> CST oficial', () => {
    expect(ctx.classIndex.get('200047')!.cst).toBe('200');
    expect(ctx.classIndex.get('000001')!.cst).toBe('000');
  });
});

describe('heurísticas', () => {
  it('isAlcoholic por categoria e NCM (sem falso-positivo)', () => {
    expect(isAlcoholic({ 'Categoria': 'VINHOS E ESPUMANTES', 'Descricao do Item': 'X' })).toBe(true);
    expect(isAlcoholic({ 'Categoria': 'DESTILADOS', 'Descricao do Item': 'X' })).toBe(true);
    expect(isAlcoholic({ 'Categoria': '', 'Descricao do Item': 'X', 'NCM (atual)': '2204.10.00' })).toBe(true);
    expect(isAlcoholic({ 'Categoria': 'HORTIFRUTI', 'Descricao do Item': 'Abacaxi' })).toBe(false);
    expect(isAlcoholic({ 'Categoria': 'SECOS', 'Descricao do Item': 'COPO NADIR WHISKY', 'NCM (atual)': '7013.37.00' })).toBe(false);
    expect(isAlcoholic({ 'Categoria': 'BEBIDAS QUENTES', 'Descricao do Item': 'CAFÉ EXPRESSO', 'NCM (atual)': '2101.11.10' })).toBe(false);
  });
  it('looksLikeJunk', () => {
    expect(looksLikeJunk({ 'Descricao do Item': 'PRODUTO DE TESTE IMPORTACAO3' })).toBe(true);
    expect(looksLikeJunk({ 'Descricao do Item': 'FORTALI DIST DE ALIMENTOS LTDA' })).toBe(true);
    expect(looksLikeJunk({ 'Descricao do Item': 'Abacaxi Confit' })).toBe(false);
  });
  it('hasSaida', () => {
    expect(hasSaida({ 'cClassTrib (saída)': '200047' })).toBe(true);
    expect(hasSaida({ 'cClassTrib (saída)': '—' })).toBe(false);
  });
});

describe('regras', () => {
  it('R1 detecta código fora da tabela', () => {
    expect(ruleR1_codeExists({ 'cClassTrib (saída)': '999999', 'cClassTrib ENTRADA (crédito)': '—' }, ctx)).toHaveLength(1);
  });
  it('R1 aceita códigos válidos', () => {
    expect(ruleR1_codeExists({ 'cClassTrib (saída)': '200047', 'cClassTrib ENTRADA (crédito)': '200014' }, ctx)).toHaveLength(0);
  });
  it('R2 detecta CST incoerente', () => {
    const f = ruleR2_pairing({ 'cClassTrib (saída)': '200047', 'CST IBS/CBS (saída)': '000' }, ctx);
    expect(f).toHaveLength(1);
    expect(f[0].msg).toMatch(/esperado CST '200'/);
  });
  it('R2 aceita par correto', () => {
    expect(ruleR2_pairing({ 'cClassTrib (saída)': '200047', 'CST IBS/CBS (saída)': '200' }, ctx)).toHaveLength(0);
  });
  it('R3 hortifrúti com NCM de confeitaria', () => {
    expect(ruleR3_ncmChapter({ 'Categoria': 'HORTIFRUTI', 'NCM (atual)': '1704.90.10' })).toHaveLength(1);
  });
  it('R3 alcoólico fora do cap. 22', () => {
    expect(ruleR3_ncmChapter({ 'Categoria': 'VINHOS E ESPUMANTES', 'NCM (atual)': '0709.93.00' })).toHaveLength(1);
  });
  it('R3 aceita hortifrúti no cap. 07', () => {
    expect(ruleR3_ncmChapter({ 'Categoria': 'HORTIFRUTI', 'NCM (atual)': '0709.93.00' })).toHaveLength(0);
  });
  it('R4 álcool como insumo', () => {
    expect(ruleR4_alcoholInsumo({ 'Categoria': 'DESTILADOS', 'GRUPO FISCAL CORRETO': 'INSUMO ALIMENTAR' })).toHaveLength(1);
  });
  it('R5 NCM zerado e junk', () => {
    expect(ruleR5_invalidCadastro({ 'NCM (atual)': '00000000', 'Descricao do Item': 'NAO UTILIZAR' })).toHaveLength(2);
  });
  it('R6 sinaliza IS', () => {
    const f = ruleR6_impostoSeletivo({ 'Categoria': 'VINHOS E ESPUMANTES', 'cClassTrib (saída)': '000001', 'CONSIDERAÇÕES COESA': 'integral.' });
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe('INFO');
  });
  it('R7 natureza alcoólica incoerente', () => {
    expect(ruleR7_naturezaCoerencia({ 'NATUREZA NA REFORMA': 'Saída – Bebida alcoólica', 'cClassTrib (saída)': '200047' })).toHaveLength(1);
  });
  it('auditItem agrega (linha ABEL PINCHARD real)', () => {
    const item = {
      'Descricao do Item': 'ABEL PINCHARD CHAT. DU PAPE',
      'Categoria': 'VINHOS E ESPUMANTES',
      'NCM (atual)': '0709.93.00',
      'GRUPO FISCAL CORRETO': 'INSUMO ALIMENTAR',
      'NATUREZA NA REFORMA': 'Saída – Bebida alcoólica (regime regular)',
      'CST IBS/CBS (saída)': '000',
      'cClassTrib (saída)': '000001',
      'cClassTrib ENTRADA (crédito)': '000001',
      'CONSIDERAÇÕES COESA': 'Bebida alcoólica integral.',
    };
    const rules = new Set(auditItem(item, ctx).map((f) => f.rule));
    expect(rules.has('R3')).toBe(true);
    expect(rules.has('R4')).toBe(true);
    expect(rules.has('R6')).toBe(true);
  });
});
