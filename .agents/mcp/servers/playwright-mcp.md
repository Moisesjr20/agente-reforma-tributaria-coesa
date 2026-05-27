# MCP Server — @playwright/mcp (Microsoft — oficial)

## Descrição

MCP server oficial da Microsoft para automação de browsers via Playwright. Opera sobre **accessibility tree** (sem screenshots/vision), tornando-o leve e determinístico.  
Pacote npm: `@playwright/mcp` | 29.6k ⭐ | Apache-2.0

## Configuração (`.vscode/mcp.json`)

### Modo padrão (headless)

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

### Com opções adicionais

```json
"playwright": {
  "command": "npx",
  "args": [
    "@playwright/mcp@latest",
    "--headless",
    "--browser", "chromium"
  ]
}
```

### Modo isolado (sem persistência de sessão)

```json
"playwright": {
  "command": "npx",
  "args": [
    "@playwright/mcp@latest",
    "--isolated"
  ]
}
```

## Variáveis de Ambiente (via args, não env vars)

| Argumento | Env Var equivalente | Descrição |
|-----------|---------------------|-----------|
| `--headless` | `PLAYWRIGHT_MCP_HEADLESS=true` | Modo sem janela |
| `--browser chromium\|firefox\|webkit\|msedge` | `PLAYWRIGHT_MCP_BROWSER` | Browser a usar |
| `--isolated` | `PLAYWRIGHT_MCP_ISOLATED=true` | Sem persistência de perfil |
| `--viewport-size 1280x720` | `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | Tamanho da viewport |
| `--caps vision,pdf,devtools` | `PLAYWRIGHT_MCP_CAPS` | Capacidades extras (opt-in) |
| `--output-dir ./tmp/playwright` | `PLAYWRIGHT_MCP_OUTPUT_DIR` | Diretório de output |

## Tools Expostas (core, sempre ativas)

Navegação, cliques, fill de formulários, tab management, snapshot da página, aguardar elementos.

### Opt-in via `--caps`

| Cap | Tools |
|-----|-------|
| `vision` | screenshot-based tools (coordinate input) |
| `pdf` | geração de PDF |
| `devtools` | DevTools Protocol |
| `network` | intercepção de rede |
| `storage` | cookies/localStorage |
| `config` | configuração em runtime |

## Agentes / Skills que usam este server

- [ ] `doe` — para testes E2E, web scraping, automações browser
- [ ] `vps-manager` — para verificar dashboards web remotamente

## Observações

- **Não precisa de modelo vision** — usa accessibility tree puro
- Perfil persistente por padrão em: `%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile`
- Requer Node.js 18+
- Para VS Code com display sem servidor gráfico: usar `--port 8931` (HTTP mode)
- Fonte: https://github.com/microsoft/playwright-mcp
