---
name: n8n-expert
description: Especialista em n8n — automação de workflows, nodes, credenciais, expressões, código e integrações. Use sempre que o usuário mencionar n8n, workflow, nodes, automação, trigger, webhook, HTTP Request, Code node, expressão n8n, credencial, execução, erro de workflow, template n8n, ou quiser construir/corrigir/otimizar qualquer automação no n8n. Inclui uso dos MCPs n8n-mcp (czlonkowski) e n8n-mcp-server (leonardsellem) para criar, validar, deployar e gerenciar workflows via AI. Acione esta skill para qualquer tarefa envolvendo n8n, independente da complexidade.
version: 1.0.0
category: automation
tools: [mcp_n8n_mcp_docs, mcp_n8n_mcp_full, mcp_n8n_mcp_server]
---

# n8n Expert Skill

Especialista em construção, depuração e otimização de workflows n8n — da criação ao deploy.

Referências detalhadas (leia conforme necessário):
- `references/nodes.md` — Nodes essenciais, propriedades e exemplos de uso
- `references/mcp-tools.md` — Todas as tools dos MCPs n8n-mcp e n8n-mcp-server
- `references/workflow-patterns.md` — Padrões de workflow, expressões, error handling e boas práticas

---

## Fundamentos do n8n

### Estrutura de um Workflow

```
[Trigger] → [Node 1] → [Node 2] → ... → [Output]
           ↘ [Ramo B] → [Node B1]
```

- **Trigger**: ponto de entrada — Webhook, Schedule, Manual, etc.
- **Nodes**: unidades de processamento — cada um recebe `items[]` e retorna `items[]`
- **Connections**: ligações entre nodes; podem ser ramificadas (branches)
- **Credentials**: credenciais armazenadas com segurança, referenciadas pelos nodes

### Modelo de Dados — Items

Tudo no n8n trafega como array de **items**:

```json
[
  { "json": { "id": 1, "name": "João" }, "binary": {} },
  { "json": { "id": 2, "name": "Maria" }, "binary": {} }
]
```

Cada node processa **todos os items** recebidos por padrão. Use `Split In Batches` para controlar lotes.

---

## Expressões n8n

Expressões usam a sintaxe `{{ ... }}` e rodam em todos os campos de texto.

### Acessar dados do item atual
```javascript
{{ $json.fieldName }}                    // campo do item atual
{{ $json["campo com espaço"] }}          // campo com caracteres especiais
{{ $json.nested.deep.value }}            // campo aninhado
```

### Referenciar nodes anteriores
```javascript
{{ $node["Nome do Node"].json.campo }}           // último item do node
{{ $('Nome do Node').item.json.campo }}          // sintaxe moderna (v1.0+)
{{ $('Nome do Node').all() }}                    // todos os items
{{ $('Nome do Node').first().json.campo }}       // primeiro item
{{ $('Nome do Node').last().json.campo }}        // último item
{{ $('Nome do Node').itemMatching(0).json.x }}   // item por índice
```

### Variáveis especiais
```javascript
{{ $now }}                    // DateTime atual (Luxon)
{{ $today }}                  // data de hoje sem hora
{{ $workflow.id }}            // ID do workflow
{{ $workflow.name }}          // nome do workflow
{{ $execution.id }}           // ID da execução atual
{{ $vars.MINHA_VAR }}         // variável de ambiente do n8n
{{ $credentials.nomeCred }}   // NÃO disponível em expressões (segurança)
```

### Funções úteis em expressões
```javascript
{{ $json.texto.toUpperCase() }}
{{ $json.data.toDate().toFormat("dd/MM/yyyy") }}     // Luxon
{{ $json.array.length }}
{{ $json.campo ?? "valor_padrão" }}                  // nullish coalescing
{{ $json.campo || "fallback" }}                      // or
{{ [$json.a, $json.b].join(", ") }}
{{ JSON.stringify($json) }}
{{ $json.preco.toFixed(2) }}
```

---

## Nodes Mais Usados

Leia `references/nodes.md` para propriedades completas. Resumo essencial:

| Node | Uso principal |
|------|---------------|
| **Webhook** | Receber dados via HTTP (trigger) |
| **Schedule Trigger** | Executar em horários definidos (cron) |
| **HTTP Request** | Chamar qualquer API REST |
| **Code** | JavaScript/Python customizado |
| **IF** | Branching condicional |
| **Switch** | Múltiplos branches por valor |
| **Set** | Definir/transformar campos |
| **Merge** | Combinar dados de branches |
| **Split In Batches** | Processar em lotes |
| **Loop Over Items** | Iterar com lógica |
| **Edit Fields (Set)** | Mapear/renomear campos |
| **Filter** | Filtrar items por condição |
| **Aggregate** | Agrupar items |
| **Google Sheets** | Ler/escrever planilhas |
| **Gmail / Email** | Enviar emails |
| **Slack / Telegram** | Mensagens |
| **MySQL / PostgreSQL** | Banco de dados SQL |
| **Execute Workflow** | Chamar sub-workflow |
| **Wait** | Aguardar (tempo ou webhook) |
| **Respond to Webhook** | Enviar resposta HTTP |

---

## Code Node — JavaScript

O Code node executa JavaScript com acesso ao contexto do n8n:

```javascript
// Processar todos os items (modo "Run Once for All Items")
const results = [];

for (const item of $input.all()) {
  const data = item.json;
  
  results.push({
    json: {
      id: data.id,
      nomeCompleto: `${data.firstName} ${data.lastName}`,
      processadoEm: new Date().toISOString(),
    }
  });
}

return results;
```

```javascript
// Processar item atual (modo "Run Once for Each Item")
const nome = $json.nome;
const email = $json.email?.toLowerCase();

return {
  json: {
    nome,
    email,
    valido: email?.includes('@') ?? false,
  }
};
```

### Acesso a nodes no Code
```javascript
// Dados de outro node
const items = $('Nome do Node').all();
const primeiro = $('Nome do Node').first().json;

// Variáveis de ambiente
const apiKey = $vars.API_KEY;

// Helpers disponíveis
// $input, $json, $binary, $now, $today, $workflow, $execution
// DateTime (Luxon), $jmespath, $_ (lodash)
```

---

## HTTP Request Node — Configurações Chave

```
Method: GET | POST | PUT | PATCH | DELETE
URL: https://api.exemplo.com/endpoint

Authentication:
  - None
  - Generic Credential Type → Header Auth → "Authorization: Bearer TOKEN"
  - Predefined Credential Type → selecione o serviço

Headers (Add Header):
  Content-Type: application/json
  Version: 2021-07-28  (ex: GoHighLevel)

Query Parameters: chave=valor

Body (para POST/PUT/PATCH):
  Content Type: JSON
  Body: { "campo": "{{ $json.valor }}" }

Options:
  - Batching: Request Interval (ms) — evita rate limit  
  - Ignore SSL Issues — para ambientes de dev
  - Proxy
  - Timeout
  - Full Response — retorna headers e status code
```

---

## Webhook Node

### Configuração básica
```
HTTP Method: POST
Path: /meu-webhook              // URL final: https://n8n.url/webhook/meu-webhook
Authentication: None | Header Auth | Basic Auth
Respond: Immediately | Using 'Respond to Webhook' Node | Last Node
```

**URL do webhook:**
- Produção (ativo): `https://SEU_N8N/webhook/{path}`
- Teste (test mode): `https://SEU_N8N/webhook-test/{path}`

### Responder ao webhook
Use o nó **Respond to Webhook** depois de processar:
```
Respond With: JSON
Response Body: {{ $json }}
Response Code: 200
```

---

## Error Handling

### Try/Catch com Continue On Error
Habilite **"Continue On Error"** no node → em caso de erro, o item continua com `$json.error`.

### Error Trigger Workflow
Crie um workflow separado com **Error Trigger** node para capturar falhas:
```javascript
// Dados disponíveis no Error Trigger:
$json.execution.id         // ID da execução com erro
$json.execution.url        // URL para ver a execução
$json.workflow.id
$json.workflow.name
$json.error.message
$json.error.stack
```

### Try/Catch no Code node
```javascript
try {
  const resultado = await fetch(url);
  const dados = await resultado.json();
  return [{ json: dados }];
} catch (err) {
  return [{ json: { erro: err.message, sucesso: false } }];
}
```

---

## Sub-Workflows

Use **Execute Workflow** para modularizar:
```
Operation: Execute Workflow
Source: Database (by ID) | Local File
Workflow ID: abc123
Wait For Sub-Workflow: true
```

Passe dados via "Input Data" e receba o resultado de volta.

---

## MCPs n8n — Uso com AI

Leia `references/mcp-tools.md` para a referência completa. Resumo de uso:

### Quando usar o MCP n8n-mcp (czlonkowski)
- Buscar documentação de qualquer node: `get_node`
- Pesquisar nodes por funcionalidade: `search_nodes`
- Validar workflow JSON: `validate_workflow`
- Buscar templates prontos: `search_templates`
- Criar e gerenciar workflows na instância n8n: `n8n_create_workflow`, `n8n_update_full_workflow`

### Workflow típico ao construir automação
1. `search_nodes` — encontrar o node certo para a tarefa
2. `get_node` — ver propriedades e exemplos do node
3. `search_templates` — buscar templates similares para se inspirar
4. Construir o JSON do workflow
5. `validate_workflow` — validar antes de criar
6. `n8n_create_workflow` — criar na instância
7. `n8n_test_workflow` — testar

---

## Boas Práticas

### Nomenclatura
- Nomes de nodes descritivos: "GET Contatos GHL" não "HTTP Request"
- Prefixe por ação: "GET", "POST", "SET", "IF", "LOOP", "ERRO"
- Workflows: `[Serviço] - [Função]` ex: `GHL - Sincronizar Contatos`

### Performance
- Use **Batching** no HTTP Request para respeitar rate limits
- Prefira **Split In Batches** a loops manuais para grandes volumes
- Use `Filter` antes de processar para descartar items irrelevantes cedo
- Sub-workflows para lógica reutilizável

### Segurança
- Sempre armazene tokens em **Credentials** — nunca hardcode em nodes
- Use **Header Auth** ou credenciais nativas para todas as APIs
- Habilite autenticação nos Webhooks expostos
- Valide os dados recebidos antes de processá-los

### Debugging
- Use **Manual Trigger** + **Pin Data** para simular inputs fixos
- Habilite **"Save Execution Progress"** para workflows longos
- Adicione nós **Set** intermediários para inspecionar dados
- Leia o erro completo: stack trace fica na aba "Error" da execução

---

## Links Úteis

- Documentação oficial: https://docs.n8n.io/
- Marketplace de templates: https://n8n.io/workflows/
- Referência de nodes: https://docs.n8n.io/integrations/
- Expressões (sintaxe): https://docs.n8n.io/code/expressions/
- Built-in methods: https://docs.n8n.io/code/builtin/
- Code node: https://docs.n8n.io/code/code-node/
