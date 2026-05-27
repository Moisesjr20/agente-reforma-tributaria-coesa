---
name: subagent-creator
description: "Criar, editar, melhorar ou revisar subagentes do GueClaw. Use quando o usuário quiser criar um novo subagente, melhorar um existente, definir responsabilidades de um agente, ou organizar como os agentes se comunicam. Subagentes ficam em skills/myagents/. Diferente de skills (que são instruções), subagentes são personas especializadas com tools e modelo definidos que o orquestrador convoca para tarefas específicas."
version: 1.0.0
framework: doe
category: meta
---

# Subagent Creator

> **Operação DOE** — Esta skill segue a arquitetura DOE. Toda execução obedece ao fluxo: **Análise → Plano → Aprovação → Execução → Review**. Todo subagente criado DEVE incluir `framework: doe` e seguir o template padrão.

---

## O que é um Subagente

Subagentes são **personas especializadas** com:
- Papel e expertise bem definidos
- Conjunto restrito de tools (`vps_execute_command`, `api_request`, etc.)
- Modelo Claude adequado à tarefa (`sonnet`, `opus`, `haiku`)
- Instruções específicas de domínio

**Diferença de Skills:**
| Skills (`myskills/`) | Subagentes (`myagents/`) |
|---|---|
| Instruções de domínio (como fazer) | Persona com papel e ferramentas |
| Lidas quando o tópico aparece | Invocados pelo orquestrador |
| Sem frontmatter de `tools`/`model` | Com `tools` e `model` definidos |

---

## Onde Ficam

```
skills/myagents/
├── _template.md          ← Template base
├── doe-orchestrator.md   ← Orquestrador central
├── vps-agent.md          ← Especialista em VPS/infra
├── whatsapp-agent.md     ← Especialista em WhatsApp
└── [novo-agente].md      ← Novos subagentes
```

---

## Formato Obrigatório

Todo subagente deve seguir este frontmatter:

```yaml
---
name: nome-do-agente
description: "Quando invocar + o que faz (gatilhos detalhados)"
tools: vps_execute_command, file_operations   ← apenas o necessário
model: sonnet                                 ← sonnet | opus | haiku
framework: doe
---
```

### Regra de Modelo

| Modelo | Quando usar | Exemplos |
|---|---|---|
| `opus` | Raciocínio profundo — arquitetura, auditoria, análise complexa | `doe-orchestrator` |
| `sonnet` | Tarefas cotidianas — execução, integração, scripts | `vps-agent`, `whatsapp-agent` |
| `haiku` | Tarefas rápidas — consultas, buscas, logs simples | agentes de leitura |

### Regra de Tools

| Tool | Para que usar |
|---|---|
| `vps_execute_command` | Scripts Python, comandos shell na VPS |
| `file_operations` | Ler/escrever arquivos no servidor |
| `api_request` | Chamadas a APIs externas diretas (baixo volume) |

---

## Processo de Criação

### 1. Capturar intenção

Pergunte:
- Qual é o domínio/especialidade deste agente?
- Quais tarefas específicas ele resolve?
- Quais gatilhos devem acioná-lo (palavras-chave do usuário)?
- Quais tools ele precisa?
- Com quais outros agentes vai interagir?

### 2. Escrever o subagente

Use o template em `skills/myagents/_template.md` como base.

Seções obrigatórias:
- **Frontmatter** com `name`, `description`, `tools`, `model`, `framework: doe`
- **Responsabilidades** — lista clara do que faz
- **Regras Absolutas** — o que NUNCA fazer
- **Fluxo Principal** — passos com comandos reais
- **Integração** — quais agentes coordena / recebe dados

### 3. Criar o arquivo

Salve em: `skills/myagents/[nome-do-agente].md`

Use `file_operations` com `action: write` na VPS:
```
filePath: .agents/skills/myagents/[nome-do-agente].md
```

### 4. Avisar o usuário

Informe:
- Que o agente foi criado e está disponível nesta sessão
- Que será perdido no próximo deploy se não for commitado no repositório
- Como o `doe-orchestrator` vai invocá-lo

---

## Boas Práticas

- Descriptions devem ser **específicas e com gatilhos explícitos** — isso determina quando o agente é acionado
- Prefira agents **focados em um domínio** (WhatsApp ≠ VPS ≠ Calendar)
- Sempre inclua seção de **Integração com Outros Agentes**
- Use `haiku` para agentes de leitura/consulta simples para economizar tokens
- A `description` é o principal mecanismo de triggering — seja detalhado e "empurrador"
