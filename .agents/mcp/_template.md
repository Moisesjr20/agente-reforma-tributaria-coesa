# MCP Server — [nome-do-server]

## Descrição

> Uma linha descrevendo o que este server faz.

## Instalação

```bash
npx -y @modelcontextprotocol/server-nome
# ou
npm install -g @modelcontextprotocol/server-nome
```

## Configuração (`.vscode/mcp.json`)

```json
{
  "servers": {
    "nome-do-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-nome", "--arg1", "valor"],
      "env": {
        "API_KEY": "${env:NOME_API_KEY}",
        "BASE_URL": "${env:NOME_BASE_URL}"
      }
    }
  }
}
```

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `NOME_API_KEY` | Chave de autenticação | ✅ |
| `NOME_BASE_URL` | URL base da API | ✅ |

Adicionar ao `.env`:
```dotenv
NOME_API_KEY=sua_chave_aqui
NOME_BASE_URL=https://api.exemplo.com
```

## Tools Expostas

Ver [`../tools/nome-do-server.md`](../tools/nome-do-server.md)

## Agentes / Skills que usam este server

- [ ] _(listar quais skills ou agentes dependem deste server)_

## Observações

> Limitações conhecidas, rate limits, versão testada, etc.
