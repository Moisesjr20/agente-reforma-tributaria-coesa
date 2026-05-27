# MCP Server — n8n-mcp-server (leonardsellem)

## Descrição

MCP server focado em **gerenciar workflows n8n via linguagem natural**: criar, listar, atualizar, deletar, ativar/desativar workflows e disparar execuções via API ou webhooks.  
Pacote npm: `@leonardsellem/n8n-mcp-server` | 1.6k ⭐

> **Diferença em relação ao czlonkowski/n8n-mcp:**  
> Este é focado em CRUD de workflows e execução. Não tem o catálogo de nodes/templates do czlonkowski.

## Configuração (`.vscode/mcp.json`)

```json
"n8n-mcp-server": {
  "command": "npx",
  "args": ["-y", "@leonardsellem/n8n-mcp-server"],
  "env": {
    "N8N_API_URL": "${env:N8N_API_URL}",
    "N8N_API_KEY": "${env:N8N_API_KEY}",
    "N8N_WEBHOOK_USERNAME": "${env:N8N_WEBHOOK_USERNAME}",
    "N8N_WEBHOOK_PASSWORD": "${env:N8N_WEBHOOK_PASSWORD}"
  }
}
```

> Requer Node.js 20+

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `N8N_API_URL` | URL completa incluindo `/api/v1` (ex: `http://localhost:5678/api/v1`) | ✅ |
| `N8N_API_KEY` | API Key do n8n | ✅ |
| `N8N_WEBHOOK_USERNAME` | Usuário para autenticação de webhooks | ❌ |
| `N8N_WEBHOOK_PASSWORD` | Senha para autenticação de webhooks | ❌ |

Adicionar ao `.env`:
```dotenv
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=n8n_api_xxxxxxxx
N8N_WEBHOOK_USERNAME=username
N8N_WEBHOOK_PASSWORD=password
```

> **Atenção:** `N8N_API_URL` precisa incluir `/api/v1` no final (diferente do czlonkowski)

## Tools Expostas

### Workflow Management
`workflow_list`, `workflow_get`, `workflow_create`, `workflow_update`, `workflow_delete`, `workflow_activate`, `workflow_deactivate`

### Execution Management
`execution_run`, `run_webhook`, `execution_get`, `execution_list`, `execution_stop`

## Resources Expostos

- `n8n://workflows/list`
- `n8n://workflow/{id}`
- `n8n://executions/{workflowId}`
- `n8n://execution/{id}`

## Agentes / Skills que usam este server

- [ ] `doe` — para executar/gerenciar workflows programaticamente

## Observações

- Última versão: v0.1.8 (9 meses atrás — manutenção lenta)
- Projeto busca co-maintainers; use com cautela em produção
- Fonte: https://github.com/leonardsellem/n8n-mcp-server
