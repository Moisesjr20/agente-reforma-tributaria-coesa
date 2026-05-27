# Contexto Financeiro Brasileiro

## 1. Convenção de 252 Dias Úteis

No Brasil, a maioria das operações de renda fixa e derivativos usa base de **252 dias úteis por ano**
(ao invés de 360 ou 365 dias corridos, como em outros mercados).

```
i_diária = (1 + i_anual)^(1/252) − 1

Exemplo: Selic 14,75% a.a.
i_d = (1,1475)^(1/252) − 1 = 0,0005436... → ≈ 0,054% a.d.
```

Isso significa que a capitalização dos juros ocorre **apenas em dias bancários úteis**.
Feriados e fins de semana não geram rendimento nessa base.

---

## 2. Taxa Selic

### 2.1 Selic Meta
- Alvo percentual definido pelo **Copom** (Comitê de Política Monetária do Banco Central).
- Revisada a cada 45 dias (8 reuniões/ano).
- Instrumento central da política monetária brasileira (controle inflacionário).

### 2.2 Selic Over
- Taxa **efetiva** apurada diariamente no mercado interbancário.
- Calculada como média ponderada das operações lastreadas em títulos públicos federais.
- Geralmente ≈ Selic Meta (costuma ficar 0,10 p.p. abaixo).
- É a taxa usada em correções de sentenças judiciais **pós-EC 113/2021**.

### 2.3 Uso em Liquidações Judiciais (EC 113/2021)
A partir de dezembro/2021, a EC 113/2021 unificou correção monetária + juros de mora para
débitos de entes federais, passando a usar **exclusivamente a taxa SELIC** como fator único.

```
Fase 1 (antes dez/2021): IPCA para correção + juros simples (tabela TJ/Previdenciários)
Fase 2 (dez/2021 em diante): SELIC Over acumulada (substitui correção e juros)
```

---

## 3. CDI — Certificado de Depósito Interbancário

- Referência de empréstimos de curtíssimo prazo entre bancos.
- Taxa CDI (DI) ≈ Selic Over (diferença < 0,01 p.p. na maioria dos dias).
- **Benchmark padrão** para renda fixa privada:
  - CDB (Certificado de Depósito Bancário)
  - LCI / LCA (Letras de Crédito Imobiliário / do Agronegócio)
  - Debêntures (muitas vezes CDI + spread)

```
Rentabilidade líquida de um CDB 110% CDI:
i_efetiva = 1,10 × i_CDI
```

### Conversão CDI anual → diária útil
```
i_d = (1 + i_CDI_aa)^(1/252) − 1
```

---

## 4. IPCA — Índice Nacional de Preços ao Consumidor Amplo

- Calculado pelo **IBGE** (Instituto Brasileiro de Geografia e Estatística).
- **Índice oficial de inflação** do Brasil — meta definida pelo CMN.
- Apurado mensalmente; cobre famílias com renda de 1 a 40 salários mínimos.
- Usado como meta de inflação pelo Banco Central para calibrar a Selic.

**Correção monetária pelo IPCA:**
```
Fator de correção = Π (1 + IPCA_mensal_t)   para cada mês t no período
Valor corrigido    = Valor original × Fator de correção
```

**Uso em liquidações judiciais (Fase 1 — antes de dez/2021):**
- Correção do principal pela variação do IPCA mês a mês.
- Juros simples sobre o principal corrigido (tabela previdenciária: 0,5 a 1% a.m.).

---

## 5. IGP-M — Índice Geral de Preços do Mercado

- Calculado pela **FGV** (Fundação Getulio Vargas).
- Composto por: IPA (60%) + IPC (30%) + INCC (10%).
- Mais sensível a variações cambiais e preços no atacado.
- **Usos principais**:
  - Contratos de aluguel residencial e comercial.
  - Tarifas de energia elétrica e contratos de concessão.
  - Debêntures indexadas.

---

## 6. Taxa de Juros Real (Fórmula de Fisher)

Para calcular a rentabilidade real descontando a inflação:

```
(1 + i_real) = (1 + i_nominal) / (1 + inflação)

i_real = [(1 + i_nominal) / (1 + IPCA)] − 1
```

**Exemplo:**
- Aplicação rende 14% a.a.
- IPCA do ano = 4,83%
- `i_real = (1,14 / 1,0483) − 1 = 0,0875 → 8,75% a.a. real`

---

## 7. Imposto de Renda sobre Renda Fixa

Tabela regressiva aplicada sobre os **rendimentos** (não sobre o capital):

| Prazo de aplicação | Alíquota IR |
|---|---|
| Até 180 dias | 22,5% |
| 181 a 360 dias | 20,0% |
| 361 a 720 dias | 17,5% |
| Acima de 720 dias | 15,0% |

- LCI e LCA: **isentos de IR** para pessoa física.
- Cálculo do rendimento líquido: `rendimento_líq = rendimento_bruto × (1 − alíquota_IR)`

---

## 8. Indexadores Previdenciários (Liquidações Judiciais)

Tabela de juros simple usados em liquidações judiciais previdenciárias (Fase 1):

| Período | Taxa Mensal |
|---|---|
| Set/1993 – Jan/1999 | 1,00% a.m. |
| Fev/1999 – Mai/2009 | 1,00% a.m. |
| Jun/2009 – Nov/2021 | 0,50% a.m. |

> Fonte: tabela "juros prev" do TRF / CJF. Após nov/2021 aplica-se SELIC (EC 113/2021).

---

## 9. Summary de Referências Rápidas

| Indicador | Gestor | Periodicidade | Base de Cálculo |
|---|---|---|---|
| Selic Meta | Copom / BCB | A cada 45 dias | % a.a. |
| Selic Over | BCB | Diária | 252 d.u./ano |
| CDI | B3 / CETIP | Diária | 252 d.u./ano |
| IPCA | IBGE | Mensal | % a.m. |
| IGP-M | FGV | Mensal | % a.m. |
| TR | BCB | Diária | Poupança / FGTS |
