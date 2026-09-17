// audit.mjs — Camada 3 (runner CLI da auditoria)
//
// Aplica as regras de lib.mjs à matriz extraída (dump-matrix.ps1) usando as
// tabelas oficiais cClassTrib/CST do repositório. Gera relatório .md + .csv.
//
// Uso:
//   node execution/auditoria-matriz-fiscal/audit.mjs \
//     --matrix .tmp/auditoria/matrix.json \
//     --cclass "base de conhecimento/cclasstrib/cclass-2026-06-01.csv" \
//     --cst    "base de conhecimento/cclasstrib/cst-2026-06-01.csv" \
//     --out    .tmp/auditoria
//
// A matriz é dado privado do cliente -> saída em .tmp/ (efêmero, gitignored).

import fs from "node:fs";
import path from "node:path";
import { csvToObjects, buildClassIndex, buildCstSet, auditItem } from "./lib.mjs";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const MATRIX = arg("matrix", ".tmp/auditoria/matrix.json");
const CCLASS = arg("cclass", "base de conhecimento/cclasstrib/cclass-2026-06-01.csv");
const CST = arg("cst", "base de conhecimento/cclasstrib/cst-2026-06-01.csv");
const OUTDIR = arg("out", ".tmp/auditoria");
const TABLE_VERSION = path.basename(CCLASS);

const matrix = JSON.parse(fs.readFileSync(MATRIX, "utf8"));
const cclassObjects = csvToObjects(fs.readFileSync(CCLASS, "utf8"));
const cstObjects = csvToObjects(fs.readFileSync(CST, "utf8"));

const ctx = {
  classIndex: buildClassIndex(cclassObjects),
  cstSet: buildCstSet(cstObjects),
  tableVersion: TABLE_VERSION,
};

const csvEsc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// ---- Executar auditoria ----
const rows = []; // findings achatados
const bySeverity = { ERRO: 0, ALERTA: 0, INFO: 0 };
const byRule = {};
let itemsComProblema = 0;

for (const item of matrix.items) {
  const findings = auditItem(item, ctx);
  if (findings.length) itemsComProblema++;
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
    rows.push({
      linha: item.__row,
      item: item["Descricao do Item"] ?? "",
      categoria: item["Categoria"] ?? "",
      ncm: item["NCM (atual)"] ?? "",
      regra: f.rule,
      severidade: f.severity,
      campo: f.campo,
      diagnostico: f.msg,
    });
  }
}

// Ordenar: ERRO > ALERTA > INFO, depois por linha.
const sev = { ERRO: 0, ALERTA: 1, INFO: 2 };
rows.sort((a, b) => sev[a.severidade] - sev[b.severidade] || a.linha - b.linha);

fs.mkdirSync(OUTDIR, { recursive: true });

// ---- CSV ----
const csvHeader = ["linha", "item", "categoria", "ncm", "regra", "severidade", "campo", "diagnostico"];
const csvOut = [csvHeader.map(csvEsc).join(",")]
  .concat(rows.map((r) => csvHeader.map((h) => csvEsc(r[h])).join(",")))
  .join("\n");
fs.writeFileSync(path.join(OUTDIR, "divergencias.csv"), csvOut, "utf8");

// ---- Markdown ----
const RULE_DESC = {
  R1: "cClassTrib inexistente na tabela oficial",
  R2: "Par CST × cClassTrib incoerente",
  R2b: "cClassTrib não válido para NFC-e/NF-e",
  R3: "NCM incompatível com a categoria",
  R4: "Bebida alcoólica cadastrada como insumo",
  R5: "Cadastro inválido (NCM zerado / teste)",
  R6: "Imposto Seletivo não sinalizado (álcool)",
  R7: "Natureza × cClassTrib incoerente",
};

const md = [];
md.push(`# Auditoria da Matriz Fiscal — ${matrix.source}`);
md.push("");
md.push(`> Gerado pela ferramenta \`execution/auditoria-matriz-fiscal\` · tabela oficial: \`${TABLE_VERSION}\``);
md.push("");
md.push("## Resumo");
md.push("");
md.push(`- **Itens analisados:** ${matrix.count}`);
md.push(`- **Itens com ao menos 1 apontamento:** ${itemsComProblema}`);
md.push(`- **Total de apontamentos:** ${rows.length}  (ERRO: ${bySeverity.ERRO} · ALERTA: ${bySeverity.ALERTA} · INFO: ${bySeverity.INFO})`);
md.push("");
md.push("### Por regra");
md.push("");
md.push("| Regra | Descrição | Ocorrências |");
md.push("|---|---|---|");
for (const r of ["R1", "R2", "R2b", "R3", "R4", "R5", "R6", "R7"]) {
  md.push(`| ${r} | ${RULE_DESC[r]} | ${byRule[r] ?? 0} |`);
}
md.push("");
md.push("## Apontamentos (ERRO e ALERTA)");
md.push("");
md.push("| Linha | Item | Regra | Sev. | Diagnóstico |");
md.push("|---|---|---|---|---|");
for (const r of rows.filter((r) => r.severidade !== "INFO").slice(0, 400)) {
  const item = String(r.item).replace(/\|/g, "\\|").slice(0, 40);
  const diag = String(r.diagnostico).replace(/\|/g, "\\|");
  md.push(`| ${r.linha} | ${item} | ${r.regra} | ${r.severidade} | ${diag} |`);
}
const errAlertCount = rows.filter((r) => r.severidade !== "INFO").length;
if (errAlertCount > 400) md.push(`\n_(+${errAlertCount - 400} apontamentos ERRO/ALERTA — ver \`divergencias.csv\`)_`);
md.push("");
md.push(`## Pontos de atenção jurídica (INFO): ${bySeverity.INFO}`);
md.push("");
md.push(`Ver \`divergencias.csv\` (filtro severidade = INFO). Concentram-se na regra R6 (Imposto Seletivo sobre bebidas alcoólicas).`);
md.push("");

fs.writeFileSync(path.join(OUTDIR, "relatorio-auditoria.md"), md.join("\n"), "utf8");

// ---- Console ----
console.log(`Itens analisados : ${matrix.count}`);
console.log(`Com apontamento  : ${itemsComProblema}`);
console.log(`Apontamentos     : ${rows.length} (ERRO ${bySeverity.ERRO} · ALERTA ${bySeverity.ALERTA} · INFO ${bySeverity.INFO})`);
console.log("Por regra        :", JSON.stringify(byRule));
console.log(`Relatório        : ${path.join(OUTDIR, "relatorio-auditoria.md")}`);
console.log(`CSV              : ${path.join(OUTDIR, "divergencias.csv")}`);
