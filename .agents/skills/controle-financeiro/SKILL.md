---
name: controle-financeiro
description: Gerenciamento completo de finanças pessoais com criptografia de dados sensíveis. Use para registrar entradas, saídas, consultar saldo, gerar relatórios e controlar despesas por centro de custo. Suporta pagamentos únicos, parcelados e mensalidades recorrentes.
metadata:
  version: 1.0.0
  author: GueClaw System
  category: finance
  security: encrypted
---

# Controle Financeiro Pessoal

## Purpose

Esta skill permite o gerenciamento completo de finanças pessoais com **criptografia AES-256-GCM** nos campos sensíveis (valor e descrição). Todos os dados são protegidos e armazenados de forma segura no banco de dados SQLite local.

## Core Capabilities

---
### ⚠️ INSTRUÇÕES CRÍTICAS - LEIA PRIMEIRO

#### 🚫 REGRA #1: IMPORTAÇÃO CSV - NUNCA FAÇA LOOP

Quando o usuário enviar um arquivo CSV (ou pedir para importar CSV), você **DEVE**:

✅ **UMA ÚNICA** chamada `financial_operation` com `action="import_csv"`  
❌ **NUNCA** fazer loop com múltiplas chamadas `action="create"` (limite: 15 iterações)

**Exemplo correto:**
```json
{
  "action": "import_csv",
  "userId": "123456789",
  "csvData": "[{\"data\":\"31/03/2026\",\"valor\":\"198\",\"descricao\":\"Emprestimo\"}, {...}, ...]"
}
```

**Exemplo ERRADO (não faça!):**
```json
// ❌ Vai atingir limite de iterações em CSV com 17+ linhas
{"action":"create", "amount":198, ...}  // linha 1
{"action":"create", "amount":85, ...}   // linha 2
... // 15 mais → ⚠️ max iterations reached
```

**Fluxo:** CSV recebido → extractCSV() parseia → 1x import_csv → concluído ✓

---

### 1. Registrar Transações

**Adicionar Entrada (Receita):**
```
Usuario: "Registrar entrada de R$ 5000 referente a Salário no centro de custo Renda"
Usuario: "Entrou R$ 1200 de Freelance projeto X"
```

**Adicionar Saída (Despesa):**
```
Usuario: "Registrar saída de R$ 150 para Supermercado em Alimentação"
Usuario: "Paguei R$ 80 de internet no centro de custo Contas Fixas"
Usuario: "Gastei R$ 45 com uber, categoria Transporte"
```

**Pagamento Parcelado:**
```
Usuario: "Comprei um notebook de R$ 3000 parcelado em 12x no cartão, categoria Eletrônicos"
Usuario: "Paguei a parcela 3/12 do notebook"
```

**Despesa Mensal Recorrente:**
```
Usuario: "Registrar mensalidade de R$ 99 da academia, categoria Saúde"
Usuario: "Aluguel de R$ 1800 no centro de custo Moradia"
```

### 2. Consultar Saldo

```
Usuario: "Qual meu saldo atual?"
Usuario: "Quanto tenho de saldo este mês?"
Usuario: "Quanto entrou e saiu em janeiro?"
```

**Resposta do agente:**
```
💰 Saldo Atual (Janeiro/2026)

📈 Entradas: R$ 6.200,00
📉 Saídas: R$ 3.845,00
💵 Saldo: R$ 2.355,00

Status: Apenas transações realizadas
```

### 3. Listar Transações

```
Usuario: "Listar minhas últimas 10 transações"
Usuario: "Mostrar todas as saídas deste mês"
Usuario: "Quais entradas tive em fevereiro?"
```

### 4. Relatórios

**Por Centro de Custo:**
```
Usuario: "Relatório de gastos por categoria"
Usuario: "Quanto gastei em Alimentação este mês?"
```

**Resposta:**
```
📊 Gastos por Centro de Custo (Jan/2026)

1. 🏠 Moradia: R$ 1.800,00 (46,8%)
2. 🍔 Alimentação: R$ 650,00 (16,9%)
3. 🚗 Transporte: R$ 420,00 (10,9%)
4. 💳 Contas Fixas: R$ 380,00 (9,9%)
5. 🎯 Outros: R$ 595,00 (15,5%)

Total: R$ 3.845,00
```

### 5. Atualizar Status

```
Usuario: "Marcar a parcela 3/12 do notebook como paga"
Usuario: "Confirmar pagamento do aluguel de janeiro"
```

### 6. Editar/Deletar

```
Usuario: "Corrigir valor da conta de luz para R$ 95"
Usuario: "Deletar a transação de R$ 45 do uber"
```

---

## Instructions

### � REGRA CRÍTICA: IMPORTAÇÃO CSV

**QUANDO receber um CSV com múltiplas linhas (2 ou mais transações):**
- ✅ SEMPRE use `action: "import_csv"` com o parâmetro `csvData` (JSON array)
- ❌ NUNCA faça loop de `action: "create"` individual
- ⚠️ Um CSV com 17 linhas deve resultar em **UMA ÚNICA** chamada de `import_csv`, não 17 chamadas de `create`

**DETECÇÃO: Como extrair dados do CSV?**

O input virá assim:
```
Usuario: "importe esse csv"

[Attached File: fin.csv]
| data | valor | descrição | ... |
| --- | --- | --- | --- |
| 31/03/2026 | 198 | Emprestimo | ... |

[CSV_JSON_DATA]
[{"data":"31/03/2026","valor":"198","descrição":"Emprestimo"}, ...]
[/CSV_JSON_DATA]
```

**PASSOS:**
1. Identifique o marcador `[CSV_JSON_DATA]`
2. Extraia TODO o conteúdo entre `[CSV_JSON_DATA]` e `[/CSV_JSON_DATA]`
3. Passe esse JSON array como STRING no parâmetro `csvData`

**Chamada correta:**
```json
{
  "action": "import_csv",
  "userId": "8227546813",
  "csvData": "[{\"data\":\"31/03/2026\",\"valor\":\"198\",...}, ...]"
}
```
```

**NÃO faça isso:** ❌
```json
// ❌ ERRADO - vai atingir limite de iterações
{"action":"create", ...}  // linha 1
{"action":"create", ...}  // linha 2
{"action":"create", ...}  // linha 3
...
```

---

### �🔄 CONVERSAÇÃO INTERATIVA - COLETAR DADOS FALTANTES

**REGRA CRÍTICA:** Quando o usuário enviar dados incompletos, você DEVE perguntar o que está faltando ANTES de chamar a tool `financial_operation`. NUNCA invente ou assuma valores para campos obrigatórios.

#### Campos Obrigatórios para Registrar Transação

Para criar uma transação, você precisa de:

1. ✅ **Valor** (amount) - Obrigatório
2. ✅ **Descrição** (description) - Obrigatório  
3. ✅ **Centro de Custo** (costCenter) - Obrigatório
4. ✅ **Tipo** (transactionType) - Obrigatório: `entrada` ou `saida`
5. ✅ **Movimento** (movementType) - Obrigatório: `unico`, `parcela` ou `mensal`
6. ⚠️ **Parcela** (installmentInfo) - Obrigatório SE movementType = "parcela"
7. 📅 **Data** (transactionDate) - Opcional (padrão: hoje)
8. 📊 **Status** (status) - Opcional (padrão: inferir do contexto)

#### Estratégia de Coleta Interativa

Quando faltar informação:

1. **Identifique o que falta**
2. **Faça UMA pergunta objetiva**
3. **Aguarde a resposta do usuário**
4. **Complete os dados**
5. **Execute a operação**

#### Exemplos de Conversação Interativa

**Exemplo 1: Falta Valor**
```
Usuario: "Registrar saída para supermercado"

❌ ERRADO: Chamar tool com amount=0 ou inventar valor
✅ CORRETO:
Agente: "Por favor, qual foi o valor gasto no supermercado?"

Usuario: "Foi R$ 150"

Agente: [Agora chamar financial_operation com amount=150]
✅ Transação registrada com sucesso!
...
```

**Exemplo 2: Falta Centro de Custo**
```
Usuario: "Paguei R$ 80 hoje"

❌ ERRADO: Usar "Outros" automaticamente
✅ CORRETO:
Agente: "Entendido! R$ 80 registrado. Para qual categoria/centro de custo foi esse pagamento?

Sugestões: Alimentação, Transporte, Moradia, Saúde, Contas Fixas, Lazer, Educação"

Usuario: "Foi internet, coloca em Contas Fixas"

Agente: [Chamar tool com costCenter="Contas Fixas", description="Internet"]
✅ Transação registrada com sucesso!
...
```

**Exemplo 3: Falta Tipo (entrada/saída)**
```
Usuario: "Registrar R$ 1200 de freelance"

❌ ERRADO: Assumir que é entrada
✅ CORRETO (mas neste caso pode inferir):
Contexto: "freelance" geralmente é receita
Agente: [Pode assumir entrada por contexto claro]

MAS SE DUVIDOSO:
Agente: "É uma entrada (receita) ou saída (despesa)?"
```

**Exemplo 4: Falta Informação de Parcela**
```
Usuario: "Comprei um notebook de R$ 3000 parcelado"

❌ ERRADO: Criar como parcela 1/1
✅ CORRETO:
Agente: "Entendi! Notebook de R$ 3.000,00 parcelado. Em quantas vezes foi parcelado?"

Usuario: "Em 12x"

Agente: "Perfeito! E qual parcela você está pagando agora? (1ª, 2ª, 3ª...)"

Usuario: "A primeira"

Agente: [Chamar tool com installmentInfo="1/12", amount=250]
✅ Transação registrada com sucesso!
📉 SAIDA
💰 Valor: R$ 250,00 (parcela 1/12)
...
```

**Exemplo 5: Múltiplas Informações Faltando**
```
Usuario: "Registrar uma despesa"

❌ ERRADO: Pedir tudo de uma vez ou inventar
✅ CORRETO (perguntar progressivamente):
Agente: "Claro! Qual foi o valor da despesa?"

Usuario: "R$ 45"

Agente: "Ok, R$ 45 registrado. Para que foi esse gasto?"

Usuario: "Uber"

Agente: "Entendido. Em qual categoria você quer classificar? 
(Sugestões: Transporte, Alimentação, Saúde, Lazer...)"

Usuario: "Transporte"

Agente: [Agora tem tudo: amount=45, description="Uber", costCenter="Transporte", type="saida"]
✅ Transação registrada com sucesso!
...
```

**Exemplo 6: Dado Completo - Execução Direta**
```
Usuario: "Registrar saída de R$ 150 no Supermercado Extra, categoria Alimentação"

✅ COMPLETO: Tem valor (150), descrição (Supermercado Extra), categoria (Alimentação), tipo (saida)

Agente: [Chamar tool diretamente SEM perguntar nada]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 150,00
📝 Descrição: Supermercado Extra
📂 Centro de Custo: Alimentação
📅 Data: 31/03/2026
🔄 Tipo: unico
✓ Status: realizado
```

#### Inferência Inteligente (Quando Permitido)

Você PODE inferir automaticamente:

- **Status:**
  - "paguei", "comprei", "gastei" → `realizado`
  - "vou pagar", "tenho que pagar" → `nao_realizado`

- **Tipo de Transação:**
  - "recebi", "salário", "freelance", "entrada" → `entrada`
  - "paguei", "gastei", "comprei", "saída" → `saida`

- **Movimento:**
  - "parcelado", "12x", "vezes" → `parcela`
  - "mensalidade", "todo mês" → `mensal`
  - (padrão) → `unico`

- **Data:**
  - Se não mencionada → hoje
  - "ontem" → hoje - 1 dia
  - "semana passada" → 7 dias atrás
  - "dia 15" → dia 15 do mês atual

Você NÃO pode inferir:

- ❌ Valor (sempre perguntar)
- ❌ Centro de custo (sempre perguntar, EXCETO se óbvio: "salário"→Renda)
- ❌ Quantidade de parcelas (sempre perguntar)

#### Checklist Antes de Chamar Tool

Antes de executar `financial_operation` com `action="create"`, confirme:

```
✅ Tenho o valor?
✅ Tenho a descrição?
✅ Tenho o centro de custo?
✅ Sei se é entrada ou saída?
✅ Sei se é único, parcelado ou mensal?
✅ Se parcelado: tenho parcela atual/total?

SE FALTA ALGO → PERGUNTAR
SE TUDO OK → EXECUTAR
```

---

### Como Registrar Transação

O agente deve extrair as seguintes informações do texto do usuário:

1. **Valor:** Sempre em formato numérico (R$ ou não)
   - "R$ 150", "150 reais", "cento e cinquenta" → 150.00

2. **Descrição:** Texto livre explicando a transação
   - "Salário", "Supermercado Extra", "Parcela notebook", etc.

3. **Centro de Custo (Categoria):**
   - Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Contas Fixas, etc.
   - Se não especificado, usar "Outros"

4. **Tipo:** `entrada` ou `saida`
   - Palavras-chave: "recebi", "entrou", "salário" → entrada
   - Palavras-chave: "paguei", "gastei", "comprei" → saida

5. **Movimento:**
   - `unico`: Pagamento único (padrão)
   - `parcela`: Pagamento parcelado (precisa de installmentInfo)
   - `mensal`: Despesa mensal recorrente

6. **Parcela (installmentInfo):**
   - Formato: "P/T" onde P = parcela atual, T = total
   - Exemplo: "3/12" (terceira parcela de 12)
   - Apenas se movimento = "parcela"

7. **Status:** `realizado` ou `nao_realizado`
   - Se o usuário falar "paguei", "recebi" → `realizado`
   - Se falar "vou pagar", "tenho que pagar" → `nao_realizado`

8. **Data:** Se não especificada, usar hoje

### Exemplo de Implementação - Registrar Transação

```typescript
import { FinancialRepository } from '@/core/memory/financial-repository';

const financialRepo = new FinancialRepository();

// Usuário: "Paguei R$ 150 no supermercado, categoria Alimentação"
const transaction = financialRepo.create({
  userId: ctx.userId,
  transactionDate: new Date(),
  amount: 150.00,
  description: "Supermercado",
  costCenter: "Alimentação",
  transactionType: "saida",
  movementType: "unico",
  status: "realizado"
});

return `✅ Saída registrada com sucesso!

💳 Valor: R$ 150,00
📝 Descrição: Supermercado
📂 Categoria: Alimentação
📅 Data: ${new Date().toLocaleDateString('pt-BR')}
✔️ Status: Realizado`;
```

### Exemplo - Consultar Saldo

```typescript
const balance = financialRepo.getBalance(
  ctx.userId,
  startOfMonth,  // new Date(2026, 0, 1)
  endOfMonth,    // new Date(2026, 0, 31)
  true           // apenas realizadas
);

return `💰 Saldo de Janeiro/2026

📈 Entradas: R$ ${balance.entradas.toFixed(2)}
📉 Saídas: R$ ${balance.saidas.toFixed(2)}
💵 Saldo: R$ ${balance.saldo.toFixed(2)}

${balance.saldo >= 0 ? '✅ Saldo positivo' : '⚠️ Saldo negativo'}`;
```

### Exemplo - Listar Transações

```typescript
### Exemplo - Listar Transações

```typescript
const transactions = financialRepo.findMany({
  userId: ctx.userId,
  startDate: new Date(2026, 0, 1),
  transactionType: "saida"  // filtrar apenas saídas
}, 10);

let output = `📋 Últimas Saídas (${transactions.length})\n\n`;

transactions.forEach((t, idx) => {
  const statusEmoji = t.status === 'realizado' ? '✅' : '⏳';
  output += `${idx + 1}. ${statusEmoji} ${t.description}\n`;
  output += `   R$ ${t.amount.toFixed(2)} | ${t.costCenter}\n`;
  output += `   ${t.transactionDate.toLocaleDateString('pt-BR')}\n\n`;
});

return output;
```

### Exemplo - Relatório por Centro de Custo

```typescript
const report = financialRepo.getExpensesByCostCenter(
  ctx.userId,
  startOfMonth,
  endOfMonth
);

const total = report.reduce((sum, item) => sum + item.total, 0);

let output = `📊 Gastos por Categoria (Janeiro/2026)\n\n`;

report.forEach((item, idx) => {
  const percentage = ((item.total / total) * 100).toFixed(1);
  output += `${idx + 1}. ${item.costCenter}: R$ ${item.total.toFixed(2)} (${percentage}%)\n`;
});

output += `\nTotal: R$ ${total.toFixed(2)}`;
return output;
```

---

## uso da Tool financial_operation

O GueClaw possui uma tool chamada `financial_operation` que executa todas as operações financeiras. Use-a assim:

### Criar Entrada

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "create",
    "userId": "8227546813",
    "data": {
      "transactionDate": "2026-03-31",
      "amount": 5000,
      "description": "Salário março",
      "costCenter": "Renda",
      "transactionType": "entrada",
      "movementType": "unico",
      "status": "realizado"
    }
  }
}
```

### Criar Saída

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "create",
    "userId": "8227546813",
    "data": {
      "transactionDate": "2026-03-15",
      "amount": 150,
      "description": "Supermercado Extra",
      "costCenter": "Alimentação",
      "transactionType": "saida",
      "movementType": "unico",
      "status": "realizado"
    }
  }
}
```

### Criar Parcelado

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "create",
    "userId": "8227546813",
    "data": {
      "transactionDate": "2026-03-10",
      "amount": 250,
      "description": "Notebook Dell - parcela",
      "costCenter": "Eletrônicos",
      "transactionType": "saida",
      "movementType": "parcela",
      "installmentInfo": "1/12",
      "status": "realizado"
    }
  }
}
```

### Consultar Saldo

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "balance",
    "userId": "8227546813",
    "filters": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-31"
    }
  }
}
```

### Listar Transações

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "list",
    "userId": "8227546813",
    "filters": {
      "transactionType": "saida",
      "status": "realizado"
    },
    "limit": 10
  }
}
```

### Relatório por Centro de Custo

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "report_by_cost_center",
    "userId": "8227546813",
    "filters": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-31"
    }
  }
}
```

### Atualizar Status

```json
{
  "tool": "financial_operation",
  "args": {
    "action": "update_status",
    "userId": "8227546813",
    "transactionId": "uuid-da-transacao",
    "newStatus": "realizado"
  }
}
```

---

## Patterns de Resposta

### Quando o usuário pede para registrar

1. **Extrair informações do texto**
2. **Chamar financial_operation com action="create"**
3. **Confirmar com mensagem formatada**

Exemplo:
```
Usuario: "Paguei R$ 80 de internet hoje"

Agente pensa:
- Valor: 80
- Descrição: "Internet"
- Centro de Custo: "Contas Fixas"
- Tipo: saida (palavra "paguei")
- Movimento: unico
- Status: realizado (palavra "paguei" = passado)

Chama: financial_operation com action="create"

Responde: 
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 80,00
📝 Descrição: Internet
📂 Centro de Custo: Contas Fixas
📅 Data: 31/03/2026
🔄 Tipo: unico
✓ Status: realizado
```

### Quando o usuário pede saldo

1. **Identificar período (se mencionado)**
2. **Chamar financial_operation com action="balance"**
3. **Retornar resumo formatado**

### Quando o usuário pede relatório

1. **Chamar financial_operation com action="report_by_cost_center"**
2. **Retornar lista formatada com percentuais**

---

## Security Note

⚠️ **IMPORTANTE:** Todos os campos sensíveis (amount e description) são **automaticamente criptografados** com AES-256-GCM antes de serem salvos no banco. O usuário não precisa se preocupar com isso - a criptografia é transparente.

A chave de criptografia está em `DATABASE_ENCRYPTION_KEY` no arquivo `.env` e **NUNCA deve ser commitada** no Git.

---

## Tips & Best Practices

1. **Sempre confirme a operação:** Mostre os detalhes da transação após registrar
2. **Use emojis:** Deixe as respostas mais visuais (📈 entrada, 📉 saída, ✅ realizado)
3. **Categorias consistentes:** Sugira categorias padrão quando o usuário não especificar
4. **Datas inteligentes:** "ontem", "semana passada", "mês passado" devem ser convertidas
5. **Parcelas:** Sempre pergunte quantas parcelas quando identificar parcelamento
6. **Status implícito:** "paguei" = realizado, "vou pagar" = nao_realizado

---

## Example Conversations

### Exemplo 1: Registrar Salário
```
Usuario: Recebi meu salário de R$ 5.000 hoje

Agente:
✅ Transação registrada com sucesso!

📈 ENTRADA
💰 Valor: R$ 5.000,00
📝 Descrição: Salário
📂 Centro de Custo: Renda
📅 Data: 31/03/2026
🔄 Tipo: unico
✓ Status: realizado

ID: abc123...
```

### Exemplo 2: Registrar Conta Parcelada
```
Usuario: Comprei um celular de R$ 2400 parcelado em 10x

Agente:
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 240,00
📝 Descrição: Celular - parcela
📂 Centro de Custo: Eletrônicos
📅 Data: 31/03/2026
🔄 Tipo: parcela (1/10)
✓ Status: realizado

ID: def456...

💡 Lembre-se de registrar as próximas parcelas mensalmente!
```

### Exemplo 3: Consultar Saldo
```
Usuario: Qual meu saldo deste mês?

Agente:
💰 Saldo Financeiro

Período: 01/03/2026 a 31/03/2026

📈 Entradas: R$ 5.000,00
📉 Saídas: R$ 2.845,00
━━━━━━━━━━━━━━━━━━━━━━━
💵 Saldo: R$ 2.155,00

✅ Saldo positivo
(Apenas transações realizadas)
```

### Exemplo 4: Relatório de Gastos
```
Usuario: Relatório de gastos por categoria este mês

Agente:
📊 Gastos por Centro de Custo

1. Moradia
   R$ 1.800,00 (63,3%)

2. Alimentação
   R$ 450,00 (15,8%)

3. Transporte
   R$ 320,00 (11,2%)

4. Eletrônicos
   R$ 240,00 (8,4%)

5. Contas Fixas
   R$ 35,00 (1,2%)

━━━━━━━━━━━━━━━━━━━━━━━
Total: R$ 2.845,00
```

---

## 🎯 Exemplos Avançados de Conversação Interativa

### 📊 Importação em Lote via CSV

O bot **aceita arquivos CSV** para importar múltiplas transações de uma vez.

#### Formato CSV Esperado

**Colunas obrigatórias:**
- `data` ou `date` → Data no formato YYYY-MM-DD ou DD/MM/YYYY
- `valor` ou `amount` → Valor numérico (use . para decimais)
- `descricao` ou `description` → Descrição da transação
- `categoria` ou `cost_center` → Centro de custo
- `tipo` ou `type` → "entrada" ou "saida"

**Colunas opcionais:**
- `movimento` ou `movement` → "unico", "parcela", "mensal" (padrão: unico)
- `parcela` ou `installment` → Ex: "1/12"
- `status` → "realizado" ou "nao_realizado" (padrão: realizado)

#### Exemplo de CSV Válido

```csv
data,valor,descricao,categoria,tipo,movimento,parcela,status
2026-03-31,5000,Salário março,Renda,entrada,unico,,realizado
2026-03-15,150.50,Supermercado Extra,Alimentação,saida,unico,,realizado
2026-03-10,240,Notebook Dell,Eletrônicos,saida,parcela,1/12,realizado
2026-03-20,80,Conta de luz,Contas Fixas,saida,unico,,realizado
2026-03-25,99,Academia,Saúde,saida,mensal,,realizado
2026-03-28,45.80,Uber,Transporte,saida,unico,,realizado
```

#### Como o Bot Processa CSV

**Passo 1: Enviar o arquivo**
```
Usuario: [Anexa arquivo transacoes.csv no Telegram]

Bot: "📊 Recebi um CSV com 6 linhas!

Analisando colunas encontradas:
✅ data
✅ valor
✅ descricao
✅ categoria
✅ tipo
✅ movimento
✅ parcela
✅ status

Encontrei 6 transações. Deseja importar todas?"
```

**Passo 2: Confirmação**
```
Usuario: "Sim, importa"

Bot: [Processa linha por linha]
📈 1/6: Salário março - R$ 5.000,00 ✅
📉 2/6: Supermercado Extra - R$ 150,50 ✅
📉 3/6: Notebook Dell (1/12) - R$ 240,00 ✅
📉 4/6: Conta de luz - R$ 80,00 ✅
📉 5/6: Academia (mensal) - R$ 99,00 ✅
📉 6/6: Uber - R$ 45,80 ✅

✅ Importação concluída!

📊 Resumo:
📈 Entradas: R$ 5.000,00 (1 transação)
📉 Saídas: R$ 615,30 (5 transações)
💵 Saldo líquido: +R$ 4.384,70
```

#### Validação Automática

O bot verifica automaticamente:

1. **Colunas obrigatórias presentes?**
   - Se faltar alguma coluna crítica, avisa antes de importar

2. **Valores numéricos válidos?**
   - Ignora linhas com valores inválidos (avisa quais)

3. **Datas no formato correto?**
   - Aceita: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY

4. **Tipos válidos?**
   - Só aceita "entrada" ou "saida"

#### Exemplo de CSV com Erro

```
Usuario: [Envia CSV com coluna "valor" faltando]

Bot: "❌ Erro no CSV: Coluna obrigatória 'valor' não encontrada.

Colunas encontradas: data, descricao, categoria, tipo

Por favor, adicione a coluna 'valor' ou 'amount' e envie novamente."

[NÃO importa nada até o CSV estar correto]
```

#### Exemplo de Linhas Parcialmente Inválidas

```csv
data,valor,descricao,categoria,tipo
2026-03-31,5000,Salário,Renda,entrada
2026-03-15,ABC,Supermercado,Alimentação,saida
2026-03-10,150,Internet,Contas Fixas,saida
```

```
Bot: "⚠️ Encontrei 1 linha com erro:

❌ Linha 2: valor 'ABC' inválido (deve ser número)

✅ 2 transações válidas encontradas.

Deseja importar apenas as válidas e ignorar a linha com erro?"

Usuario: "Sim"

Bot: [Importa as 2 válidas]
✅ 2 transações importadas com sucesso!
⚠️ 1 linha ignorada por erro.
```

#### Template CSV para Download

O bot pode gerar um template vazio:

```
Usuario: "Me envia um template de CSV para importar transações"

Bot: [Gera e envia arquivo template-financeiro.csv]
"📥 Template CSV para importação:

Preencha as colunas e me envie de volta!

Colunas obrigatórias:
• data (YYYY-MM-DD)
• valor (número)
• descricao (texto)
• categoria (texto)
• tipo (entrada/saida)

Colunas opcionais:
• movimento (unico/parcela/mensal)
• parcela (ex: 1/12)
• status (realizado/nao_realizado)"
```

#### CSV Alternativo - Formato Excel Brasileiro

Também aceita formato com `;` e vírgula para decimais:

```csv
data;valor;descricao;categoria;tipo
31/03/2026;5000,00;Salário;Renda;entrada
15/03/2026;150,50;Supermercado;Alimentação;saida
```

O bot detecta automaticamente e converte!

#### Exportar para CSV

O bot também pode exportar transações para CSV:

```
Usuario: "Exportar minhas transações de março em CSV"

Bot: [Gera arquivo marco-2026.csv e envia]
"📤 Arquivo gerado: marco-2026.csv

📊 Contém 24 transações do período:
📅 01/03/2026 a 31/03/2026

Você pode editar no Excel e reimportar se precisar!"
```

---

### Cenário 1: Usuário Envia Apenas Valor

```
Usuario: "150"

Agente: "Anotado R$ 150,00! Para que foi esse gasto?"

Usuario: "Supermercado"

Agente: "Perfeito! Em qual categoria você quer classificar essa despesa?

Sugestões:
🍔 Alimentação
🏠 Moradia  
🚗 Transporte
💊 Saúde
💳 Contas Fixas
🎮 Lazer"

Usuario: "Alimentação"

Agente: [Chamar tool com todos os dados]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 150,00
📝 Descrição: Supermercado
📂 Centro de Custo: Alimentação
📅 Data: 31/03/2026
✓ Status: realizado
```

### Cenário 2: Parcelamento Sem Informação Completa

```
Usuario: "Comprei um celular parcelado"

Agente: "Registrado compra de celular parcelado! Qual foi o valor total?"

Usuario: "2400"

Agente: "R$ 2.400,00. Em quantas vezes foi parcelado?"

Usuario: "10x"

Agente: "Perfeito! Você está pagando qual parcela agora?"

Usuario: "A primeira"

Agente: [Chamar tool: amount=240, installmentInfo="1/10"]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 240,00
📝 Descrição: Celular - parcela
📂 Centro de Custo: Eletrônicos
📅 Data: 31/03/2026
🔄 Tipo: parcela (1/10)
✓ Status: realizado

💡 Lembre-se de registrar as próximas 9 parcelas!
```

### Cenário 3: Descrição Ambígua

```
Usuario: "Paguei uma conta de 120"

Agente: "Registrado pagamento de R$ 120,00. Qual conta foi essa?"

Usuario: "Luz"

Agente: "Ok! Conta de luz. Em qual categoria quer registrar?"

Usuario: "Contas Fixas"

Agente: [Chamar tool]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 120,00
📝 Descrição: Conta de luz
📂 Centro de Custo: Contas Fixas
📅 Data: 31/03/2026
✓ Status: realizado
```

### Cenário 4: Entrada de Receita Incompleta

```
Usuario: "Recebi dinheiro"

Agente: "Legal! Quanto você recebeu?"

Usuario: "1200"

Agente: "R$ 1.200,00 recebido! De onde veio esse dinheiro? (Salário, Freelance, Bônus...)"

Usuario: "Freelance de um projeto"

Agente: "Ótimo! Vou classificar como Renda. Pode confirmar a categoria ou sugerir outra?"

Usuario: "Pode deixar Renda mesmo"

Agente: [Chamar tool]
✅ Transação registrada com sucesso!

📈 ENTRADA
💰 Valor: R$ 1.200,00
📝 Descrição: Freelance de um projeto
📂 Centro de Custo: Renda
📅 Data: 31/03/2026
✓ Status: realizado
```

### Cenário 5: Mensalidade Recorrente

```
Usuario: "Academia"

Agente: "Entendi! Qual o valor da academia?"

Usuario: "99 por mês"

Agente: "R$ 99,00 mensais. Você já pagou este mês ou vai pagar?"

Usuario: "Já paguei"

Agente: [Chamar tool com movementType="mensal", status="realizado"]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 99,00
📝 Descrição: Academia
📂 Centro de Custo: Saúde
📅 Data: 31/03/2026
🔄 Tipo: mensal (recorrente)
✓ Status: realizado

📅 Essa é uma despesa recorrente. Lembre de registrar novamente mês que vem!
```

### Cenário 6: Contexto de Conversa - Lembrar Informações

```
Usuario: "Registra uma saída de 80 reais"

Agente: "Anotado R$ 80,00 de saída! Para que foi?"

Usuario: "Internet"

Agente: "Entendido, internet. Categoria?"

Usuario: "A mesma do mês passado"

Agente: [Buscar última transação de "Internet" → era "Contas Fixas"]
"Encontrei! Mês passado foi 'Contas Fixas'. Vou usar a mesma categoria, ok?"

Usuario: "Sim"

Agente: [Chamar tool]
✅ Transação registrada com sucesso!
...
```

### Cenário 7: Múltiplas Transações Sequenciais

```
Usuario: "Vou registrar várias compras"

Agente: "Perfeito! Me fale cada uma e eu vou registrando."

Usuario: "Supermercado 150"

Agente: [Chamar tool]
✅ R$ 150,00 - Supermercado (Alimentação) registrado!

Usuario: "Uber 45"

Agente: [Chamar tool]
✅ R$ 45,00 - Uber (Transporte) registrado!

Usuario: "Farmácia 80"

Agente: [Chamar tool]
✅ R$ 80,00 - Farmácia (Saúde) registrado!

Usuario: "Pronto"

Agente: "Tudo certo! 3 transações registradas:
📉 Total de saídas: R$ 275,00
📊 Alimentação: R$ 150,00
🚗 Transporte: R$ 45,00
💊 Saúde: R$ 80,00"
```

### Cenário 8: Correção Durante a Conversa

```
Usuario: "Paguei 150 no supermercado"

Agente: [Iniciando coleta...]
"Supermercado - R$ 150,00. Confirma a categoria Alimentação?"

Usuario: "Na verdade foram 180, não 150"

Agente: "Corrigido para R$ 180,00! Confirma Alimentação?"

Usuario: "Sim"

Agente: [Chamar tool com amount=180]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 180,00
...
```

### Cenário 9: Negação e Cancelamento

```
Usuario: "Registrar uma despesa"

Agente: "Claro! Qual o valor?"

Usuario: "Esquece, depois eu registro"

Agente: "Sem problemas! Quando quiser registrar é só me avisar. 😊"

[NÃO chamar tool, NÃO insistir]
```

### Cenário 10: Dados Completos na Primeira Mensagem

```
Usuario: "Registrar saída de R$ 1.800,00 de aluguel na categoria Moradia, pago dia 05/03"

Agente: [TODOS os dados presentes, executar IMEDIATAMENTE]
✅ Transação registrada com sucesso!

📉 SAIDA
💰 Valor: R$ 1.800,00
📝 Descrição: Aluguel
📂 Centro de Custo: Moradia
📅 Data: 05/03/2026
🔄 Tipo: unico
✓ Status: realizado

ID: xyz789...
```

---

## 🎓 Regras de Ouro da Conversação

1. **NUNCA invente dados** - Se não tem a informação, PERGUNTE
2. **Uma pergunta por vez** - Não sobrecarregue o usuário
3. **Confirme dados importantes** - Especialmente valores altos
4. **Seja contextual** - Lembre informações de transações anteriores
5. **Ofereça sugestões** - Liste categorias, facilite a escolha
6. **Infira quando óbvio** - "paguei" = realizado, "salário" = entrada
7. **Confirme antes de executar** - Em caso de dúvida
8. **Use linguagem natural** - Não seja robótico
9. **Dê feedback visual** - Use emojis e formatação
10. **Respeite cancelamentos** - Se usuário desistir, não insista

---

## Troubleshooting

### Se a transação não for criada:
- Verifique se DATABASE_ENCRYPTION_KEY está configurado no .env
- Confirme que o banco de dados foi inicializado
- Verifique os logs para erros de criptografia

### Se os valores forem descriptografados incorretamente:
- A chave de criptografia pode ter sido alterada
- Restaure do backup com a chave original

### Se o usuário perguntar sobre segurança:
- Explique que os valores e descrições são criptografados com AES-256-GCM
- Ninguém consegue ler o banco de dados sem a chave
- A chave está protegida em arquivo .env com permissões restritivas

---

**Versão:** 1.0.0  
**Última Atualização:** 31/03/2026  
**Autor:** GueClaw System

let response = "📋 Últimas 10 Saídas:\n\n";

for (const t of transactions) {
  const icon = t.status === 'realizado' ? '✅' : '⏳';
  const type = t.transactionType === 'saida' ? '📉' : '📈';
  
  response += `${icon} ${type} R$ ${t.amount.toFixed(2)} - ${t.description}\n`;
  response += `   📂 ${t.costCenter} | 📅 ${t.transactionDate.toLocaleDateString('pt-BR')}\n`;
  
  if (t.installmentInfo) {
    response += `   🔢 Parcela: ${t.installmentInfo}\n`;
  }
  
  response += `\n`;
}

return response;
```

### Exemplo - Relatório por Centro de Custo

```typescript
const expenses = financialRepo.getExpensesByCostCenter(
  ctx.userId,
  startOfMonth,
  endOfMonth
);

let response = "📊 Gastos por Centro de Custo (Janeiro/2026)\n\n";

const total = expenses.reduce((sum, e) => sum + e.total, 0);

expenses.forEach((expense, index) => {
  const percentage = (expense.total / total) * 100;
  const icon = getCostCenterIcon(expense.costCenter);
  
  response += `${index + 1}. ${icon} ${expense.costCenter}: `;
  response += `R$ ${expense.total.toFixed(2)} (${percentage.toFixed(1)}%)\n`;
});

response += `\n💰 Total: R$ ${total.toFixed(2)}`;

return response;

function getCostCenterIcon(costCenter: string): string {
  const icons: Record<string, string> = {
    'Moradia': '🏠',
    'Alimentação': '🍔',
    'Transporte': '🚗',
    'Saúde': '💊',
    'Educação': '📚',
    'Lazer': '🎮',
    'Contas Fixas': '💳',
    'Eletrônicos': '💻',
    'Outros': '🎯'
  };
  return icons[costCenter] || '📂';
}
```

---

## Best Practices

### 1. Sempre use criptografia
Os campos `amount` e `description` são **automaticamente criptografados** pelo `FinancialRepository`. Nunca armazene valores em texto plano.

### 2. Validação de entrada
Sempre valide:
- Valor numérico positivo
- Data válida
- Centro de custo não vazio
- Formato de parcela correto (ex: "3/12")

### 3. Centros de custo sugeridos
Para consistência, sugira essas categorias ao usuário:
- 🏠 Moradia (aluguel, condomínio, IPTU)
- 🍔 Alimentação (supermercado, restaurantes)
- 🚗 Transporte (combustível, uber, ônibus)
- 💊 Saúde (remédios, plano de saúde, consultas)
- 📚 Educação (cursos, livros, mensalidades)
- 🎮 Lazer (cinema, viagens, hobbies)
- 💳 Contas Fixas (internet, celular, energia, água)
- 💻 Eletrônicos (compras de tecnologia)
- 👔 Vestuário (roupas, sapatos)
- 🎯 Outros

### 4. Linguagem Natural
O agente deve entender linguagem natural:
- "paguei 150 no mercado" → saida, realizado
- "vou pagar 80 de internet" → saida, nao_realizado
- "recebi meu salário de 5000" → entrada, realizado
- "comprei parcelado em 12x" → movimento = parcela

### 5. Confirmação Clara
Sempre confirme a operação com detalhes:
```
✅ Despesa registrada!

💳 R$ 150,00
📝 Supermercado Extra
📂 Alimentação
📅 31/03/2026
✔️ Realizado
```

### 6. Alertas de Gastos
Se o usuário ultrapassar limites (opcional para futuro):
```
⚠️ ATENÇÃO: Você gastou R$ 2.500,00 em Alimentação este mês.
Isso representa 40% do seu orçamento total.
```

---

## Security

### Dados Criptografados
- ✅ **amount** → AES-256-GCM (valor sempre sensível)
- ✅ **description** → AES-256-GCM (pode conter informações pessoais)

### Dados em Texto Plano
- ⚠️ **cost_center** → Para permitir agregação/relatórios
- ⚠️ **transaction_type, movement_type, status** → Metadados de controle

### Compliance LGPD
- 🔐 Campos sensíveis criptografados
- 🗑️ Usuário pode deletar transações a qualquer momento
- 📊 Dados ficam apenas no banco local (não são enviados para APIs externas)

---

## Error Handling

### Valor Inválido
```
Usuario: "gastei vinte mil na loja"
Agente: "⚠️ O valor informado (R$ 20.000,00) parece muito alto. Confirma?"
```

### Data Futura
```
Usuario: "registrar despesa para 2030"
Agente: "⚠️ A data está no futuro. Deseja registrar mesmo assim ou usar a data de hoje?"
```

### Centro de Custo Desconhecido
```
Usuario: "gastei 50 em xpto"
Agente: "📂 Centro de custo 'xpto' não reconhecido. Sugestões:
• Outros
• Lazer
• Alimentação

Qual prefere, ou quer criar um novo?"
```

---

## Examples

### Exemplo Completo 1 - Salário

**Usuário:** "Recebi meu salário de R$ 5.800 hoje"

**Agente:**
```
✅ Entrada registrada com sucesso!

📈 Valor: R$ 5.800,00
📝 Descrição: Salário
📂 Categoria: Renda
📅 Data: 31/03/2026
✔️ Status: Realizado

💰 Seu saldo do mês aumentou para R$ 3.250,00
```

### Exemplo Completo 2 - Compra Parcelada

**Usuário:** "Comprei um iPhone de R$ 6.000 parcelado em 10x"

**Agente:**
```
✅ Compra parcelada registrada!

💳 Valor total: R$ 6.000,00
📝 Descrição: iPhone
📂 Categoria: Eletrônicos
🔢 Parcelamento: 10x de R$ 600,00
📅 Data: 31/03/2026
⏳ Status: Não realizado (primeira parcela)

Deseja registrar o pagamento da parcela 1/10?
```

**Usuário:** "Sim, paguei a primeira parcela"

**Agente:**
```
✅ Parcela 1/10 marcada como paga!

💳 R$ 600,00
📝 iPhone (Parcela 1/10)
📂 Eletrônicos
✔️ Realizado

Faltam 9 parcelas de R$ 600,00
```

### Exemplo Completo 3 - Relatório Mensal

**Usuário:** "Quero um relatório completo de março"

**Agente:**
```
📊 RELATÓRIO FINANCEIRO - MARÇO/2026

💰 RESUMO GERAL
━━━━━━━━━━━━━━━━━━
📈 Entradas: R$ 5.800,00
📉 Saídas: R$ 3.450,00
💵 Saldo: R$ 2.350,00

📊 GASTOS POR CATEGORIA
━━━━━━━━━━━━━━━━━━
1. 🏠 Moradia: R$ 1.800,00 (52,2%)
2. 🍔 Alimentação: R$ 680,00 (19,7%)
3. 💳 Contas Fixas: R$ 420,00 (12,2%)
4. 🚗 Transporte: R$ 310,00 (9,0%)
5. 💊 Saúde: R$ 150,00 (4,3%)
6. 🎮 Lazer: R$ 90,00 (2,6%)

🔢 ESTATÍSTICAS
━━━━━━━━━━━━━━━━━━
• Total de transações: 18
• Média por saída: R$ 191,67
• Maior saída: R$ 1.800,00 (Aluguel)
• Transações pendentes: 2 (R$ 145,00)

✅ Balanço positivo! Você economizou R$ 2.350,00 neste mês.
```

---

## Future Enhancements

1. **Orçamento por Categoria:** Definir limites mensais
2. **Metas de Economia:** "Quero economizar R$ 1000 este mês"
3. **Previsão de Gastos:** Baseado em histórico
4. **Exportar Relatórios:** CSV, Excel, PDF
5. **Gráficos:** Evolução do saldo ao longo do tempo
6. **Alertas Inteligentes:** "Você gastou 80% do orçamento de Alimentação"
7. **Sincronização:** Backup na nuvem (criptografado)

---

**Versão:** 1.0.0  
**Última atualização:** 31/03/2026  
**Segurança:** ✅ Criptografia AES-256-GCM ativa
