# n8n MCP Tools — Referência Completa

Documentação de todas as tools dos dois MCPs n8n disponíveis.

---

## MCP 1 — n8n-mcp (czlonkowski)

**Pacote:** `n8n-mcp` | npm  
**Config key:** `n8n-mcp-docs` (só docs) ou `n8n-mcp-full` (docs + gerenciamento)  
**Fonte:** https://github.com/czlonkowski/n8n-mcp

Cobre **1.084 nodes** (537 core + 547 community) e **2.709 templates**.

---

### tools_documentation
Retorna documentação sobre o próprio MCP — lista de tools disponíveis e como usá-las.

```
Parâmetros: nenhum
Quando usar: para descobrir o que o MCP pode fazer
```

---

### search_nodes
Busca nodes pelo nome ou funcionalidade.

```
Parâmetros:
  query: string (obrigatório) — termos de busca
  limit?: number — máximo de resultados (padrão: 20)

Exemplos:
  search_nodes("google sheets")
  search_nodes("send email")
  search_nodes("webhook")
  search_nodes("http request api")
  search_nodes("telegram message")

Retorna: array de { name, displayName, description, package }
Quando usar: quando não sabe o nome exato do node
```

---

### get_node
Retorna schema completo de um node — todas as propriedades, tipos, defaults e opções.

```
Parâmetros:
  nodeName: string (obrigatório) — nome do node (ex: "n8n-nodes-base.httpRequest")

Exemplos:
  get_node("n8n-nodes-base.httpRequest")
  get_node("n8n-nodes-base.googleSheets")
  get_node("n8n-nodes-base.code")
  get_node("n8n-nodes-base.webhook")
  get_node("n8n-nodes-base.telegram")
  get_node("n8n-nodes-base.if")

Retorna: schema completo com properties[], credentials[], operations[]
Quando usar: para saber exatamente quais campos um node aceita ao montar JSON
```

**Nomes canônicos dos nodes mais usados:**
```
n8n-nodes-base.webhook
n8n-nodes-base.scheduleTrigger
n8n-nodes-base.manualTrigger
n8n-nodes-base.httpRequest
n8n-nodes-base.code
n8n-nodes-base.set
n8n-nodes-base.if
n8n-nodes-base.switch
n8n-nodes-base.merge
n8n-nodes-base.splitInBatches
n8n-nodes-base.filter
n8n-nodes-base.aggregate
n8n-nodes-base.executeWorkflow
n8n-nodes-base.wait
n8n-nodes-base.respondToWebhook
n8n-nodes-base.stopAndError
n8n-nodes-base.googleSheets
n8n-nodes-base.gmail
n8n-nodes-base.telegram
n8n-nodes-base.slack
n8n-nodes-base.mySql
n8n-nodes-base.postgres
n8n-nodes-base.redis
n8n-nodes-base.openAi
n8n-nodes-base.emailSend
```

---

### validate_node
Valida a configuração de um node específico.

```
Parâmetros:
  nodeType: string — nome canônico do node
  nodeData: object — configuração do node (parameters, credentials, etc.)

Retorna: { valid: boolean, errors: string[], warnings: string[] }
Quando usar: antes de criar um workflow para garantir que cada node está correto
```

---

### validate_workflow
Valida o JSON completo de um workflow.

```
Parâmetros:
  workflow: object — JSON completo do workflow n8n

Retorna: { valid: boolean, errors: [], warnings: [] }
Quando usar: SEMPRE antes de chamar n8n_create_workflow
```

---

### search_templates
Busca templates prontos no catálogo de 2.709 workflows.

```
Parâmetros:
  query: string (obrigatório) — o que procurar
  limit?: number — máximo de resultados (padrão: 10)

Exemplos:
  search_templates("sync google sheets contacts")
  search_templates("send whatsapp notification")
  search_templates("scrape website")
  search_templates("gohighlevel crm")
  search_templates("openai chatbot")

Retorna: array de { id, name, description, nodes[], url }
Quando usar: para se inspirar ou reusar workflows prontos
```

---

### get_template
Retorna o JSON completo de um template pelo ID.

```
Parâmetros:
  templateId: number (obrigatório) — ID do template

Retorna: workflow JSON completo pronto para adaptar
Quando usar: após search_templates, para obter o workflow de um template específico
```

---

### n8n_create_workflow ⚠️ (requer N8N_API_URL)
Cria um novo workflow na instância n8n.

```
Parâmetros:
  workflow: object — JSON completo do workflow

Retorna: { id, name, active, url }
Quando usar: após validar com validate_workflow
```

**Estrutura mínima do workflow JSON:**
```json
{
  "name": "Nome do Workflow",
  "nodes": [
    {
      "id": "uuid-unico",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [240, 300],
      "parameters": {}
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [[{ "node": "ProximoNode", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

---

### n8n_get_workflow ⚠️ (requer N8N_API_URL)
Busca um workflow existente pelo ID.

```
Parâmetros:
  workflowId: string

Retorna: JSON completo do workflow
Quando usar: para inspecionar ou editar um workflow existente
```

---

### n8n_update_full_workflow ⚠️ (requer N8N_API_URL)
Substitui completamente um workflow existente.

```
Parâmetros:
  workflowId: string
  workflow: object — JSON completo do novo workflow

Quando usar: para substituir toda a lógica de um workflow
⚠️ Operação destrutiva — substitui tudo. Prefira n8n_update_partial_workflow quando possível
```

---

### n8n_update_partial_workflow ⚠️ (requer N8N_API_URL)
Atualiza partes específicas de um workflow (mais seguro).

```
Parâmetros:
  workflowId: string
  updates: object — apenas as partes a atualizar

Quando usar: para modificar nodes ou conexões específicos sem substituir tudo
```

---

### n8n_delete_workflow ⚠️ (requer N8N_API_URL)
Deleta um workflow.

```
Parâmetros:
  workflowId: string

⚠️ Ação irreversível — confirme com o usuário antes
```

---

### n8n_list_workflows ⚠️ (requer N8N_API_URL)
Lista todos os workflows da instância.

```
Parâmetros:
  limit?: number (padrão: 100)
  cursor?: string (para paginação)
  active?: boolean (filtrar por ativos/inativos)
  tags?: string[] (filtrar por tags)
  projectId?: string

Retorna: { data: [{ id, name, active, tags, updatedAt }], nextCursor }
```

---

### n8n_validate_workflow ⚠️ (requer N8N_API_URL)
Valida um workflow contra a instância n8n real (mais rigoroso que validate_workflow).

```
Parâmetros:
  workflowId: string — ID de um workflow existente
```

---

### n8n_autofix_workflow ⚠️ (requer N8N_API_URL)
Tenta corrigir automaticamente erros em um workflow.

```
Parâmetros:
  workflowId: string

Retorna: { fixed: boolean, changes: [], errors_remaining: [] }
Quando usar: quando validate_workflow retorna erros e a correção não é óbvia
```

---

### n8n_workflow_versions ⚠️ (requer N8N_API_URL)
Lista versões anteriores de um workflow.

```
Parâmetros:
  workflowId: string

Retorna: array de versões com timestamps
```

---

### n8n_deploy_template ⚠️ (requer N8N_API_URL)
Importa um template do catálogo diretamente para a instância.

```
Parâmetros:
  templateId: number — ID do template (obtido via search_templates)

Retorna: workflow criado com ID na instância
```

---

### n8n_test_workflow ⚠️ (requer N8N_API_URL)
Executa um workflow em modo de teste.

```
Parâmetros:
  workflowId: string
  inputData?: object — dados de entrada opcionais

Retorna: { executionId, status, output }
```

---

### n8n_executions ⚠️ (requer N8N_API_URL)
Lista execuções de um workflow.

```
Parâmetros:
  workflowId?: string (opcional — sem ele lista todas)
  status?: "success" | "error" | "waiting"
  limit?: number (padrão: 20)

Retorna: array de execuções com status, startedAt, finishedAt, data
```

---

### n8n_health_check ⚠️ (requer N8N_API_URL)
Verifica se a instância n8n está respondendo.

```
Parâmetros: nenhum
Retorna: { status: "ok" | "error", version, instanceUrl }
```

---

## MCP 2 — n8n-mcp-server (leonardsellem)

**Pacote:** `@leonardsellem/n8n-mcp-server`  
**Config key:** `n8n-mcp-server`  
**Fonte:** https://github.com/leonardsellem/n8n-mcp-server  
**Foco:** CRUD de workflows e execuções via API n8n. Não tem catálogo de nodes/templates.

> **Quando usar este vs o czlonkowski?**  
> Use o czlonkowski para documentação, validação e templates.  
> Use o leonardsellem para operações de execução (run, stop) e quando precisar das resources expostas.

---

### workflow_list
Lista todos os workflows.

```
Parâmetros:
  active?: boolean
  
Retorna: array de { id, name, active, createdAt, updatedAt }
```

---

### workflow_get
Busca um workflow pelo ID.

```
Parâmetros:
  id: string
```

---

### workflow_create
Cria um novo workflow.

```
Parâmetros:
  workflow: object — JSON do workflow
```

---

### workflow_update
Atualiza um workflow existente.

```
Parâmetros:
  id: string
  workflow: object
```

---

### workflow_delete
Deleta um workflow.

```
Parâmetros:
  id: string
⚠️ Irreversível — confirme antes
```

---

### workflow_activate / workflow_deactivate
Ativa ou desativa um workflow.

```
Parâmetros:
  id: string
```

---

### execution_run
Dispara a execução de um workflow.

```
Parâmetros:
  workflowId: string
  inputData?: object — dados de entrada
  
Retorna: { executionId, status }
```

---

### run_webhook
Dispara um workflow via URL de webhook.

```
Parâmetros:
  webhookUrl: string — URL completa do webhook
  method?: string (padrão: POST)
  data?: object — payload
  authentication?: { username, password }
```

---

### execution_get
Busca detalhes de uma execução.

```
Parâmetros:
  id: string
```

---

### execution_list
Lista execuções.

```
Parâmetros:
  workflowId?: string
  status?: string
  limit?: number
```

---

### execution_stop
Para uma execução em andamento.

```
Parâmetros:
  id: string
```

---

## Fluxo Recomendado — Construir Workflow com MCP

```
1. search_nodes("funcionalidade desejada")
   → Encontrar o node certo

2. get_node("n8n-nodes-base.nomeDoNode")
   → Ver todas as propriedades e opções

3. search_templates("caso de uso similar")
   → Buscar referência pronta

4. get_template(id)
   → Obter estrutura de um template similar (se encontrado)

5. [Construir o JSON do workflow]

6. validate_workflow(workflowJSON)
   → Garantir que está correto

7. n8n_create_workflow(workflowJSON)
   → Criar na instância

8. n8n_test_workflow(workflowId)
   → Testar

9. [Ajustar baseado nos resultados]
```
