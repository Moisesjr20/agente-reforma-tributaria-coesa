# Auditoria de Matriz Fiscal (Reforma Tributária) — Camada 3

Ferramenta determinística que valida uma **Matriz Fiscal COESA** (planilha de
classificação IBS/CBS de um cliente) contra as **tabelas oficiais cClassTrib /
CST-IBS/CBS** e as regras do regime de bares e restaurantes (LC 214/2025).

Não usa IA nem rede: lê a planilha, aplica regras verificáveis e emite um
relatório de divergências para saneamento antes de configurar o ERP/emissor.

## Pré-requisitos

- **Node 18+** (usa `node:test` e ESM nativos — sem `npm install`).
- **PowerShell 7+** para o extrator da planilha.

## Uso

```powershell
# 1. Extrair a aba "MATRIZ REFORMA" do .xlsx -> JSON (dado do cliente -> .tmp/)
pwsh execution/auditoria-matriz-fiscal/dump-matrix.ps1 `
  -Xlsx "C:\caminho\COESA_Matriz_Fiscal_Reforma_<cliente>.xlsx" `
  -Out  ".tmp/auditoria/matrix.json"

# 2. Rodar a auditoria (usa as tabelas oficiais do repositório)
node execution/auditoria-matriz-fiscal/audit.mjs `
  --matrix .tmp/auditoria/matrix.json `
  --cclass "base de conhecimento/cclasstrib/cclass-2026-06-01.csv" `
  --cst    "base de conhecimento/cclasstrib/cst-2026-06-01.csv" `
  --out    .tmp/auditoria

# 3. Testes das regras
node --test execution/auditoria-matriz-fiscal/lib.test.mjs
```

Saídas em `.tmp/auditoria/` (efêmero, gitignored): `relatorio-auditoria.md` e
`divergencias.csv`.

## Regras

| Regra | Severidade | O que verifica |
|---|---|---|
| R1 | ERRO | `cClassTrib` (saída/entrada) existe na tabela oficial |
| R2 | ERRO | Par `CST × cClassTrib` de saída coerente com a tabela oficial |
| R2b | ALERTA | `cClassTrib` sinalizado como válido para NFC-e/NF-e |
| R3 | ERRO | Capítulo do NCM compatível com a categoria (hortifrúti → 07/08; álcool → 22) |
| R4 | ALERTA | Bebida alcoólica cadastrada como INSUMO (deveria ser revenda — art. 273 §2º III) |
| R5 | ERRO/ALERTA | NCM ausente/`00000000` ou cadastro de teste/fornecedor |
| R6 | INFO | Bebida alcoólica tratada como `000001` sem menção ao Imposto Seletivo |
| R7 | ALERTA | Natureza declarada × faixa de `cClassTrib` de saída |

`isAlcoholic` é baseada na **categoria** da planilha (`VINHOS E ESPUMANTES`,
`DESTILADOS`, `CERVEJAS`, `Carta de Vinhos`) + posição NCM 2203–2208, evitando
falsos-positivos de substring (`CHAMPIGNON`, `COPO ... WHISKY`, `CAFÉ EXPRESSO`).

## Arquivos

- `dump-matrix.ps1` — extrator `.xlsx` → JSON (sem dependências).
- `lib.mjs` — regras puras e helpers (testável).
- `lib.test.mjs` — testes (`node --test`).
- `audit.mjs` — runner CLI + geração de relatório.

Ver o POP completo em `directives/auditoria-matriz-fiscal.md`.
