---
name: matematica-financeira
version: 1.0.0
description: >
  Executa e explica cálculos de matemática financeira: juros simples e compostos,
  sistemas de amortização (SAC e Price), descontos comerciais e racionais,
  indicadores de viabilidade (VPL, TIR, Payback), conversão de taxas, indexadores
  brasileiros (SELIC, CDI, IPCA, IGP-M) e boas práticas de precisão computacional.
tags:
  - finanças
  - matemática financeira
  - amortização
  - juros
  - investimentos
  - brasil
applyTo: "**"
---

# Skill: Matemática Financeira

## Objetivo

Fornecer cálculos financeiros precisos e explicações didáticas sobre os fundamentos
da matemática financeira, sistemas de amortização, análise de investimentos e
particularidades do mercado financeiro brasileiro.

---

## Conhecimento de Base

Consulte os arquivos de referência desta skill antes de responder:

- `references/formulas-e-sistemas.md` — Fórmulas, regimes de capitalização, SAC, Price, descontos, VPL, TIR, Payback
- `references/contexto-brasileiro.md` — SELIC, CDI, IPCA, IGP-M, convenção 252 dias úteis
- `references/precisao-computacional.md` — Tipos de dados, BigDecimal, arredondamento bancário, boas práticas
- `references/liquidacao-judicial-erros-comuns.md` — **Erros críticos em liquidação judicial**: moeda histórica, marco dos juros, fluxo único, honorários fixos, EC 113/2021

---

## Workflow de Resposta

### 1. Identificar o tipo de cálculo solicitado

Classifique a solicitação em uma das categorias:

| Categoria | Exemplos de solicitação |
|---|---|
| **Juros simples** | "calcule os juros de R$ 1.000 a 2% ao mês por 12 meses" |
| **Juros compostos / Montante** | "quanto rende R$ 5.000 a 12% ao ano em 2 anos?" |
| **Conversão de taxas** | "converta 12% ao ano para taxa mensal equivalente" |
| **Desconto comercial** | "qual o valor presente de uma duplicata a vencer?" |
| **Desconto racional** | "desconto por dentro sobre título futuro" |
| **Amortização SAC** | "simule financiamento imobiliário pelo SAC" |
| **Amortização Price** | "parcela fixa de financiamento de veículo" |
| **VPL** | "o projeto vale a pena com TMA de 10%?" |
| **TIR** | "qual a rentabilidade interna deste fluxo de caixa?" |
| **Payback** | "em quanto tempo recupero o investimento?" |
| **Indexadores BR** | "correção pelo IPCA", "rendimento CDI", "base 252 dias" |

### 2. Coletar os parâmetros necessários

Se algum parâmetro obrigatório estiver faltando, pergunte de forma objetiva antes de calcular:

**Parâmetros padrão:**
- `PV` — Capital inicial / Valor presente
- `FV` — Montante / Valor futuro
- `i` — Taxa de juros (especificar a periodicidade: a.m., a.a., a.d.)
- `n` — Prazo (especificar a unidade: meses, anos, dias)
- `PMT` — Pagamento / Prestação periódica
- `TMA` — Taxa Mínima de Atratividade (para VPL/TIR)

> **Regra de ouro**: `i` e `n` devem estar na mesma base temporal.

### 3. Executar o cálculo com precisão

- Use **aritmética decimal** (não ponto flutuante) para valores monetários.
- Em Python, use `from decimal import Decimal, getcontext; getcontext().prec = 28`.
- Arredonde valores monetários para 2 casas decimais no resultado final.
- Aplique **arredondamento bancário** (HALF_EVEN) em grandes volumes de parcelas.

### 4. Apresentar o resultado

Estruture a resposta em três blocos:

**a) Parâmetros assumidos** — liste todos os valores utilizados no cálculo.

**b) Desenvolvimento** — mostre o passo a passo da fórmula aplicada. Use
 notação matemática clara e, quando solicitado, gere código Python.

**c) Resultado** — destaque o valor final em R$ com duas casas decimais e
 interprete o resultado no contexto da pergunta.

---

## Regras de Cálculo por Modalidade

### Juros Simples
```
M = PV × (1 + i × n)
J = PV × i × n
```
- Crescimento **linear** — juros não se incorporam ao capital.
- Aplicável: operações de curtíssimo prazo, títulos com desconto comercial.
- **Padrão judicial brasileiro**: liquidação de sentenças usa juros simples (sem capitalização).

### Juros Compostos
```
M = PV × (1 + i)ⁿ
```
- Crescimento **exponencial** — juros sobre juros.
- Base do sistema financeiro: poupança, CDB, financiamentos.

### Conversão de Taxas (Equivalência Composta)
```
i_mensal = (1 + i_anual)^(1/12) − 1
i_diária_útil = (1 + i_anual)^(1/252) − 1   ← padrão Selic/CDI no Brasil
```

### Desconto Comercial (Por Fora)
```
D_com = N × d × n
PV   = N × (1 − d × n)
```
onde `N` = valor nominal, `d` = taxa de desconto, `n` = prazo.

### Desconto Racional (Por Dentro)
```
D_rat = PV × i × n
PV   = N / (1 + i × n)           ← simples
PV   = N / (1 + i)ⁿ              ← composto
```

> Hierarquia de abatimento: Desconto Comercial Simples > Comercial Composto > Racional Composto > Racional Simples.

### SAC — Sistema de Amortização Constante
```
Amortização (A) = PV / n             (constante em todas as parcelas)
Juros_k         = Saldo_k × i
Prestação_k     = A + Juros_k        (decrescente)
Saldo_k+1       = Saldo_k − A
```
- Indicado para: financiamento imobiliário de longo prazo no Brasil.
- Saldo devedor cai mais rapidamente → menor custo total de juros.

### Price — Sistema Francês de Amortização
```
PMT = PV × [i × (1 + i)ⁿ] / [(1 + i)ⁿ − 1]
Juros_k         = Saldo_k × i
Amortização_k   = PMT − Juros_k      (crescente)
Saldo_k+1       = Saldo_k − Amortização_k
```
- Indicado para: financiamento de veículos, compras a prazo.
- Prestação fixa → melhor planejamento mensal; custo total maior que SAC.

### VPL — Valor Presente Líquido
```
VPL = −Investimento + Σ [FC_t / (1 + TMA)^t]   para t = 1..n
```
- VPL > 0 → projeto viável acima do custo de oportunidade.
- VPL = 0 → rentabilidade exatamente igual à TMA.
- VPL < 0 → proyecto não remunera o capital adequadamente.

### TIR — Taxa Interna de Retorno
```
VPL(TIR) = 0   →   resolução iterativa (Newton-Raphson)

TIR_{k+1} = TIR_k − VPL(TIR_k) / VPL'(TIR_k)
```
- Compare TIR com a TMA: TIR > TMA → aceitar; TIR < TMA → rejeitar.
- Alerte sobre múltiplas TIRs quando o fluxo de caixa muda de sinal mais de uma vez.

### Payback
```
Payback Simples   → somar FC nominais até igualar o investimento
Payback Descontado → somar FC descontados pela TMA até igualar o investimento
```
- Payback descontado é superior: considera o valor do dinheiro no tempo.
- Limitação: ignora fluxos após o período de recuperação.

---

## Geração de Tabelas de Amortização

Quando solicitado, gere uma tabela período a período com as colunas:

| Período | Saldo Devedor Inicial | Amortização | Juros | Prestação | Saldo Devedor Final |
|---|---|---|---|---|---|

Para tabelas longas (> 24 meses), ofereça código Python em vez de exibir todas as linhas.

---

## Geração de Código Python

Quando o usuário pedir código, siga estas diretrizes:

```python
from decimal import Decimal, getcontext, ROUND_HALF_EVEN
getcontext().prec = 28

# Sempre inicialize Decimals a partir de strings, nunca de floats
PV = Decimal("200000.00")
i  = Decimal("0.01")       # taxa mensal
n  = 240                   # prazo em meses

# Arredondamento monetário
def arredondar(valor):
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

Nunca use `float` para valores monetários no código gerado.

---

## Contexto Brasileiro — Regras Especiais

1. **Base 252 dias úteis**: Conversão Selic/CDI anual → diária usa base 252, não 365.
2. **Selic Over vs Selic Meta**: Over é a taxa efetiva negociada no mercado interbancário; Meta é o alvo do Copom.
3. **CDI**: Benchmark para renda fixa privada (CDB, LCI, LCA). Praticamente igual à Selic Over.
4. **IPCA**: Inflação oficial (IBGE). Use para correção monetária e cálculo de juros reais.
5. **IGP-M**: Inflação FGV. Usado em contratos de aluguel e setor elétrico.
6. **Juros reais**: `(1 + i_nominal) / (1 + inflação) − 1` (fórmula de Fisher).
7. **Liquidação judicial**: Usa-se juros **simples** (sem capitalização). IPCA para correção + juros previdenciários ou SELIC (EC 113/2021).

---

## Precisão Computacional — Alertas

- **Nunca use `float`** para dinheiro. Represente valores como `Decimal` ou inteiros em centavos.
- Erros acumulados em `float` podem gerar discrepâncias de reais em tabelas longas.
- Inicialize `Decimal` sempre a partir de `str`: `Decimal("0.1")`, não `Decimal(0.1)`.
- Use `ROUND_HALF_EVEN` (arredondamento bancário) para reduzir viés em grandes volumes.

---

## Comparação SAC vs Price — Tabela Referência

| Atributo | SAC | Price |
|---|---|---|
| Perfil da prestação | Decrescente | Constante |
| Amortização | Constante | Crescente |
| Juros mensais | Decrescentes | Decrescentes |
| Velocidade de queda do saldo | Alta desde o início | Lenta no início |
| Custo total de juros | Menor | Maior |
| Indicação principal | Imobiliário longo prazo | Veículos / Consumo |
| Comparação justa | Pelo VP dos fluxos descontados — são equivalentes ao mesmo PV e taxa |

---

## Limitações da Skill

- Não busca cotações em tempo real (Selic, CDI, IPCA, IGP-M do dia). Solicite ao usuário que forneça o índice atualizado.
- Fluxos de caixa não convencionais (múltiplas trocas de sinal) podem ter múltiplas TIRs; alertar o usuário.
- Para tabelas com milhares de períodos, gerar código Python é mais eficiente do que exibir a tabela inteira.
