# n8n — Padrões de Workflow e Boas Práticas

Padrões recorrentes, receitas prontas e boas práticas para automações n8n.

---

## Padrões de Trigger

### Receber webhook e responder imediatamente
```
[Webhook] → [processar] → [Respond to Webhook]
```
- Webhook: `Respond: Using 'Respond to Webhook' Node`
- Respond to Webhook: `Response Code: 200`, Body: resultado processado

### Trigger por agendamento
```
[Schedule Trigger] → [buscar dados] → [processar] → [salvar]
```
Bom para: sincronizações periódicas, relatórios, limpezas

### Trigger manual para testes
Use **Manual Trigger** + **Pin Data** nos nodes:
- Clique direito no node → "Pin Data"
- Cole o JSON de teste
- O node usará esse dado sem chamar a API real

---

## Padrões de Branching

### IF simples
```
[Input] → [IF: condição] → [TRUE: ação A]
                         ↘ [FALSE: ação B]
```

### Múltiplos estados com Switch
```
[Input] → [Switch: $json.status] → [Output 0: "novo"]
                                 → [Output 1: "ativo"]
                                 → [Output 2: "cancelado"]
                                 → [Output 3: fallback]
```

### Filtrar e processar só o que interessa
```
[Input] → [Filter: condição] → [processamento]
(items fora da condição são descartados silenciosamente)
```

### Try/Catch manual
```
[Node com erro possível]
  ↓ (continue on error: true)
[IF: $json.error exists]
  → TRUE: [tratar erro]
  → FALSE: [continuar fluxo normal]
```

---

## Padrões de Loop

### Processar lista em lotes (Split In Batches)
```
[Array de items] → [Split In Batches: size=10] → [HTTP Request]
                          ↑__________________________|
                    (conecta saída de volta ao Split)
                    (executa até esgotar todos os items)
```
**Importante:** conecte a saída do último node de volta ao **Split In Batches** para ele continuar o loop.

### Iterar sobre campo lista dentro de um item
```
[Item com { contacts: [...] }] → [Loop Over Items: $json.contacts]
                                    → [processar cada contato]
```

### Paginação de API
```
[Set: page=0] → [HTTP Request: ?page={{ $json.page }}]
                    ↓
               [IF: $json.hasNextPage]
                    → TRUE: [Set: page+1] → [HTTP Request] (loop)
                    → FALSE: [Merge: Append] → [continuar]
```

---

## Padrões de Merge / Combinar Dados

### Juntar todos os items de dois branches
```
[Branch A] → [Merge: Append] → [resultado combinado]
[Branch B] ↗
```

### Enriquecer dados fazendo join por chave
```
[Contatos] → [Merge: Combine by Key (id)] → [contatos enriquecidos]
[Dados Extra] ↗
Key Field Input 1: id
Key Field Input 2: contactId
Join: Left (mantém todos os contatos mesmo sem match)
```

### Aguardar dois branches independentes
```
[Trigger] → [operação A] → [Merge: Combine by Position]
          ↘ [operação B] ↗
(Merge aguarda automaticamente os dois branches)
```

---

## Padrões de Transformação

### Mapear e renomear campos
```javascript
// Code node — renomear e transformar
return $input.all().map(item => ({
  json: {
    id: item.json.contactId,
    nome: `${item.json.first_name} ${item.json.last_name}`,
    email: item.json.emailAddress?.toLowerCase(),
    ativo: item.json.status === 'active',
  }
}));
```

### Agrupar items por campo
```javascript
// Code node — agrupar por categoria
const grupos = {};

for (const item of $input.all()) {
  const chave = item.json.categoria;
  if (!grupos[chave]) grupos[chave] = [];
  grupos[chave].push(item.json);
}

return Object.entries(grupos).map(([categoria, itens]) => ({
  json: { categoria, itens, total: itens.length }
}));
```

### Flatten de array aninhado
```javascript
// Code node — achatar lista aninhada
const todos = [];
for (const item of $input.all()) {
  for (const sub of item.json.itens ?? []) {
    todos.push({ json: { ...sub, parentId: item.json.id } });
  }
}
return todos;
```

### Deduplicar por campo
```javascript
// Code node — remover duplicatas por email
const seen = new Set();
return $input.all().filter(item => {
  const key = item.json.email;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

---

## Padrões de API

### Chamar API com retry automático
Use o HTTP Request com:
```
Options → Retry On Fail: true
Maximum Tries: 3
Wait Between Tries: 1000 (ms)
```

### Chamar API com rate limit respeitado
```
Options → Batching:
  Request Interval: 500 (ms entre requests)
  Batch Size: 10
```

### Autenticação Bearer Token dinâmica
No HTTP Request:
```
Authentication: Generic Credential Type
Credential Type: Header Auth
Name: Authorization
Value: Bearer {{ $vars.API_TOKEN }}
```

### Pegar token OAuth antes de chamar API
```
[HTTP Request: POST /oauth/token] → [Set: access_token] → [HTTP Request API]
                                        extrair $json.access_token
```

---

## Padrões de Datos / Storage

### Passar dados entre sub-workflows
```
Workflow pai:
[Execute Workflow] 
  Input: { id: $json.contactId, dados: $json }
  
Workflow filho:
[Execute Workflow Trigger] → acessa via $json.id, $json.dados
```

### Guardar estado entre execuções (Redis)
```javascript
// Salvar último ID processado
// Node: Redis → Set
// Key: "ultimo_id_processado"
// Value: {{ $json.id }}

// Ler na próxima execução
// Node: Redis → Get
// Key: "ultimo_id_processado"
// Resultado: $json.value
```

### Usar Google Sheets como banco simples
```
[Read Rows] → (buscar dados existentes)
[processar] 
[Append Row] → (adicionar novos)
[Update Row] → (atualizar existentes)
```
Para update: use número da linha (enable `Row Number` nas opções do Read).

---

## Padrões de Notificação

### Notificar no Telegram ao finalizar
```
[workflow] → [Telegram: Send Message]
               Chat ID: {{ $vars.ADMIN_CHAT_ID }}
               Text: ✅ Workflow concluído: {{ $json.total }} itens processados
```

### Alertar em caso de erro
```
Error Trigger Workflow separado:
[Error Trigger] → [Telegram: Send Message]
                   Text: ❌ ERRO em {{ $json.workflow.name }}
                         Execução: {{ $json.execution.url }}
                         Erro: {{ $json.error.message }}
```

---

## Padrões de Estrutura de Workflow

### Workflow principal + sub-workflows
```
workflow-principal/
  [Trigger]
  [Validar input]
  [Execute Workflow: processar-contato]
  [Execute Workflow: salvar-resultado]
  [Notificar]

workflow-processar-contato/
  [Execute Workflow Trigger]
  [lógica de processamento]
  [Return result]
```

### Naming convention para nodes
```
GET   → "GET Contatos GHL"
POST  → "POST Criar Contato"
SET   → "SET Formatar Dados"
IF    → "IF Contato Existe?"
LOOP  → "LOOP Processar Lotes"
ERRO  → "ERRO Notificar Admin"
SUB   → "SUB Enriquecer Lead"
```

---

## Expressões Avançadas

### Formatação de datas com Luxon
```javascript
{{ $now.toFormat("dd/MM/yyyy") }}
{{ $now.toFormat("yyyy-MM-dd'T'HH:mm:ss") }}
{{ $now.setZone("America/Sao_Paulo").toFormat("HH:mm") }}
{{ $now.minus({ days: 7 }).toISO() }}
{{ DateTime.fromISO($json.data).toFormat("dd/MM/yyyy") }}
{{ DateTime.fromMillis($json.timestamp).toFormat("dd/MM/yyyy HH:mm") }}
```

### Operações com strings
```javascript
{{ $json.nome.trim().toLowerCase() }}
{{ $json.texto.replace(/\n/g, ' ') }}
{{ $json.cpf.replace(/\D/g, '') }}
{{ $json.descricao.substring(0, 100) + '...' }}
{{ $json.tags.join(', ') }}
{{ $json.nome.split(' ')[0] }}    // primeiro nome
```

### Condicionais inline
```javascript
{{ $json.valor > 0 ? $json.valor : 0 }}
{{ $json.nome ?? 'Sem nome' }}
{{ $json.ativo ? 'Sim' : 'Não' }}
{{ $json.lista?.length > 0 ? $json.lista[0] : null }}
```

### Regex em expressões
```javascript
{{ $json.email.match(/^[^@]+@[^@]+\.[^@]+$/) ? 'válido' : 'inválido' }}
{{ $json.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') }}
```

### Construção de objetos/arrays
```javascript
{{ { id: $json.id, nome: $json.nome } }}
{{ [$json.item1, $json.item2, $json.item3].filter(x => x) }}
{{ Object.keys($json) }}
{{ Object.entries($json).map(([k, v]) => k + '=' + v).join('&') }}
```

---

## Debugging e Troubleshooting

### O node não encontra os dados
1. Verifique o caminho: execute o node anterior e inspecione a saída
2. Use `$json` em Set node para ver a estrutura completa
3. Dados de outro node: use `$('Nome do Node').first().json`
4. Se vier array aninhado: `$json.data[0].campo` ou use Loop Over Items

### Workflow para na metade sem erro visível
1. Verifique se não tem `Continue On Error` + branches desconectados
2. Inspecione a aba "Debug" da execução
3. Node IF com FALSE sem conexão descarta silenciosamente os items

### HTTP Request retorna erro 401/403
1. Verifique o formato do header: `Authorization: Bearer TOKEN` (com espaço depois de Bearer)
2. Token expirado? Adicione lógica de refresh
3. Wrong base URL? Verifique o endpoint

### "Cannot read properties of undefined"
```javascript
// Problema: $json.obj.campo quando obj pode ser undefined
// Solução: optional chaining
$json.obj?.campo ?? 'default'
```

### Itens sumindo entre nodes
Causas comuns:
- `Filter` descartando items (verifique a condição)
- `IF` com branch não conectado
- `Split In Batches` com loop não fechado
- Node com `Continue On Error: false` (padrão) abortando tudo

---

## JSON de Workflow — Estrutura Completa

```json
{
  "name": "Nome do Workflow",
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "saveDataSuccessExecution": "all",
    "saveDataErrorExecution": "all",
    "saveExecutionProgress": true,
    "errorWorkflow": "idDoWorkflowDeErro"
  },
  "tags": [{ "name": "producao" }],
  "nodes": [
    {
      "id": "node-uuid-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "parameters": {
        "path": "meu-path",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "id": "node-uuid-2",
      "name": "Processar",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300],
      "parameters": {
        "jsCode": "return $input.all().map(i => ({ json: i.json }));"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Processar", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

**Dicas para o JSON:**
- `id` dos nodes: qualquer UUID único (use `crypto.randomUUID()` ou gere online)
- `typeVersion`: use o valor retornado pelo `get_node` do MCP
- `position`: [x, y] em pixels — nodes horizontais: x += 220
- `connections`: chave = nome do node origem; array externo = outputs; array interno = destinos
