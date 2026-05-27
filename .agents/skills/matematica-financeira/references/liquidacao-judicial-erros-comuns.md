# Erros Comuns em Liquidação Judicial — Lições Aprendidas

> Registradas a partir da análise comparativa do Proc. 0024117-69.2007.8.06.0001
> (Irene da Silva Costa × Estado do Ceará — Nature previdenciária / Fazenda Pública)

---

## Erro #1 — Parcelas Uniformes Ignorando a Moeda Histórica ❌ GRAVÍSSIMO

### O que foi feito errado
Dividir o total do débito pelo número de parcelas e usar um valor uniforme em R$ para todas:
```
VALOR_PARCELA = R$ 12.255,64 / 59 = R$ 207,72  ← ERRADO
```

### Por que é errado
Débitos em processos de 1993/1994 existiam em **Cruzeiros (Cr$) / Cruzeiros Reais (CR$) / URV**
antes do Plano Real (jul/1994). Os valores nominais nessas moedas eram ordens de grandeza maiores:

| Competência | Valor correto (moeda da época) |
|---|---|
| out/1993 | Cr$ 3.639,09 |
| nov–dez/1993 | Cr$ 8.375,24 |
| jan-fev/1994 | Cr$ 21.359,21 |
| jun/1994 | Cr$ 63.729,28 |
| nov/1994 em diante | R$ 43,94 |
| 1995 | R$ 49,64 |
| 1996 | R$ 89,71 |
| jul/1997 em diante | R$ 189,78 |

### Regra correta
**Sempre usar os valores reais de cada competência** na moeda vigente na época.
Se o processo não discrimina parcela a parcela, exigir a planilha original da parte
ou reconstruir a partir dos atos normativos de reajuste da categoria.

### Conversão Plano Real (jul/1994)
O fluxo acumulado em Cruzeiros Reais é convertido para R$ por uma linha de conversão:
```
Saldo_CR$ →  ÷ fator_URV  →  R$
```
Após a conversão, o fluxo continua em R$ com os novos valores mensais.

---

## Erro #2 — Início dos Juros de Mora desde o Vencimento da Parcela ❌ GRAVÍSSIMO

### O que foi feito errado
Iniciar os juros simples a partir do próprio mês de competência de cada parcela:
```python
# ERRADO — juros fluindo desde set/1993 para a 1ª parcela
cur = (p_ano, p_mes)  # = (1993, 9)
while cur <= DATA_BASE:
    valor_juros = valor_corrigido * taxa_juros / 100
```

### Por que é errado
Os **juros de mora** em ação de conhecimento só fluem a partir do **evento jurídico que os
inaugura**, que pode ser:
- Data da **citação** (`art. 405, CC`);
- Data do **trânsito em julgado** da sentença;
- Data fixada **expressamente na sentença** (ex.: "juros desde a citação");
- Marco específico para Fazenda Pública (`art. 1º-F, Lei 9.494/97`).

No caso analisado o marco era **20/12/2006** (data do TJ/trânsito).
Aplicar juros desde 1993 gerou **~13 anos de juros indevidos**.

### Cálculo do mês parcial (pro rata die)
Quando o marco cai no meio do mês, calcular a taxa proporcional:
```
taxa_proporcional = taxa_mensal × (dias_restantes_no_mês / dias_no_mês)

Exemplo: marco = 20/12/2006, taxa = 1% a.m., dezembro tem 31 dias
    dias restantes = 31 − 20 = 11 dias
    taxa_parcial   = 0,01 × (11/31) = 0,003548... a.m. ≈ 0,355%
```

### Regra correta
```
MARCO_JUROS = data definida na sentença (ler a decisão)
Antes do marco  → valor_juros = 0
No mês do marco → taxa proporcional (pro rata die)
Após o marco    → taxa integral (1% a.m. ou 0,5% conforme o caso)
```

---

## Erro #3 — Juros Aplicados sobre o Fluxo Errado (Parcelas vs Saldo Total) ❌

### O que foi feito errado
Calcular os juros sobre cada parcela individualmente, em 59 fluxos paralelos,
cada um com seu próprio `saldo_juros_acum` iniciando desde o mês da competência.

### Cálculo correto
Os juros de mora incidem sobre o **saldo total atualizado** (fluxo único):
```
Saldo_total_t = correção acumulada de todas as parcelas vencidas até t
Juros_mês_t   = Saldo_total_t × taxa_juros   (a partir do marco)
```
O fluxo deve ser **único e acumulado**, não 59 fluxos paralelos.

---

## Erro #4 — Honorários: Base Percentual em vez de Valor Fixo ❌

### O que foi feito errado
```python
valor_base = total_principal_corrigido * 0.10  # 10% → R$ 30.676,97  ERRADO
```

### Por que é errado
A sentença pode fixar os honorários em **valor nominal** (ex.: R$ 500,00).
Nesse caso, **não se aplica percentual** — usa-se o valor fixado e corrige-se
monetariamente desde a data da sentença.

### Regra correta
1. **Ler a sentença antes de qualquer cálculo**.
2. Se a sentença fixou valor nominal → usar esse valor como base, corrigindo-o.
3. Se a sentença fixou percentual → aplicar sobre a base definida na decisão.
4. Nunca presumir a base sem verificar a decisão judicial.

---

## Erro #5 — Honorários: Data de Início e Fase Erradas ❌

### O que foi feito errado
- Marco dos juros de honorários: **dez/2006** (13 anos antes do correto)
- Fase 1 honorários: IPCA + 0,5% a.m. (juros separados)

### Correto no caso analisado
- Marco: **ago/2021** (data da sentença que fixou os honorários)
- dez/2021: divisão proporcional — 8 dias IPCA + 23 dias SELIC
- A partir de jan/2022: **apenas SELIC** (EC 113/2021 — sem juros separados)

### Regra geral para honorários em processos contra Fazenda Pública
```
Honorários fixados antes de dez/2021:
  Fase 1: IPCA (ou índice da sentença) + juros (conforme art. 85, §16, CPC)
  Fase 2 (dez/2021+): SELIC (EC 113/2021)

Honorários fixados após dez/2021:
  Somente SELIC desde a data da decisão
```

---

## Erro #6 — Fluxo Paralelo vs Fluxo Único ⚠️ (impacto em moeda antiga)

### O que foi feito errado
59 fluxos independentes, cada parcela corrigida separadamente desde seu mês de vencimento.

### Quando isso causa divergência significativa
- Presença de **IPCA negativo** (deflação): em fluxo único, a deflação reduz o saldo
  total; em fluxos paralelos, parcelas mais antigas "absorvem" mais deflação.
- **Conversão de moeda** (Plano Real): o fluxo único converte o saldo acumulado de uma
  vez; os fluxos paralelos convertem cada parcela isoladamente, perdendo a dinâmica
  de acúmulo em Cruzeiros.

### Regra correta
Para débitos de trato sucessivo (salários, pensões), usar sempre **fluxo único acumulado**:
```
Saldo_t = (Saldo_{t-1} × (1 + índice_t)) + parcela_nova_t
```
Isso reflete fielmente como o passivo evoluiu mês a mês na realidade.

---

## Checklist Pré-Cálculo (Use Antes de Programar)

Antes de escrever qualquer script de liquidação judicial, responder obrigatoriamente:

- [ ] Quais são os **valores reais de cada competência** na moeda da época?
- [ ] Existe **conversão de moeda** no período (Plano Real, URV)?
- [ ] Qual é o **marco exato** (dia/mês/ano) que inicia os juros de mora?
- [ ] A taxa de juros é **proporcional pro rata die** no primeiro mês?
- [ ] Os honorários são **valor fixo ou percentual**? Qual a data-base da decisão?
- [ ] O período de aplicação é **Fase 1 (IPCA + juros)** ou **Fase 2 (SELIC)** ou misto?
- [ ] Há **juros na Fase 2** ou a SELIC já unifica correção + juros (EC 113/2021)?
- [ ] O fluxo é **único e acumulado** ou pode ser tratado em paralelo (apenas se não houver conversão de moeda)?

---

## Resumo das Regras de Ouro

| Regra | Descrição |
|---|---|
| **1 — Ler a sentença** | Nunca presumir base, marco ou taxa. Extrair da decisão. |
| **2 — Moeda da época** | Usar os valores nominais originais, não dividir o total por parcelas. |
| **3 — Marco dos juros** | Juros de mora fluem desde o evento jurídico, não desde o vencimento da obrigação. |
| **4 — Fluxo único** | Débitos de trato sucessivo: saldo acumulado único, não fluxos paralelos. |
| **5 — Pro rata die** | Mês parcial (marco no meio do mês) exige taxa proporcional ao número de dias. |
| **6 — EC 113/2021** | Após dez/2021, SELIC unifica correção e juros para Fazenda Pública. Não somar os dois. |
| **7 — Honorários fixos** | Corrigir o valor fixo desde a data da decisão; nunca calcular % sobre principal se não for o caso. |
