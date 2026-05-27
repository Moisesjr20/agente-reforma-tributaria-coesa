# MCP Server — @modelcontextprotocol/server-memory

## Descrição

Memória persistente entre sessões implementada como **knowledge graph** (grafo de conhecimento). Permite ao agente lembrar informações sobre entidades, relacionamentos e observações entre conversas.  
Pacote npm: `@modelcontextprotocol/server-memory` | Oficial Anthropic/MCP | MIT

## Configuração (`.vscode/mcp.json`)

```json
"memory": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "env": {
    "MEMORY_FILE_PATH": "${workspaceFolder}/data/memory/mcp-memory.jsonl"
  }
}
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `MEMORY_FILE_PATH` | Caminho para o arquivo de armazenamento `.jsonl` | `memory.jsonl` no diretório do server |

Neste projeto: `data/memory/mcp-memory.jsonl` (o diretório `data/memory/` já existe).

## Tools Expostas

| Tool | Descrição |
|------|-----------|
| `create_entities` | Criar entidades no grafo (nome, tipo, observações) |
| `create_relations` | Criar relações direcionadas entre entidades |
| `add_observations` | Adicionar fatos a entidades existentes |
| `delete_entities` | Remover entidades e suas relações (cascading) |
| `delete_observations` | Remover observações específicas |
| `delete_relations` | Remover relações específicas |
| `read_graph` | Ler o grafo completo |
| `search_nodes` | Buscar entidades por nome, tipo ou observação |
| `open_nodes` | Recuperar nós específicos por nome |

## Conceitos do Grafo

**Entidade:** nó com nome único, tipo e lista de observações  
```json
{ "name": "Moises", "entityType": "person", "observations": ["Usa GueClaw", "Prefere respostas curtas"] }
```

**Relação:** aresta direcionada entre entidades  
```json
{ "from": "Moises", "to": "GueClaw", "relationType": "owns" }
```

**Observação:** fato atômico sobre uma entidade (string)

## Exemplo de uso no Copilot

```
Lembre que o projeto GueClaw usa TypeScript e tem backend na VPS 147.93.69.211
→ cria entidade "GueClaw", adiciona observações
```

## Agentes / Skills que usam este server

- [ ] `doe` — para persistir contexto de projetos entre sessões
- [ ] `obsidian-notes` — complementa o vault com memória estruturada
- [ ] Todos os agentes que precisam de contexto cross-session

## Observações

- O arquivo `.jsonl` sobrevive entre sessões — **não deletar** `data/memory/mcp-memory.jsonl`
- Memória complementa (não substitui) o session memory do Copilot
- Fonte: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
