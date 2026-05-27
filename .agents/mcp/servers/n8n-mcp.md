# MCP Server — n8n-mcp (czlonkowski)

## Descrição

Bridge entre n8n e AI models. Fornece acesso estruturado à documentação de **1.084 nodes n8n** (537 core + 547 community), schemas de propriedades, operações e 2.709 workflow templates.  
Pacote npm: `n8n-mcp` | 16k+ ⭐

## Configuração (`.vscode/mcp.json`)

### Modo documentação (sem instância n8n — pronto para uso)

```json
"n8n-mcp-docs": {
  "command": "npx",
  "args": ["n8n-mcp"],
  "env": {
    "MCP_MODE": "stdio",
    "LOG_LEVEL": "error",
    "DISABLE_CONSOLE_OUTPUT": "true"
  }
}
```

### Modo completo (requires instância n8n ativa)

```json
"n8n-mcp-full": {
  "command": "npx",
  "args": ["n8n-mcp"],
  "env": {
    "MCP_MODE": "stdio",
    "LOG_LEVEL": "error",
    "DISABLE_CONSOLE_OUTPUT": "true",
    "N8N_API_URL": "${env:N8N_API_URL}",
    "N8N_API_KEY": "${env:N8N_API_KEY}"
  }
}
```

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `MCP_MODE` | Deve ser `stdio` para Copilot/Claude Desktop | ✅ |
| `LOG_LEVEL` | `error` para manter o stdout limpo | ✅ |
| `DISABLE_CONSOLE_OUTPUT` | `true` evita lixo no JSON-RPC | ✅ |
| `N8N_API_URL` | URL da instância n8n (ex: `http://localhost:5678`) | ❌ (só modo completo) |
| `N8N_API_KEY` | API Key gerada em n8n → Settings → API | ❌ (só modo completo) |

Adicionar ao `.env` quando usar modo completo:
```dotenv
N8N_API_URL=http://localhost:5678
N8N_API_KEY=n8n_api_xxxxxxxx
```

## Tools Expostas

Ver [`../tools/n8n-mcp.md`](../tools/n8n-mcp.md)

### Resumo

**Core (7 tools):** `tools_documentation`, `search_nodes`, `get_node`, `validate_node`, `validate_workflow`, `search_templates`, `get_template`

**n8n Management (13 tools, requer API):** `n8n_create_workflow`, `n8n_get_workflow`, `n8n_update_full_workflow`, `n8n_update_partial_workflow`, `n8n_delete_workflow`, `n8n_list_workflows`, `n8n_validate_workflow`, `n8n_autofix_workflow`, `n8n_workflow_versions`, `n8n_deploy_template`, `n8n_test_workflow`, `n8n_executions`, `n8n_health_check`

## Agentes / Skills que usam este server

- [ ] `doe` — para criar automações n8n a partir de pedidos do usuário
- [ ] Qualquer skill que precise de contexto de nodes n8n

## Observações

- **MCP_MODE: "stdio" é obrigatório** — sem ele aparece erro `Unexpected token...` no Copilot
- Sem `N8N_API_URL` só ficam disponíveis as 7 tools core de documentação
- Telemetria anônima ativa por padrão; desativar: adicionar `"N8N_MCP_TELEMETRY_DISABLED": "true"` nas env
- Versão testada: v2.37+ | Node.js qualquer versão
- Fonte: https://github.com/czlonkowski/n8n-mcp
