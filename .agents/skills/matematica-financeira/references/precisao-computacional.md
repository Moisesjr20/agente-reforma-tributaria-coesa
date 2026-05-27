# Precisão Computacional em Cálculos Financeiros

## 1. O Problema do Ponto Flutuante (IEEE 754)

A maioria das linguagens usa `float` ou `double` por padrão — representação binária (base 2).
Muitos números decimais comuns **não têm representação binária exata**:

```python
>>> 0.1 + 0.2
0.30000000000000004          # NÃO é 0.30

>>> 1.1 + 2.2
3.3000000000000003           # erro de ~3e-16
```

Em um financiamento de 240 parcelas, esse erro se acumula a cada iteração.
O resultado pode divergir em **reais** ao final da tabela.

---

## 2. Solução: Tipos Decimais (Base 10)

### Python — `decimal.Decimal`

```python
from decimal import Decimal, getcontext, ROUND_HALF_EVEN

getcontext().prec = 28          # precisão de 28 dígitos significativos

# CORRETO — inicializar sempre a partir de string
pv = Decimal("200000.00")
i  = Decimal("0.01")            # 1% a.m.
n  = 240

# ERRADO — nunca a partir de float
pv = Decimal(200000.0)          # herda imprecisão binária
```

### Java — `BigDecimal`

```java
BigDecimal pv = new BigDecimal("200000.00");
BigDecimal i  = new BigDecimal("0.01");

// ERRADO:
BigDecimal errado = new BigDecimal(0.1);   // herda imprecisão float
```

### C# — `decimal`

```csharp
decimal pv = 200000.00m;        // sufixo 'm' = tipo decimal nativo
decimal i  = 0.01m;
```

---

## 3. Representação como Inteiros (Centavos)

Outra abordagem robusta: armazenar todos os valores em **centavos** como `int`.

```python
# Armazenar
pv_centavos = 20_000_000    # R$ 200.000,00

# Calcular (atenção à divisão inteira)
juros_centavos = pv_centavos * 1 // 100   # 1% — divisão inteira pode truncar

# Exibir
print(f"R$ {pv_centavos / 100:,.2f}")
```

**Vantagem**: aritmética inteira é exata.
**Desvantagem**: precisão limitada a centavos; taxas fracionadas exigem
escalas maiores (ex: milésimos de centavo).

---

## 4. Arredondamento Bancário (ROUND_HALF_EVEN)

O **Banker's Rounding** arredonda o caso de empate (`x.5`) para o **número par mais próximo**:

```
2.5 → 2    (2 é par)
3.5 → 4    (4 é par)
4.5 → 4    (4 é par)
5.5 → 6    (6 é par)
```

Isso reduz o **viés acumulado** em grandes volumes de transações (50% arredonda para
cima, 50% para baixo → média tende a zero).

```python
from decimal import Decimal, ROUND_HALF_EVEN

def arredondar(valor: Decimal, casas: int = 2) -> Decimal:
    exp = Decimal(10) ** -casas          # ex: Decimal("0.01")
    return valor.quantize(exp, rounding=ROUND_HALF_EVEN)

arredondar(Decimal("2.345"))   # → Decimal("2.34")
arredondar(Decimal("2.355"))   # → Decimal("2.36")
```

---

## 5. Comparação de Estratégias

| Abordagem | Precisão | Risco de Erro | Linguagens |
|---|---|---|---|
| `float` / `double` | Baixa (binária) | Alto — erros acumulados | Todas |
| `Decimal` / `BigDecimal` | Alta (base 10) | Mínimo | Python, Java, C# |
| Inteiros em centavos | Absoluta (para 2 dec.) | Inexistente (se bem gerido) | Todas |

---

## 6. Armadilhas Comuns e Como Evitá-las

### Armadilha 1 — Inicializar Decimal a partir de float

```python
# ERRADO
x = Decimal(0.1)    # x = Decimal('0.1000000000000000055511151231257827021181583404541015625')

# CORRETO
x = Decimal("0.1")  # x = Decimal('0.1')
```

### Armadilha 2 — Divisão inteira em Python

```python
# Em Python 3, / sempre retorna float
resultado = 1 / 3                # float: 0.3333...

# Com Decimal:
resultado = Decimal("1") / Decimal("3")   # Decimal com 28 dígitos de precisão
```

### Armadilha 3 — Comparação de floats

```python
# ERRADO
if 0.1 + 0.2 == 0.3:    # False!
    ...

# CORRETO com Decimal
from decimal import Decimal
if Decimal("0.1") + Decimal("0.2") == Decimal("0.3"):   # True
    ...
```

### Armadilha 4 — Exponenciação com Decimal

```python
# Decimal suporta potências inteiras diretamente
(Decimal("1.01") ** 240)    # correto

# Para potências fracionadas (ex: 1/12), use float com cuidado ou math.pow + conversão
import math
fator = Decimal(str(math.pow(float(Decimal("1.12")), 1/12)))
```

---

## 7. Template de Script Python Financeiro

```python
"""
Template padrão para cálculos financeiros precisos.
"""
from decimal import Decimal, getcontext, ROUND_HALF_EVEN

# Configuração global
getcontext().prec = 28

DOIS_DECIMAIS = Decimal("0.01")

def arredondar(valor: Decimal) -> Decimal:
    """Arredondamento bancário para 2 casas decimais."""
    return valor.quantize(DOIS_DECIMAIS, rounding=ROUND_HALF_EVEN)

def taxa_equivalente_anual_para_mensal(i_anual: Decimal) -> Decimal:
    """Converte taxa anual efetiva para mensal equivalente (regime composto)."""
    import math
    return Decimal(str((1 + float(i_anual)) ** (1/12) - 1))

def pmt_price(pv: Decimal, i: Decimal, n: int) -> Decimal:
    """Calcula a prestação constante pelo sistema Price."""
    fator = (1 + i) ** n
    return arredondar(pv * (i * fator) / (fator - 1))

def tabela_sac(pv: Decimal, i: Decimal, n: int) -> list[dict]:
    """Gera tabela completa do SAC."""
    A = arredondar(pv / n)
    saldo = pv
    tabela = []
    for k in range(1, n + 1):
        juros = arredondar(saldo * i)
        pmt   = arredondar(A + juros)
        saldo_fim = arredondar(saldo - A)
        tabela.append({
            "periodo": k,
            "saldo_ini": saldo,
            "amortizacao": A,
            "juros": juros,
            "pmt": pmt,
            "saldo_fim": saldo_fim,
        })
        saldo = saldo_fim
    return tabela

def vpl(fluxos: list[Decimal], tma: Decimal) -> Decimal:
    """
    VPL de um fluxo de caixa.
    fluxos[0] deve ser o investimento inicial (negativo).
    """
    return sum(fc / (1 + tma) ** t for t, fc in enumerate(fluxos))

def tir(fluxos: list[Decimal], estimativa: float = 0.1) -> Decimal:
    """
    TIR pelo método Newton-Raphson.
    Convergência em até 1.000 iterações com tolerância 1e-8.
    """
    i = Decimal(str(estimativa))
    for _ in range(1000):
        f  = sum(fc / (1 + i) ** t for t, fc in enumerate(fluxos))
        df = sum(Decimal(-t) * fc / (1 + i) ** (t + 1) for t, fc in enumerate(fluxos))
        if df == 0:
            raise ValueError("Derivada zero — TIR não convergiu.")
        i_novo = i - f / df
        if abs(i_novo - i) < Decimal("1e-8"):
            return i_novo.quantize(Decimal("0.000001"))
        i = i_novo
    raise ValueError("TIR não convergiu em 1.000 iterações.")
```

---

## 8. Bibliotecas Recomendadas

| Linguagem | Biblioteca | Uso |
|---|---|---|
| Python | `decimal` (stdlib) | Aritmética decimal de precisão arbitrária |
| Python | `openpyxl` | Geração de tabelas em Excel |
| Python | `pandas` | DataFrames para análise de fluxos de caixa |
| Java | `java.math.BigDecimal` | Aritmética decimal nativa |
| JavaScript | `decimal.js` / `bignumber.js` | Precisão decimal no browser/Node |
| C# | `System.Decimal` | Tipo nativo de 128 bits para finanças |
