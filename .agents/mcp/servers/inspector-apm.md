# MCP Server — inspector-apm/mcp-server

## ⚠️ ARQUIVADO — NÃO USAR EM PRODUÇÃO

> **Este repositório foi arquivado em 20/03/2026 (read-only).**  
> Sem mais atualizações de segurança ou manutenção.  
> Documentado apenas para referência histórica.

---

## Descrição

MCP server para o ecossistema **PHP** que permite ao AI acessar erros e dados de performance da plataforma [Inspector.dev](https://inspector.dev/). Incompatível com este projeto (Node.js/TypeScript).

## Por que não instalar

1. **Arquivado** — sem suporte desde março/2026
2. **PHP-based** — requer `composer` e PHP, não se encaixa no stack Node.js deste projeto
3. **Requer conta paga** no Inspector.dev com `INSPECTOR_API_KEY` e `INSPECTOR_APP_ID`

## Alternativas recomendadas

Para monitoramento de erros em produção, considere:
- [Sentry MCP](https://github.com/getsentry/sentry-mcp) — SDK JavaScript nativo, mantido ativamente
- [Datadog MCP](https://github.com/DataDog/datadog-mcp) — se já usa Datadog

## Configuração (apenas referência)

```json
// ❌ NÃO USAR — server arquivado
"inspector": {
  "command": "php",
  "args": [
    "/absolute/path/to/vendor/inspector-apm/mcp-server/server.php"
  ],
  "env": {
    "INSPECTOR_API_KEY": "${env:INSPECTOR_API_KEY}",
    "INSPECTOR_APP_ID": "${env:INSPECTOR_APP_ID}"
  }
}
```

## Fonte

https://github.com/inspector-apm/mcp-server (arquivado)
