// lib.test.mjs — testes das regras de auditoria (node --test, sem dependências)
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv, csvToObjects, isBlank, digits, ncmChapter, ncmPosition,
  buildClassIndex, isAlcoholic, looksLikeJunk, hasSaida,
  ruleR1_codeExists, ruleR2_pairing, ruleR3_ncmChapter, ruleR4_alcoholInsumo,
  ruleR5_invalidCadastro, ruleR6_impostoSeletivo, ruleR7_naturezaCoerencia,
  auditItem,
} from "./lib.mjs";

// Contexto oficial mínimo para os testes (subset das tabelas reais).
const CCLASS_CSV =
  `"CST-IBS/CBS","Nome cClassTrib","cClassTrib","Tipo de Alíquota","pRedIBS","pRedCBS","indNFe","indNFCe","dIniVig","dFimVig"\n` +
  `"000","Tributação integral","000001","Padrão","0","0","1","1","2026-01-01",""\n` +
  `"200","Bares e Restaurantes","200047","Reduzida","40","40","1","1","2026-01-01",""\n` +
  `"200","Hortícolas/frutas/ovos","200014","Zero","100","100","1","1","2026-01-01",""\n` +
  `"410","Exclusão gorjeta","410019","Padrão","0","0","1","1","2026-01-01",""\n`;

const ctx = {
  classIndex: buildClassIndex(csvToObjects(CCLASS_CSV)),
  tableVersion: "test",
};

// ---- parsing ----
test("parseCsv respeita aspas e vírgulas internas", () => {
  const rows = parseCsv(`a,"b,c",d\n1,2,3\n`);
  assert.deepEqual(rows[0], ["a", "b,c", "d"]);
  assert.deepEqual(rows[1], ["1", "2", "3"]);
});

test("csvToObjects mapeia cabeçalho", () => {
  const o = csvToObjects(`x,y\n1,2\n`);
  assert.equal(o[0].x, "1");
  assert.equal(o[0].y, "2");
});

test("isBlank trata travessão e n/a", () => {
  assert.ok(isBlank("—"));
  assert.ok(isBlank("-"));
  assert.ok(isBlank(""));
  assert.ok(isBlank("n/a"));
  assert.ok(!isBlank("000001"));
});

test("digits / ncmChapter / ncmPosition", () => {
  assert.equal(digits("200047"), "200047");
  assert.equal(ncmChapter("0709.93.00"), "07");
  assert.equal(ncmPosition("2204.10.00"), "2204");
});

// ---- índice oficial ----
test("buildClassIndex mapeia código -> CST oficial", () => {
  assert.equal(ctx.classIndex.get("200047").cst, "200");
  assert.equal(ctx.classIndex.get("000001").cst, "000");
});

// ---- heurísticas ----
test("isAlcoholic por categoria e NCM (sem falso-positivo de substring)", () => {
  assert.ok(isAlcoholic({ "Categoria": "VINHOS E ESPUMANTES", "Descricao do Item": "X" }));
  assert.ok(isAlcoholic({ "Categoria": "DESTILADOS", "Descricao do Item": "X" }));
  assert.ok(isAlcoholic({ "Categoria": "CERVEJAS", "Descricao do Item": "X" }));
  assert.ok(isAlcoholic({ "Categoria": "", "Descricao do Item": "X", "NCM (atual)": "2204.10.00" }));
  assert.ok(!isAlcoholic({ "Categoria": "HORTIFRUTI", "Descricao do Item": "Abacaxi" }));
  // regressão: utensílio e não-alcoólicos não podem ser tratados como álcool
  assert.ok(!isAlcoholic({ "Categoria": "SECOS", "Descricao do Item": "COPO NADIR WHISKY", "NCM (atual)": "7013.37.00" }));
  assert.ok(!isAlcoholic({ "Categoria": "BEBIDAS QUENTES", "Descricao do Item": "CAFÉ EXPRESSO", "NCM (atual)": "2101.11.10" }));
  assert.ok(!isAlcoholic({ "Categoria": "HORTIFRUTI", "Descricao do Item": "CHAMPIGNON", "NCM (atual)": "2003.10.00" }));
});

test("looksLikeJunk detecta cadastro de teste/fornecedor", () => {
  assert.ok(looksLikeJunk({ "Descricao do Item": "PRODUTO DE TESTE IMPORTACAO3" }));
  assert.ok(looksLikeJunk({ "Descricao do Item": "FORTALI DIST DE ALIMENTOS LTDA" }));
  assert.ok(!looksLikeJunk({ "Descricao do Item": "Abacaxi Confit" }));
});

test("hasSaida", () => {
  assert.ok(hasSaida({ "cClassTrib (saída)": "200047" }));
  assert.ok(!hasSaida({ "cClassTrib (saída)": "—" }));
});

// ---- R1: código inexistente ----
test("R1 detecta cClassTrib fora da tabela oficial", () => {
  const f = ruleR1_codeExists({ "cClassTrib (saída)": "999999", "cClassTrib ENTRADA (crédito)": "—" }, ctx);
  assert.equal(f.length, 1);
  assert.equal(f[0].rule, "R1");
});
test("R1 aceita código válido", () => {
  const f = ruleR1_codeExists({ "cClassTrib (saída)": "200047", "cClassTrib ENTRADA (crédito)": "200014" }, ctx);
  assert.equal(f.length, 0);
});

// ---- R2: par CST × cClassTrib ----
test("R2 detecta CST incoerente com o código", () => {
  const f = ruleR2_pairing({ "cClassTrib (saída)": "200047", "CST IBS/CBS (saída)": "000" }, ctx);
  assert.equal(f.length, 1);
  assert.match(f[0].msg, /esperado CST '200'/);
});
test("R2 aceita par correto", () => {
  const f = ruleR2_pairing({ "cClassTrib (saída)": "200047", "CST IBS/CBS (saída)": "200" }, ctx);
  assert.equal(f.length, 0);
});

// ---- R3: NCM x categoria ----
test("R3 flagra hortifrúti com NCM de confeitaria", () => {
  const f = ruleR3_ncmChapter({ "Categoria": "HORTIFRUTI", "NCM (atual)": "1704.90.10" });
  assert.equal(f.length, 1);
  assert.equal(f[0].rule, "R3");
});
test("R3 flagra alcoólico fora do cap. 22", () => {
  const f = ruleR3_ncmChapter({ "Categoria": "VINHOS E ESPUMANTES", "NCM (atual)": "0709.93.00" });
  assert.equal(f.length, 1);
});
test("R3 aceita hortifrúti no cap. 07", () => {
  const f = ruleR3_ncmChapter({ "Categoria": "HORTIFRUTI", "NCM (atual)": "0709.93.00" });
  assert.equal(f.length, 0);
});

// ---- R4: álcool como insumo ----
test("R4 flagra bebida alcoólica como insumo", () => {
  const f = ruleR4_alcoholInsumo({ "Categoria": "VINHOS E ESPUMANTES", "Descricao do Item": "X", "GRUPO FISCAL CORRETO": "INSUMO ALIMENTAR" });
  assert.equal(f.length, 1);
});
test("R4 não flagra bebida alcoólica como revenda", () => {
  const f = ruleR4_alcoholInsumo({ "Categoria": "VINHOS E ESPUMANTES", "Descricao do Item": "X", "GRUPO FISCAL CORRETO": "REVENDA" });
  assert.equal(f.length, 0);
});

// ---- R5: cadastro inválido ----
test("R5 flagra NCM zerado e junk", () => {
  const f = ruleR5_invalidCadastro({ "NCM (atual)": "00000000", "Descricao do Item": "NAO UTILIZAR" });
  assert.equal(f.length, 2);
});
test("R5 aceita item válido", () => {
  const f = ruleR5_invalidCadastro({ "NCM (atual)": "0709.93.00", "Descricao do Item": "Abobrinha" });
  assert.equal(f.length, 0);
});

// ---- R6: Imposto Seletivo ----
test("R6 sinaliza IS para álcool tratado como 000001 sem menção", () => {
  const f = ruleR6_impostoSeletivo({ "Categoria": "VINHOS E ESPUMANTES", "Descricao do Item": "Merlot", "cClassTrib (saída)": "000001", "CONSIDERAÇÕES COESA": "Bebida alcoólica integral." });
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, "INFO");
});
test("R6 silencia quando IS já mencionado", () => {
  const f = ruleR6_impostoSeletivo({ "Categoria": "VINHOS E ESPUMANTES", "Descricao do Item": "Merlot", "cClassTrib (saída)": "000001", "CONSIDERAÇÕES COESA": "Sujeito ao Imposto Seletivo." });
  assert.equal(f.length, 0);
});

// ---- R7: coerência natureza ----
test("R7 flagra natureza alcoólica com código diferente de 000001", () => {
  const f = ruleR7_naturezaCoerencia({ "NATUREZA NA REFORMA": "Saída – Bebida alcoólica (regime regular)", "cClassTrib (saída)": "200047" });
  assert.equal(f.length, 1);
});

// ---- integração ----
test("auditItem agrega múltiplos findings (linha ABEL PINCHARD da planilha real)", () => {
  const item = {
    "Descricao do Item": "ABEL PINCHARD CHAT. DU PAPE",
    "Categoria": "VINHOS E ESPUMANTES",
    "NCM (atual)": "0709.93.00",
    "GRUPO FISCAL CORRETO": "INSUMO ALIMENTAR",
    "NATUREZA NA REFORMA": "Saída – Bebida alcoólica (regime regular)",
    "CST IBS/CBS (saída)": "000",
    "cClassTrib (saída)": "000001",
    "cClassTrib ENTRADA (crédito)": "000001",
    "CONSIDERAÇÕES COESA": "Bebida alcoólica integral.",
  };
  const rules = new Set(auditItem(item, ctx).map((f) => f.rule));
  // Deve capturar: R3 (NCM cap.07), R4 (álcool como insumo), R6 (IS).
  assert.ok(rules.has("R3"));
  assert.ok(rules.has("R4"));
  assert.ok(rules.has("R6"));
});
