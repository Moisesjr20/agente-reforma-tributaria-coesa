# MCP Server — @executeautomation/playwright-mcp-server

## Descrição

MCP server Playwright com foco em **automação rica**: screenshots, geração de código de teste, web scraping, emulação de dispositivos (143 presets) e execução de JavaScript.  
Pacote npm: `@executeautomation/playwright-mcp-server` | 5.3k ⭐ | MIT

> **Diferença em relação ao @playwright/mcp oficial:**  
> Este tem mais tools (screenshots, codegen, device emulation) mas é mais pesado. O oficial é mais leve/determinístico. Use os dois em paralelo se precisar.

## Configuração (`.vscode/mcp.json`)

```json
"playwright-ea": {
  "command": "npx",
  "args": ["-y", "@executeautomation/playwright-mcp-server"]
}
```

> Logs são redirecionados automaticamente para `~/playwright-mcp-server.log` no modo stdio.

## Sem variáveis de ambiente obrigatórias

Configuração apenas via args. Browsers são instalados automaticamente na primeira execução.

## Tools Expostas (principais)

| Tool | Descrição |
|------|-----------|
| `playwright_navigate` | Navegar para uma URL |
| `playwright_screenshot` | Tirar screenshot da página atual |
| `playwright_click` | Clicar em elemento |
| `playwright_fill` | Preencher campo de formulário |
| `playwright_evaluate` | Executar JavaScript na página |
| `playwright_resize` | Redimensionar viewport / emular dispositivo |
| `playwright_get_visible_text` | Extrair texto visível |
| `playwright_get_visible_html` | Extrair HTML visível |
| `playwright_codegen_*` | Gerar código de teste Playwright |

### Emulação de dispositivos

```javascript
// Exemplos via linguagem natural no chat:
// "Test on iPhone 13"
// "Switch to iPad view"
// "Rotate to landscape"
playwright_resize({ device: "iPhone 13" })
playwright_resize({ device: "iPad Pro 11", orientation: "landscape" })
```

## Agentes / Skills que usam este server

- [ ] `doe` — para gerar testes E2E automaticamente
- [ ] Qualquer skill que precise de screenshots ou validação visual

## Observações

- Browsers instalados em: `%USERPROFILE%\AppData\Local\ms-playwright`
- Instalar manualmente se necessário: `npx playwright install chromium`
- Nome do server para Cursor: `playwright-mcp` (máx 60 chars com tool name)
- Fonte: https://github.com/executeautomation/mcp-playwright
