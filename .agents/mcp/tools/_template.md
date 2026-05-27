# Tools — [nome-do-server]

> Catálogo das tools expostas por este MCP Server.  
> Use este arquivo como referência ao escrever skills ou instruções de agentes.

---

## `tool_name_1`

**Descrição:** O que esta tool faz.

**Parâmetros:**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `param1` | `string` | ✅ | Descrição do parâmetro |
| `param2` | `number` | ❌ | Descrição opcional |

**Exemplo de invocação:**
```json
{
  "tool": "tool_name_1",
  "params": {
    "param1": "valor"
  }
}
```

**Retorno esperado:**
```json
{
  "result": "..."
}
```

---

## `tool_name_2`

**Descrição:** O que esta tool faz.

**Parâmetros:**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `param1` | `string` | ✅ | Descrição do parâmetro |

**Exemplo de invocação:**
```json
{
  "tool": "tool_name_2",
  "params": {
    "param1": "valor"
  }
}
```
