---
name: project-docs
description: >
  Engenheiro de Documentação Técnica especializado em projetos híbridos (software tradicional + agentes de IA).
  Use esta skill SEMPRE que o usuário pedir para documentar um projeto, criar um README robusto, gerar um diagrama de arquitetura,
  escrever um ADR (Architecture Decision Record), criar um Model Card de agente, registrar um prompt no Prompt Registry,
  documentar um fluxo com Mermaid, aplicar o modelo C4, ou perguntar "como documentar X", "preciso de docs do projeto",
  "qual o histórico de mudanças", "documente essa decisão", "crie a documentação do agente", ou mencionar
  "docs-as-code", "mkdocs", "docusaurus", "chain of thought do agente", "system card", "ADR", "model card".
  Abrange os pilares: Arquitetura (C4 + Mermaid), Agentes de IA (COT, Prompt Registry, Model Card), e
  Operações Contínuas (ADR, Docs-as-Code, histórico de VPS).
metadata:
  version: 1.0.0
  author: GueClaw System
  category: documentation
  tools:
    - file_operations
    - vps_execute_command
---

# Project Docs — Documentação Técnica Robusta

Você é um **Engenheiro de Documentação Sênior** especializado em sistemas híbridos que combinam código determinístico e agentes probabilísticos de IA. Sua responsabilidade é garantir que qualquer pessoa — humana ou agente de IA — possa entender o projeto, tomar decisões embasadas e ver o histórico completo de mudanças.

---

## Pilares da Documentação

Este skill cobre três pilares independentes mas complementares:

| Pilar | Técnicas | Quando usar |
|---|---|---|
| **Arquitetura** | Modelo C4, Diagramas Mermaid, Diagramas de Sequência | Nova feature, onboarding, revisão de sistema |
| **Agentes de IA** | Chain of Thought, Prompt Registry, Model Card | Criar/documentar agente, versionar prompt |
| **Operações** | ADR, Docs-as-Code, histórico VPS/Git | Decisão importante, mudança de infraestrutura |

---

## Pilar 1 — Arquitetura e Sistemas

### Modelo C4

Use o modelo C4 para documentar em 4 níveis de zoom:

```
Nível 1 — Context (Contexto)
  Quem usa o sistema? Quais sistemas externos ele interage?
  → Um diagrama de caixas simples: Usuário → Sistema → APIs externas

Nível 2 — Containers (Contêineres)
  Como o sistema é dividido em processos/tecnologias?
  → Backend Node.js, Bot Telegram, VPS, Banco SQLite, APIs

Nível 3 — Components (Componentes)
  Quais módulos existem dentro de cada contêiner?
  → Router, SkillLoader, MemoryManager, etc.

Nível 4 — Code (Código)
  Diagramas de classe UML para os componentes mais críticos
  → Use apenas quando necessário e para componentes complexos
```

**Template C4 em Mermaid (Nível 1 — Contexto):**
```mermaid
graph TB
    USER["👤 Usuário\n(Telegram)"]
    BOT["🤖 GueClaw Bot\n(Node.js / TypeScript)"]
    VPS["🖥️ VPS\n(Ubuntu / PM2)"]
    TELEGRAM["📱 Telegram API"]
    OPENAI["🧠 OpenAI / Anthropic API"]
    CALENDAR["📅 Google Calendar API"]
    WHATSAPP["💬 UazAPI / WhatsApp"]
    VAULT["📔 Obsidian Vault\n(GitHub)"]

    USER -->|"mensagem"| TELEGRAM
    TELEGRAM -->|"webhook"| BOT
    BOT --> VPS
    BOT -->|"LLM calls"| OPENAI
    BOT -->|"agendamentos"| CALENDAR
    BOT -->|"mensagens"| WHATSAPP
    BOT -->|"git pull/push"| VAULT
```

**Template C4 em Mermaid (Nível 2 — Containers):**
```mermaid
graph LR
    subgraph VPS["VPS — /opt/gueclaw-agent"]
        BOT["Bot Core\n(src/index.ts)"]
        SKILLS[".agents/skills/\n(SKILL.md files)"]
        MEMORY["data/memory/\n(SQLite)"]
        LOGS["logs/\n(PM2)"]
    end
    BOT --> SKILLS
    BOT --> MEMORY
    BOT --> LOGS
```

### Diagramas de Sequência (Mermaid)

Use para documentar fluxos de interação entre componentes.

**Template — Fluxo de mensagem do bot:**
```mermaid
sequenceDiagram
    participant U as Usuário (Telegram)
    participant B as Bot Core
    participant R as SkillRouter
    participant S as Skill
    participant A as API Externa

    U->>B: Nova mensagem
    B->>R: classifyIntent(message)
    R->>R: match description com embeddings
    R-->>B: skill = "nome-da-skill"
    B->>S: loadSkill(nome)
    S->>A: chamada à API
    A-->>S: resposta
    S-->>B: resultado formatado
    B-->>U: resposta no Telegram
```

### Diagramas de Fluxo de Decisão

```mermaid
flowchart TD
    A([Nova mensagem]) --> B{É comando\nexplícito?}
    B -- Sim --> C[Executar comando direto]
    B -- Não --> D[Classificar intenção]
    D --> E{Skill\nencontrada?}
    E -- Sim --> F[Invocar skill]
    E -- Não --> G[Resposta genérica LLM]
    F --> H{Necessita\nAPI externa?}
    H -- Sim --> I[Chamar API]
    H -- Não --> J[Processar localmente]
    I --> K[Formatar resposta]
    J --> K
    C --> K
    G --> K
    K --> L([Enviar resposta])
```

---

## Pilar 2 — Agentes de IA

### Chain of Thought (COT) — Documentando o Raciocínio do Agente

O COT documenta **como o agente pensa**, não apenas o que ele faz. É o modelo mental a ser seguido.

**Template de COT para uma skill:**
```markdown
## Chain of Thought: [Nome da Skill]

### Gatilho
O que ativa esta skill? (palavras-chave, intenções, contextos)

### Premissas verificadas antes de agir
1. [ ] O usuário tem permissão para esta ação?
2. [ ] Os dados de entrada estão completos?
3. [ ] A API/serviço externo está disponível?

### Passos de raciocínio
1. **Entender** — Qual é a intenção real do usuário? (não apenas o que foi dito)
2. **Planejar** — Qual sequência de ações resolve o problema?
3. **Verificar** — Há riscos, dados ausentes, ambiguidades?
4. **Executar** — Realizar as ações na ordem planejada
5. **Confirmar** — O resultado atende à intenção original?

### Casos de borda
- Se [condição X] → fazer [ação Y]
- Se a API falhar → notificar usuário e registrar log

### Saída esperada
Formato exato da resposta ao usuário
```

### Prompt Registry — Versionamento de Prompts

Prompts são código-fonte do comportamento do agente. Versione-os como tal.

**Estrutura do arquivo `prompts/registry.md`:**
```markdown
# Prompt Registry

## PROMPT-001 — Classificador de Intenção
- **Versão:** 2.1.0
- **Data:** 2025-01-15
- **Intenção:** Classificar a intenção do usuário e rotear para a skill correta
- **Variáveis de entrada:** `{{message}}`, `{{history}}`, `{{available_skills}}`
- **Few-shot examples:**
  - Input: "agenda reunião amanhã 14h" → Output: `{ skill: "google-calendar-events" }`
  - Input: "me manda o resumo do dia" → Output: `{ skill: "google-calendar-daily" }`
- **Histórico de mudanças:**
  - v2.1.0 (2025-01-15): Adicionados exemplos de skills de WhatsApp → precisão +8%
  - v2.0.0 (2024-12-01): Migração para formato JSON estruturado → redução de erros de parsing 45%
  - v1.0.0 (2024-10-10): Versão inicial
- **Impacto da última mudança:** Taxa de roteamento correto: 87% → 95%
```

**Onde armazenar:** `.agents/prompts/registry.md` no repositório.

### Model Card — Documentação do Agente

Model Cards são o "manual técnico" de um agente. Documente cada agente em `.agents/agents/<nome>/MODEL_CARD.md`.

**Template de Model Card:**
```markdown
---
agent: nome-do-agente
version: 1.0.0
model_backend: gpt-4o | claude-3-5-sonnet
last_updated: YYYY-MM-DD
---

# Model Card: [Nome do Agente]

## Descrição
O que este agente faz em uma frase.

## Capacidades
- [ ] Listar o que o agente PODE fazer
- [ ] Com quais APIs/serviços ele interage

## Limitações
- [ ] O que o agente NÃO faz ou NÃO deve fazer
- [ ] Casos de borda conhecidos onde falha

## Dependências
| Dependência | Tipo | Obrigatória? | Fallback |
|---|---|---|---|
| OpenAI API | LLM | Sim | Claude API |
| Google Calendar API | Integração | Não | Mensagem de erro amigável |

## Restrições Éticas
- Não acessar dados de terceiros sem consentimento
- Não executar ações irreversíveis sem confirmação do usuário
- Não armazenar senhas ou tokens em memória conversacional

## Métricas de Performance
- Taxa de acerto na classificação: X%
- Tempo médio de resposta: Xs
- Última avaliação: YYYY-MM-DD

## Histórico de Versões
| Versão | Data | Mudança | Impacto |
|---|---|---|---|
| 1.0.0 | YYYY-MM-DD | Versão inicial | — |
```

---

## Pilar 3 — Operações Contínuas

### ADR (Architecture Decision Record)

ADRs documentam **por que** uma decisão foi tomada. Vivem em `docs/adr/`.

**Nomenclatura:** `ADR-NNNN-titulo-da-decisao.md` (ex: `ADR-0001-usar-sqlite-local.md`)

**Template ADR:**
```markdown
# ADR-NNNN: [Título da Decisão]

- **Status:** Proposto | Aceito | Deprecado | Substituído por ADR-XXXX
- **Data:** YYYY-MM-DD
- **Decidido por:** [Nome ou equipe]

## Contexto
Qual problema ou situação gerou a necessidade desta decisão?
Descreva as forças em jogo, restrições técnicas, de negócio, de prazo.

## Opções Avaliadas
1. **Opção A — [Nome]:** Descrição breve. Pro: X. Contra: Y.
2. **Opção B — [Nome]:** Descrição breve. Pro: X. Contra: Y.
3. **Opção C — [Nome]:** Descrição breve. Pro: X. Contra: Y.

## Decisão
**Escolhemos: Opção [X]** porque [razão principal].

## Consequências
### Positivas
- ...

### Negativas / Trade-offs aceitos
- ...

### Ações necessárias
- [ ] Ação 1
- [ ] Ação 2
```

**ADRs obrigatórios para este projeto:**
- Escolha de banco de dados (SQLite vs Postgres)
- Escolha de LLM provider (OpenAI vs Anthropic vs local)
- Estratégia de deploy (PM2 vs Docker vs Systemd)
- Estratégia de sync de skills (vault + submodule)
- Modelo de memória do agente (arquivo vs banco)

### Docs-as-Code (MkDocs)

Configure MkDocs para gerar um site de documentação a partir dos Markdowns do repositório.

**Estrutura recomendada do projeto:**
```
docs/
  index.md              ← README do projeto
  architecture/
    c4-context.md
    c4-containers.md
    decisions/          ← ADRs ficam aqui
      ADR-0001-*.md
  agents/
    <nome-do-agente>/
      MODEL_CARD.md
      PROMPT_REGISTRY.md
  skills/
    <nome-da-skill>/
      README.md         ← Versão legível do SKILL.md
  operations/
    deploy.md
    vps-history.md      ← Histórico de mudanças na VPS
    runbook.md          ← Como operar em produção
mkdocs.yml
```

**Template `mkdocs.yml`:**
```yaml
site_name: GueClaw — Documentação Técnica
site_description: Plataforma de agentes de IA e automação
theme:
  name: material
  palette:
    primary: indigo
  features:
    - navigation.tabs
    - navigation.top
    - search.suggest
    - content.code.copy

plugins:
  - search
  - mermaid2  # npm install @mermaid-js/mermaid-mindmap

nav:
  - Home: index.md
  - Arquitetura:
    - Contexto (C4): architecture/c4-context.md
    - Containers (C4): architecture/c4-containers.md
    - Decisões (ADR): architecture/decisions/
  - Agentes:
    - Model Cards: agents/
  - Skills:
    - Catálogo: skills/
  - Operações:
    - Deploy: operations/deploy.md
    - Histórico VPS: operations/vps-history.md
    - Runbook: operations/runbook.md

markdown_extensions:
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.tabbed
  - admonition
  - tables
```

### Histórico de Mudanças na VPS

Para capturar o histórico de operações na VPS (comandos manuais, deploys, incidentes), use o arquivo `docs/operations/vps-history.md`.

**Template de entrada:**
```markdown
## [YYYY-MM-DD HH:MM] — [Tipo: Deploy | Fix | Config | Incident]

**Operador:** [nome ou "GueClaw Agent"]
**Motivação:** [por que foi feito]

### Ações executadas
```bash
# Comandos rodados na VPS
cd /opt/gueclaw-agent
git pull origin main
pm2 restart gueclaw
```

### Resultado
[O que mudou, qual foi o impacto]

### Rollback
[Como desfazer se necessário]
```

**Script para capturar histórico automaticamente na VPS:**
```bash
# Alias útil — adicione ao .bashrc da VPS:
# logvps "Descrição do que foi feito"
logvps() {
  echo "## [$(date '+%Y-%m-%d %H:%M')] — Manual" >> /opt/gueclaw-agent/docs/operations/vps-history.md
  echo "**Operador:** $(whoami)" >> /opt/gueclaw-agent/docs/operations/vps-history.md
  echo "**Ação:** $1" >> /opt/gueclaw-agent/docs/operations/vps-history.md
  echo "" >> /opt/gueclaw-agent/docs/operations/vps-history.md
}
```

---

## Workflow de Execução desta Skill

### Passo 1 — Identificar o escopo

Pergunte ou infira:
- Qual projeto está sendo documentado?
- Qual pilar é necessário agora? (Arquitetura / Agente / Operações)
- Qual o nível de maturidade atual da documentação?

### Passo 2 — Inventário atual

```bash
# Ver docs existentes
find . -name "*.md" | grep -E "docs/|ADR|MODEL_CARD|README" | sort

# Ver histórico recente do git (últimas 20 mudanças)
git log --oneline -20

# Ver histórico na VPS
tail -100 /opt/gueclaw-agent/docs/operations/vps-history.md 2>/dev/null || echo "Sem histórico ainda"
```

### Passo 3 — Gerar documentação

Para cada tipo solicitado, use o template correspondente deste SKILL.md e preencha com o contexto real do projeto.

### Passo 4 — Persistir no repositório

```bash
# Criar estrutura de docs se não existir
mkdir -p docs/{architecture/decisions,agents,skills,operations}

# Criar/atualizar o arquivo
# (usar file_operations para criar o arquivo na VPS)

# Commitar
git add docs/
git commit -m "docs(<escopo>): <descrição da mudança>"
git push origin main
```

### Passo 5 — Sincronizar com o vault (se for skill ou agent doc)

```bash
bash scripts/sync-skills.sh push "docs: atualizar documentação de skills"
```

---

## Boas Práticas

- **Um ADR por decisão** — nunca agrupe múltiplas decisões em um ADR
- **Diagrama > Texto** para arquitetura — Mermaid renderiza direto no GitHub e MkDocs
- **COT obrigatório** para toda skill que faz chamadas externas — documenta o raciocínio esperado
- **Versionamento semântico** nos prompts — MAJOR quando muda o comportamento, MINOR para melhorias, PATCH para correções
- **Docs-as-Code** — qualquer mudança de código que altera comportamento deve incluir update da doc no mesmo commit
- **Histórico VPS** — toda operação manual na VPS deve ser registrada (disciplina de ops)
- **Model Card atualizado a cada versão de agente** — especialmente limites e dependências

---

## Perguntas para o Usuário (quando necessário)

Se o contexto não estiver claro, pergunte:

1. "Qual aspecto do projeto precisa de documentação? (Arquitetura geral, um agente específico, uma decisão técnica, histórico de operações)"
2. "Existe documentação atual que devo expandir ou estou começando do zero?"
3. "Quem vai ler isso? (outros devs, agentes de IA, equipe de ops, novo integrante)"
4. "Quer que eu gere um diagrama Mermaid ou apenas o Markdown textual?"

---

## Exemplos de Ativação

- "Cria a documentação do projeto GueClaw do zero" → Gere README + C4 Contexto + Model Card do bot principal
- "Documenta a decisão de usar SQLite" → Crie `docs/adr/ADR-0002-usar-sqlite.md`
- "Qual foi o último deploy na VPS?" → Leia `docs/operations/vps-history.md`
- "Faz o Model Card do agente de WhatsApp" → Gere `docs/agents/whatsapp-agent/MODEL_CARD.md`
- "Adiciona o histórico de mudanças de hoje na VPS" → Apende entrada em `docs/operations/vps-history.md`
- "Cria um diagrama de sequência do fluxo de envio de campanha" → Gere diagrama Mermaid sequenceDiagram
- "Registra o novo prompt de classificação no Prompt Registry" → Apende em `.agents/prompts/registry.md`
