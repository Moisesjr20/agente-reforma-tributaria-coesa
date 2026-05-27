# Fórmulas e Sistemas de Matemática Financeira

## 1. Variáveis Estruturais do Fluxo de Caixa

| Variável | Definição | Símbolo |
|---|---|---|
| Capital Inicial | Valor presente no momento zero | PV (Present Value) |
| Montante | Valor futuro acumulado (capital + juros) | FV (Future Value) |
| Taxa de Juros | Coeficiente percentual por período | i (Interest) |
| Prazo | Número de períodos da operação | n (Number of periods) |
| Pagamento | Prestação/aporte periódico | PMT (Payment) |
| Custo de Oportunidade | Taxa mínima de retorno exigida | TMA |

Relação fundamental: `M = C + J` (Montante = Capital + Juros)

---

## 2. Regimes de Capitalização

### 2.1 Capitalização Simples (Linear)

```
J = PV × i × n
M = PV × (1 + i × n)
```

- Juros calculados **sempre sobre o capital inicial** — sem incorporação.
- Crescimento **linear**.
- Aplicações: operações curtíssimo prazo, descontos comerciais, **liquidação judicial (padrão)**.

### 2.2 Capitalização Composta (Exponencial)

```
M = PV × (1 + i)ⁿ
J = M − PV
```

- Juros do período são incorporados ao capital (base para o período seguinte).
- Crescimento **exponencial** — "juros sobre juros".
- Aplicações: poupança, CDB, financiamentos, investimentos em geral.

> **Atenção ao alinhamento de base temporal**: se `i` é mensal, `n` deve ser em meses.

### 2.3 Conversão / Equivalência de Taxas

Taxas equivalentes produzem o mesmo montante pelo regime composto:

```
(1 + i_a)¹ = (1 + i_m)¹²             → anual ↔ mensal
(1 + i_a)¹ = (1 + i_d)²⁵²            → anual ↔ diária útil (padrão Selic/CDI)
(1 + i_a)¹ = (1 + i_d)³⁶⁵            → anual ↔ diária corrida

Isolando i_m: i_m = (1 + i_a)^(1/12) − 1
Isolando i_d: i_d = (1 + i_a)^(1/252) − 1   ← mercado financeiro BR
```

---

## 3. Descontos Financeiros

### 3.1 Desconto Comercial / "Por Fora" (Simples)

```
D  = N × d × n
PV = N − D = N × (1 − d × n)
```

- `N` = valor nominal (futuro), `d` = taxa de desconto, `n` = prazo.
- Desconto calculado sobre o **valor nominal** → gera valor efetivo **maior** que o racional.
- Prática bancária brasileira para desconto de duplicatas.
- **Limitação**: PV pode ser negativo se `d × n > 1` (prazo longo + taxa alta).

### 3.2 Desconto Racional / "Por Dentro" (Simples)

```
D  = PV × i × n
PV = N / (1 + i × n)
```

- Desconto calculado sobre o **valor presente** → matematicamente consistente.

### 3.3 Desconto Racional Composto

```
PV = N / (1 + i)ⁿ
```

### 3.4 Hierarquia de Abatimento (maior → menor)

1. Desconto Comercial Simples
2. Desconto Comercial Composto
3. Desconto Racional Composto
4. Desconto Racional Simples

---

## 4. Sistemas de Amortização

### 4.1 SAC — Sistema de Amortização Constante

**Fórmulas:**
```
A       = PV / n                       (amortização constante)
Saldo₀  = PV
Saldo_k = PV × (1 − k/n)              (após k pagamentos)
Juros_k = Saldo_{k-1} × i
PMT_k   = A + Juros_k                  (parcela decrescente)
```

**Tabela exemplo (PV=100.000; n=4; i=2% a.m.):**

| k | Saldo Inicial | Amortização | Juros | Prestação | Saldo Final |
|---|---|---|---|---|---|
| 1 | 100.000,00 | 25.000,00 | 2.000,00 | 27.000,00 | 75.000,00 |
| 2 | 75.000,00 | 25.000,00 | 1.500,00 | 26.500,00 | 50.000,00 |
| 3 | 50.000,00 | 25.000,00 | 1.000,00 | 25.000,00 | 25.000,00 |
| 4 | 25.000,00 | 25.000,00 | 500,00 | 25.500,00 | 0,00 |

**Características:**
- Saldo devedor cai **linearmente** → menos juros totais.
- Primeira parcela sempre é a maior.
- Indicado: financiamento imobiliário longo prazo Brasil (CEF, BB).

### 4.2 Price — Sistema Francês de Amortização

**Fórmula da prestação constante (PMT):**
```
PMT = PV × [i × (1 + i)ⁿ] / [(1 + i)ⁿ − 1]
```

**Evolução interna da parcela:**
```
Juros_k         = Saldo_{k-1} × i
Amortização_k   = PMT − Juros_k         (crescente)
Saldo_k         = Saldo_{k-1} − Amortização_k
```

**Tabela exemplo (PV=100.000; n=4; i=2% a.m.):**

| k | Saldo Inicial | Amortização | Juros | Prestação | Saldo Final |
|---|---|---|---|---|---|
| 1 | 100.000,00 | 24.261,54 | 2.000,00 | 26.261,54 | 75.738,46 |
| 2 | 75.738,46 | 24.746,77 | 1.514,77 | 26.261,54 | 50.991,69 |
| 3 | 50.991,69 | 25.241,71 | 1.019,83 | 26.261,54 | 25.749,98 |
| 4 | 25.749,98 | 25.749,98 | 511,00 | 26.260,98* | 0,00 |

*última parcela pode variar por arredondamento.

**Características:**
- Prestação **constante** → facilidade de planejamento.
- Amortização crescente; saldo cai mais lentamente no início.
- Indicado: financiamento de veículos, consórcios, compras a prazo.

### 4.3 Comparação SAC vs Price

| Atributo | SAC | Price |
|---|---|---|
| Prestação | Decrescente | Constante |
| Amortização | Constante | Crescente |
| Juros totais | Menores | Maiores |
| Velocidade de amortização | Alta desde o início | Lenta no início |
| Indicação principal | Imobiliário longo prazo | Veículos / Consumo |

> **Equivalência financeira**: trazendo todos os fluxos ao valor presente pela mesma taxa, ambos os sistemas resultam exatamente no mesmo PV — são financeiramente equivalentes.

---

## 5. Análise de Viabilidade de Investimentos

### 5.1 VPL — Valor Presente Líquido

```
VPL = −Investimento₀ + Σ [FC_t / (1 + TMA)^t]   t = 1, 2, ..., n
```

**Interpretação:**
- VPL > 0 → projeto **viável** (gera riqueza acima do custo de oportunidade)
- VPL = 0 → projeto **indiferente** (remunera exatamente a TMA)
- VPL < 0 → projeto **inviável** (destrói valor)

**Propriedades:**
- Considera o valor do dinheiro no tempo.
- Sensível à escolha da TMA.
- Indicador mais robusto para decisão isolada.

### 5.2 TIR — Taxa Interna de Retorno

```
VPL(TIR) = 0

Resolução iterativa pelo método de Newton-Raphson:
TIR_{k+1} = TIR_k − f(TIR_k) / f'(TIR_k)

onde f(i) = VPL(i) e f'(i) = −Σ [t × FC_t / (1 + i)^(t+1)]
```

**Critério de convergência:** `|TIR_{k+1} − TIR_k| < 10⁻⁸`

**Interpretação:**
- TIR > TMA → aceitar o projeto
- TIR < TMA → rejeitar o projeto
- TIR = TMA → decisão indiferente

**Alertas:**
- Fluxos de caixa com mais de uma mudança de sinal podem gerar **múltiplas TIRs**.
- Fluxos all-positivos ou all-negativos não têm TIR real.
- Prefira VPL quando TIR e VPL divergem (projetos mutuamente exclusivos).

### 5.3 Payback

**Payback Simples:**
```
Payback = período onde Σ FC_t ≥ Investimento₀
```

**Payback Descontado:**
```
Payback = período onde Σ [FC_t / (1 + TMA)^t] ≥ Investimento₀
```

| Tipo | Considera valor do dinheiro no tempo | Considera fluxos pós-recuperação |
|---|---|---|
| Simples | Não | Não |
| Descontado | Sim | Não |

- Payback descontado é sempre maior ou igual ao simples.
- Limitação comum: ignora a lucratividade após o período de recuperação.

---

## 6. Código Python — Implementações de Referência

### Juros Compostos
```python
from decimal import Decimal, getcontext
getcontext().prec = 28

def montante_composto(pv: Decimal, i: Decimal, n: int) -> Decimal:
    return pv * (1 + i) ** n
```

### SAC
```python
def tabela_sac(pv: Decimal, i: Decimal, n: int):
    A = pv / n
    saldo = pv
    for k in range(1, n + 1):
        juros = saldo * i
        pmt = A + juros
        saldo -= A
        yield k, A, juros, pmt, saldo
```

### Price — PMT
```python
def pmt_price(pv: Decimal, i: Decimal, n: int) -> Decimal:
    fator = (1 + i) ** n
    return pv * (i * fator) / (fator - 1)
```

### VPL
```python
def vpl(fluxos: list[Decimal], tma: Decimal) -> Decimal:
    # fluxos[0] = investimento negativo
    return sum(fc / (1 + tma) ** t for t, fc in enumerate(fluxos))
```

### TIR (Newton-Raphson)
```python
from decimal import Decimal

def tir(fluxos: list[Decimal], estimativa: float = 0.1, max_iter: int = 1000) -> Decimal:
    i = Decimal(str(estimativa))
    for _ in range(max_iter):
        f  = sum(fc / (1 + i) ** t for t, fc in enumerate(fluxos))
        df = sum(-t * fc / (1 + i) ** (t + 1) for t, fc in enumerate(fluxos))
        if df == 0:
            break
        i_novo = i - f / df
        if abs(i_novo - i) < Decimal("1e-8"):
            return i_novo
        i = i_novo
    return i
```
