---
name: interface-auditoria-matriz
description: "Spec da interface web (client-side) para receber uma Matriz Fiscal COESA (.xlsx) e apresentar a auditoria IBS/CBS (regras R1–R7) no navegador, sem enviar o dado do cliente a nenhum servidor."
version: 1.0.0
category: frontend-feature
framework: doe
updated: 2026-09-17
status: in-progress
---

# Spec — Interface de Auditoria de Matriz Fiscal

## Objetivo

Adicionar ao frontend React existente uma tela onde o usuário **arrasta uma
planilha** `COESA_Matriz_Fiscal_Reforma_<cliente>.xlsx` e vê, **em segundos e no
próprio navegador**, o relatório de auditoria produzido pelas regras R1–R7 já
validadas na Camada 3 (`execution/auditoria-matriz-fiscal`).

## Princípio inegociável — privacidade

A matriz é **dado fiscal privado do cliente**. Nesta interface ela **nunca é
enviada a um servidor**: o parsing (SheetJS) e a execução das regras acontecem
100% no browser. Nada de upload, backend ou secrets. Alinha-se ao POP
[[auditoria-matriz-fiscal]] ("dado do cliente nunca entra na base pública/git").

## Arquitetura

```
┌───────────────────────────── Navegador ─────────────────────────────┐
│  AuditView                                                           │
│   ├─ FileDrop            (arrasta .xlsx → ArrayBuffer)               │
│   ├─ parseXlsx.ts        (SheetJS → linhas da aba "MATRIZ REFORMA")  │
│   ├─ runAudit.ts ── rules.ts (R1–R7, porta pura de lib.mjs)         │
│   │        ▲                                                         │
│   │        └── tabelas oficiais (fetch /tabelas/cclass.csv, cst.csv) │
│   ├─ AuditSummary        (cards + tabela por regra)                 │
│   └─ FindingsTable       (filtro por severidade/regra, busca, CSV)  │
└──────────────────────────────────────────────────────────────────────┘
```

- **Sem router:** o `App.tsx` alterna entre duas visões via `useState`
  (`"assistente"` | `"auditoria"`), com abas no cabeçalho.
- **Tabelas oficiais** copiadas para `frontend/public/tabelas/` (versionadas no
  git; as originais em `base de conhecimento/cclasstrib/` são gitignored).
- **Regras:** `frontend/src/audit/rules.ts` é uma porta TypeScript de
  `execution/auditoria-matriz-fiscal/lib.mjs`. Um teste de paridade (Vitest) usa
  as mesmas fixtures da suíte Node para impedir divergência.

## Componentes (frontend/src/audit + components)

| Arquivo | Responsabilidade |
|---|---|
| `audit/rules.ts` | Regras R1–R7 e helpers puros (tipados) |
| `audit/rules.test.ts` | Paridade das regras (Vitest) |
| `audit/parseXlsx.ts` | SheetJS → `MatrixItem[]` (aba `MATRIZ REFORMA`, cabeçalho linha 4) |
| `audit/officialTables.ts` | fetch + parse das tabelas oficiais → índice |
| `audit/runAudit.ts` | orquestra parse + regras + agregação (espelha `audit.mjs`) |
| `components/FileDrop.tsx` | área de drag/drop + seletor de arquivo |
| `components/AuditSummary.tsx` | cards (itens, ERRO, ALERTA, INFO) + tabela por regra |
| `components/FindingsTable.tsx` | tabela filtrável + export CSV |
| `components/AuditView.tsx` | container de estado (idle/parsing/done/error) |

## Estados da tela

`idle` (dropzone) → `parsing` (spinner) → `done` (resumo + tabela) | `error`
(mensagem: aba ausente, arquivo inválido, planilha sem colunas esperadas).

## Regras (idênticas à Camada 3)

R1 código existe · R2 par CST×cClassTrib · R2b válido p/ NFC-e/NF-e · R3 NCM×
categoria · R4 álcool como insumo · R5 cadastro inválido · R6 Imposto Seletivo ·
R7 natureza×cClassTrib. Detecção de álcool por **categoria** + NCM 2203–2208.

## Assistente de correção (v1.1)

Após os resultados aparece o **CorrectionAssistant**: propõe correções e permite
**revisar/aprovar** antes de **exportar o `.xlsx` corrigido** (SheetJS reescreve as
células da aba `MATRIZ REFORMA`, preservando as demais abas). Modelo **híbrido**:

- **Determinístico (no navegador):** valores deriváveis das tabelas/regras — CST
  para o par oficial (R2), código por natureza (R7), grupo → REVENDA para álcool
  como insumo (R4), e NCM sugerido pela análise (R3).
- **Requer decisão:** NCM ausente/errado sem sugestão e código inexistente (R1) —
  o usuário preenche, ou usa **"Consultar IA"** (opt-in), que envia **apenas aquele
  item** ao agente `ask-reforma`. Há também um chat livre com a IA.

Arquivos: `audit/corrections.ts`, `audit/exportXlsx.ts`, `components/CorrectionAssistant.tsx`.

## Fora de escopo (v1)

- Persistência/histórico de auditorias (é stateless por sessão).
- Correção em lote sem revisão / aplicação silenciosa de casos ambíguos.
- Camada "matriz atual" (ICMS/PIS-COFINS) — auditoria cobre só a camada reforma.

## Critérios de aceite

1. Arrastar a planilha real do restaurante → resumo com 2.417 itens e a mesma
   contagem de apontamentos da CLI (R1=R2=0, R3=12, R4=4, R5=25, R6≈1.085).
2. Nenhuma requisição de rede com o conteúdo da planilha (verificável no DevTools).
3. `npm --prefix frontend run build` verde; testes de regras e componente passam.
