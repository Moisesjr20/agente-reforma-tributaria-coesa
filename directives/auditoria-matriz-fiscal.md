---
name: auditoria-matriz-fiscal
description: "POP para auditar uma Matriz Fiscal COESA (classificação IBS/CBS de um cliente) contra as tabelas oficiais cClassTrib/CST e o regime de bares e restaurantes da LC 214/2025. Ferramenta determinística em execution/auditoria-matriz-fiscal."
version: 1.0.0
category: fiscal-audit
framework: doe
updated: 2026-09-17
status: done
---

# POP — Auditoria de Matriz Fiscal (Reforma Tributária)

> **Operação DOE** — a inteligência mapeia; a **ferramenta determinística** valida.
> Nenhuma classificação fiscal é "adivinhada": tudo é conferido contra as tabelas
> oficiais e a legislação ingerida no RAG.

## Objetivo

Dada uma planilha `COESA_Matriz_Fiscal_Reforma_<cliente>.xlsx` (aba `MATRIZ
REFORMA`, com colunas de `cClassTrib (saída)`, `CST IBS/CBS (saída)`, `NCM
(atual)`, `Categoria`, etc.), produzir um **relatório de divergências** que
aponte, item a item, o que precisa ser saneado antes de configurar o IBS/CBS no
ERP/emissor de NF.

## Inputs

| Input | Origem |
|---|---|
| Planilha `.xlsx` do cliente | Fornecida pelo cliente (dado **privado** — nunca vai para a base pública nem para o git) |
| `cclass-YYYY-MM-DD.csv` | `base de conhecimento/cclasstrib/` (tabela oficial cClassTrib) |
| `cst-YYYY-MM-DD.csv` | `base de conhecimento/cclasstrib/` (tabela oficial CST-IBS/CBS) |

## Outputs

- `.tmp/auditoria/matrix.json` — extração determinística da aba (efêmero).
- `.tmp/auditoria/relatorio-auditoria.md` — resumo executivo + apontamentos ERRO/ALERTA.
- `.tmp/auditoria/divergencias.csv` — todos os apontamentos (inclui INFO).

Tudo em `.tmp/` (gitignored). Entregável final = relatório exportado ao cliente.

## Ferramentas (Camada 3)

`execution/auditoria-matriz-fiscal/`:
- `dump-matrix.ps1` — extrai a aba do `.xlsx` (zip+XmlReader, sem dependências).
- `lib.mjs` — regras puras R1–R7 (ver README).
- `lib.test.mjs` — testes (`node --test`).
- `audit.mjs` — runner + relatório.

## Procedimento

1. **Extrair** a aba: `dump-matrix.ps1 -Xlsx <planilha> -Out .tmp/auditoria/matrix.json`.
2. **Rodar** a auditoria com as tabelas oficiais **mais recentes** disponíveis em
   `base de conhecimento/cclasstrib/`.
3. **Triar** o relatório: primeiro ERRO (bloqueia config), depois ALERTA, por fim
   INFO (pontos de atenção jurídica — ex.: Imposto Seletivo sobre álcool).
4. **Cruzar dúvidas jurídicas** com o agente `ask-reforma` (a base contém o texto
   integral da LC 214/2025 — arts. 273–276, 47–56, 125/135/137/148 e Anexos).
5. **Exportar** o relatório saneado ao cliente.

## Regras de validação

Ver tabela no README da ferramenta. Princípios:
- Códigos (`cClassTrib`/`CST`) só valem se existirem e estiverem **pareados** na
  tabela oficial (R1/R2).
- Detecção de **álcool é por categoria** (`VINHOS E ESPUMANTES`, `DESTILADOS`,
  `CERVEJAS`, `Carta de Vinhos`) + NCM 2203–2208 — nunca por substring da
  descrição (evita `CHAMPIGNON`, `COPO ... WHISKY`, `CAFÉ EXPRESSO`).
- **Regra de ouro do regime** (arts. 273–276): alimentação e bebidas **não
  alcoólicas** preparadas no local → `200047` (–40%); bebida **alcoólica**, ainda
  que preparada → `000001` (integral, fora do regime); gorjeta ≤ 15% e
  intermediação/entrega → fora da base (`410019`/`410020`).

## Edge cases aprendidos (Self-Annealing)

| Data | Problema | Solução |
|---|---|---|
| 2026-09-17 | `isAlcoholic` por substring gerava falsos-positivos (`CHAMPIGNON`→champ, `COPO NADIR WHISKY`→whisk, `CAFÉ EXPRESSO`, `ÁGUA DE COCO`) | Basear detecção na **categoria** da planilha + NCM 2203–2208 |
| 2026-09-17 | Rolhas/xaropes cadastrados em `DESTILADOS`/`DRINKS` com NCM zerado ou `2208.90.00:` (typo) | R3/R5 sinalizam corretamente como inconsistência de categoria×NCM — mensagem neutra ("revisar NCM ou categoria") |

## Restrições

- **Dado do cliente nunca entra na base pública do RAG** nem no git — só o
  relatório é entregável, e via canal privado.
- A tabela oficial usada pode ser **mais recente** que a citada na planilha (ex.:
  planilha v.15/04/2026 × tabela do repo v.01/06/2026). Registrar a versão usada
  no relatório (o `audit.mjs` já imprime `tabela oficial: <arquivo>`).
- A camada "matriz atual" (ICMS/PIS-COFINS, ex.: `art. 763` do RICMS estadual)
  está **fora do escopo** desta auditoria e do RAG (que é federal/reforma).
