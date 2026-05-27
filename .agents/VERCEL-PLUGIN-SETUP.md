# Vercel Plugin - Instalação no GueClaw

**Data da Instalação:** 15/04/2026  
**Versão:** Latest (commit 8db97f0)  
**Repositório:** https://github.com/vercel/vercel-plugin

## 📦 O que foi instalado

### 25 Skills do Ecossistema Vercel

Todas as skills foram copiadas para `.agents/skills/`:

#### AI & Development
- **ai-gateway** - Unified model API, provider routing, failover, cost tracking, 100+ models
- **ai-sdk** - AI SDK v6: text/object generation, streaming, tool calling, agents, MCP
- **chat-sdk** - Multi-platform chat bots (Slack, Telegram, Teams, Discord, etc.)
- **workflow** - Workflow DevKit: durable execution, DurableAgent, steps, Worlds

#### Next.js & React
- **nextjs** - App Router, Server Components, Server Actions, Cache Components
- **next-cache-components** - Next.js 16 Cache Components (PPR, use cache, cacheLife)
- **next-forge** - Production SaaS monorepo starter
- **next-upgrade** - Next.js version upgrades, codemods, migration guides
- **react-best-practices** - React/Next.js performance optimization (64 rules)
- **turbopack** - Next.js bundler, HMR, configuration

#### Vercel Platform
- **vercel-cli** - All CLI commands (deploy, env, dev, domains, cache)
- **vercel-functions** - Serverless, Edge, Fluid Compute, streaming, Cron Jobs
- **vercel-storage** - Blob, Edge Config, Neon Postgres, Upstash Redis
- **vercel-sandbox** - Firecracker microVMs for untrusted code
- **vercel-agent** - AI-powered code review, incident investigation
- **runtime-cache** - Ephemeral per-region key-value cache
- **routing-middleware** - Request interception, rewrites, redirects

#### Deployment & DevOps
- **deployments-cicd** - Deployment and CI/CD (deploy, promote, rollback)
- **env-vars** - Environment variable management
- **bootstrap** - Project bootstrapping orchestrator
- **verification** - Full-story verification (browser → API → data → response)

#### Integrations & Tools
- **marketplace** - Integration discovery, installation, auto-provisioned env vars
- **auth** - Authentication integrations (Clerk, Descope, Auth0)
- **shadcn** - shadcn/ui CLI, component installation, theming

#### Knowledge
- **knowledge-update** - Knowledge update guidance for the plugin

### 3 Agents Especialistas

Copiados para `.agents/agents/`:

- **ai-architect.md** - AI application design, model selection, streaming architecture, MCP integration
- **deployment-expert.md** - CI/CD pipelines, deploy strategies, troubleshooting, environment variables
- **performance-optimizer.md** - Core Web Vitals, rendering strategies, caching, asset optimization

### Knowledge Graph

- **vercel.md** - Relational knowledge graph do ecossistema Vercel completo

## 🎯 Como Usar

### Invocação Automática

As skills são invocadas automaticamente quando você menciona tópicos relacionados:
- "criar um app Next.js"
- "deploy para Vercel"
- "configurar AI SDK"
- "otimizar Core Web Vitals"
- "setup de autenticação com Clerk"

### Invocação Manual

Você pode invocar skills específicas mencionando o nome:
- "use a skill ai-sdk para implementar streaming"
- "aplique react-best-practices neste componente"
- "siga o vercel-cli para fazer deploy"

### Agents Especialistas

Peça para invocar um agent específico:
- "chame o ai-architect para desenhar esta feature"
- "use o deployment-expert para configurar CI/CD"
- "peça ao performance-optimizer para analisar este código"

## 📚 Cobertura do Ecossistema (Março 2026)

- ✅ Next.js 16 (App Router, Cache Components, Proxy, View Transitions)
- ✅ AI SDK v6 (Agents, MCP, DevTools, Reranking, Image Editing)
- ✅ Chat SDK (multi-platform chat bots)
- ✅ Workflow DevKit (DurableAgent, Worlds, open source)
- ✅ AI Gateway (100+ models, provider routing)
- ✅ Vercel Functions (Fluid Compute, streaming)
- ✅ Storage (Blob, Edge Config, Neon Postgres, Upstash Redis)
- ✅ Routing Middleware (Edge/Node.js/Bun runtimes)
- ✅ Runtime Cache API (per-region KV cache)
- ✅ Vercel Flags (feature flags, A/B testing)
- ✅ Vercel Queues (durable event streaming)
- ✅ Vercel Agent (AI code review)
- ✅ Vercel Sandbox (Firecracker microVMs)
- ✅ Auth integrations (Clerk, Descope, Auth0)
- ✅ shadcn/ui (CLI, component installation)
- ✅ Turborepo & Turbopack
- ✅ v0 (agentic intelligence)
- ✅ Vercel CLI (MCP integration, marketplace)

## 🔧 Localização dos Arquivos

```
.agents/
├── vercel.md                    # Knowledge graph do ecossistema
├── skills/
│   ├── ai-gateway/
│   ├── ai-sdk/
│   ├── auth/
│   ├── bootstrap/
│   ├── chat-sdk/
│   ├── deployments-cicd/
│   ├── env-vars/
│   ├── knowledge-update/
│   ├── marketplace/
│   ├── next-cache-components/
│   ├── next-forge/
│   ├── next-upgrade/
│   ├── nextjs/
│   ├── react-best-practices/
│   ├── routing-middleware/
│   ├── runtime-cache/
│   ├── shadcn/
│   ├── turbopack/
│   ├── vercel-agent/
│   ├── vercel-cli/
│   ├── vercel-functions/
│   ├── vercel-sandbox/
│   ├── vercel-storage/
│   ├── verification/
│   └── workflow/
└── agents/
    ├── ai-architect.md
    ├── deployment-expert.md
    └── performance-optimizer.md
```

## 🎉 Integração Completa

O Vercel Plugin agora está totalmente integrado ao GueClaw! Você pode:

1. **Desenvolver com Next.js 16** usando as melhores práticas mais recentes
2. **Integrar AI SDK v6** com streaming, agents e MCP
3. **Deploy profissional** com CI/CD e estratégias de rollback
4. **Otimizar performance** com Core Web Vitals e caching avançado
5. **Usar autenticação** enterprise-grade (Clerk, Descope, Auth0)
6. **Trabalhar com storage** moderno (Blob, Edge Config, Neon, Upstash)

## 📖 Documentação Oficial

- Plugin: https://github.com/vercel/vercel-plugin
- Docs: https://vercel.com/docs/agent-resources/vercel-plugin

## 🔄 Atualização Futura

Para atualizar o plugin no futuro:

```powershell
# 1. Baixar versão mais recente
cd "d:\Clientes de BI\projeto GueguelClaw"
Remove-Item -Path "tmp/vercel-plugin" -Recurse -Force -ErrorAction SilentlyContinue
git clone https://github.com/vercel/vercel-plugin.git tmp/vercel-plugin

# 2. Atualizar skills
Get-ChildItem -Path "tmp/vercel-plugin/skills" -Directory | ForEach-Object {
    $dest = ".agents/skills/$($_.Name)"
    Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
}

# 3. Atualizar agents
Copy-Item -Path "tmp/vercel-plugin/agents/*.md" -Destination ".agents/agents/" -Force

# 4. Atualizar knowledge graph
Copy-Item -Path "tmp/vercel-plugin/vercel.md" -Destination ".agents/" -Force

# 5. Limpar
Remove-Item -Path "tmp/vercel-plugin" -Recurse -Force
```

---

**Status:** ✅ Instalação completa e funcional
