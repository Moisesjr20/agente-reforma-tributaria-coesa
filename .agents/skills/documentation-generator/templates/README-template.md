# README Template - Complete & Professional

**Uso:** Template com 12 seções obrigatórias para documentação completa  
**Completeness:** 100% (todas as seções essenciais)  
**Instrução:** Substituir `[...]` com informações reais do projeto

---

```markdown
# [Project Name]

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/[usuario]/[repo]/ci.yml)](https://github.com/[usuario]/[repo]/actions)
[![npm version](https://img.shields.io/npm/v/[package-name].svg)](https://www.npmjs.com/package/[package-name])

> [Tagline curta: uma frase que resume o projeto em valor]

---

## 🎯 Overview

[Descrição clara de 2-3 parágrafos explicando:]
- O que o projeto faz (problema que resolve)
- Por que ele existe (motivação)
- Para quem é (target audience)

**Example:**
> **MyAPI** é uma API RESTful moderna para gerenciamento de tarefas, construída com Node.js e TypeScript. Criada para times que precisam de uma solução simples mas escalável, sem a complexidade de ferramentas enterprise. Ideal para startups e projetos side hustle que querem começar rápido.

---

## ✨ Features

- ✅ **[Feature 1]** - [Breve descrição do benefício]
- ✅ **[Feature 2]** - [Breve descrição do benefício]
- ✅ **[Feature 3]** - [Breve descrição do benefício]
- ✅ **[Feature 4]** - [Breve descrição do benefício]
- ✅ **[Feature 5]** - [Breve descrição do benefício]

**Example:**
- ✅ **Autenticação JWT** - Login seguro com tokens Bearer
- ✅ **CRUD Completo** - Create, Read, Update, Delete para todas entidades
- ✅ **Rate Limiting** - Proteção contra abuse (100 req/min)
- ✅ **TypeScript** - Type-safe, menos bugs em production
- ✅ **Docker Ready** - Deploy com 1 comando

---

## 🚀 Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/[usuario]/[repo].git
cd [repo]

# 2. Instale dependências
npm install  # ou: yarn install, pnpm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Inicie o servidor
npm run dev

# ✅ Pronto! API rodando em http://localhost:3000
```

**Tempo total:** ~5 minutos

---

## 📦 Installation

### **Requirements**

- [Node.js](https://nodejs.org/) >= 18.0.0
- [PostgreSQL](https://www.postgresql.org/) >= 14.0
- [Redis](https://redis.io/) >= 7.0 (opcional, para cache)

### **Install Dependencies**

```bash
npm install
```

**Key Dependencies:**
- `express` - Web framework
- `prisma` - ORM (database)
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `zod` - Input validation

---

## 🔧 Configuration

### **Environment Variables**

Crie um arquivo `.env` na raiz do projeto:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Server
PORT=3000
NODE_ENV=development  # ou: production

# JWT
JWT_SECRET="your-super-secret-key-change-this"
JWT_EXPIRES_IN="7d"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"
```

### **Database Setup**

```bash
# 1. Rode migrations
npx prisma migrate dev

# 2. (Opcional) Seed database com dados de exemplo
npm run seed
```

---

## 📖 Usage

### **Basic Example**

```typescript
import { createUser } from './api/users';

// Criar um usuário
const user = await createUser({
  name: 'João Silva',
  email: 'joao@exemplo.com',
  password: 'senha-segura-123'
});

console.log(user);
// Output: { id: 1, name: 'João Silva', email: 'joao@...', createdAt: '...' }
```

### **API Usage**

```bash
# 1. Fazer login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@exemplo.com", "password": "senha-segura-123"}'

# Response:
# { "token": "eyJhbGciOiJIUzI1NiIsInR5c..." }

# 2. Usar token para acessar recursos protegidos
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c..."

# Response:
# { "id": 1, "name": "João Silva", "email": "joao@..." }
```

### **More Examples**

- [CRUD Operations](./docs/examples/crud.md)
- [Authentication Flow](./docs/examples/auth.md)
- [Error Handling](./docs/examples/errors.md)

---

## 🏗️ Architecture

### **Tech Stack**

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20.x |
| **Language** | TypeScript 5.x |
| **Framework** | Express.js 4.18 |
| **Database** | PostgreSQL 15 |
| **ORM** | Prisma 5.x |
| **Cache** | Redis 7.x |
| **Auth** | JWT (jsonwebtoken) |
| **Validation** | Zod |
| **Testing** | Jest + Supertest |
| **Docs** | Swagger/OpenAPI |

### **System Diagram (C4 Level 2)**

```mermaid
graph TB
    Client[Client<br/>Web/Mobile Apps]
    API[API Server<br/>Express.js<br/>:3000]
    DB[(PostgreSQL<br/>Database)]
    Cache[(Redis<br/>Cache)]
    Email[Email Service<br/>SMTP]
    
    Client -->|HTTPS<br/>REST API| API
    API -->|SQL<br/>Prisma ORM| DB
    API -->|Cache<br/>Get/Set| Cache
    API -->|Send Email| Email
    
    style API fill:#4A90E2
    style DB fill:#336791
    style Cache fill:#DC382D
```

### **Folder Structure**

```
src/
├── controllers/       ← HTTP route handlers (req/res)
│   ├── authController.ts
│   ├── userController.ts
│   └── taskController.ts
├── services/          ← Business logic (domain layer)
│   ├── authService.ts
│   ├── userService.ts
│   └── emailService.ts
├── models/            ← Database models (Prisma schema)
│   └── schema.prisma
├── middleware/        ← Express middlewares
│   ├── auth.ts           ← JWT validation
│   ├── validate.ts       ← Zod validation
│   └── errorHandler.ts   ← Global error handler
├── utils/             ← Helper functions
│   ├── logger.ts
│   ├── validators.ts
│   └── crypto.ts
├── config/            ← Configuration
│   ├── database.ts
│   └── env.ts
├── types/             ← TypeScript types/interfaces
│   └── index.ts
└── server.ts          ← App entry point
```

### **Data Flow (Typical Request)**

```
1. Client → HTTP Request → Express Server
   └─> Middleware: CORS, body-parser, logger

2. Middleware: Auth (JWT validation)
   └─> Verify token → req.user

3. Middleware: Validation (Zod schemas)
   └─> Validate input → 400 se inválido

4. Controller (route handler)
   └─> Chama Service layer

5. Service (business logic)
   └─> Chama Prisma ORM → Database

6. Database → Return data → Service → Controller

7. Controller → JSON Response → Client
```

### **Key Design Decisions**

- **TypeScript:** Type safety reduz bugs em 40% (nosso histórico)
- **Prisma:** ORM type-safe, migrations automáticas
- **Layered Architecture:** Controller → Service → Model (separation of concerns)
- **Zod:** Validation em runtime (TypeScript é compile-time apenas)

---

## 🔌 API Reference

### **Authentication**

Todos os endpoints (exceto `/auth/login` e `/auth/register`) requerem autenticação via Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### **Endpoints**

#### **Auth**
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Login (retorna JWT)
- `POST /auth/refresh` - Renovar token

#### **Users**
- `GET /api/users` - Listar usuários (admin only)
- `GET /api/users/:id` - Obter usuário por ID
- `GET /api/users/me` - Obter usuário logado
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

#### **Tasks**
- `GET /api/tasks` - Listar minhas tasks
- `POST /api/tasks` - Criar task
- `PUT /api/tasks/:id` - Atualizar task
- `DELETE /api/tasks/:id` - Deletar task

**[Veja documentação completa da API →](./docs/API.md)**

**[Swagger/OpenAPI →](http://localhost:3000/api-docs)** (quando servidor rodando)

---

## 🧪 Testing

### **Run Tests**

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- userService.test.ts

# Watch mode (re-run on change)
npm test -- --watch
```

### **Test Structure**

```
tests/
├── unit/              ← Unit tests (services, utils)
│   ├── userService.test.ts
│   └── validators.test.ts
├── integration/       ← Integration tests (API endpoints)
│   ├── auth.test.ts
│   └── users.test.ts
└── setup.ts           ← Test setup (DB, mocks)
```

### **Coverage Requirements**

- **Statements:** >= 80%
- **Branches:** >= 75%
- **Functions:** >= 80%
- **Lines:** >= 80%

---

## 🤝 Contributing

Adoramos contribuições! Siga esses passos:

### **1. Fork & Clone**

```bash
# 1. Fork este repo (clique "Fork" no GitHub)

# 2. Clone seu fork
git clone https://github.com/SEU-USUARIO/[repo].git
cd [repo]

# 3. Adicione upstream
git remote add upstream https://github.com/[usuario-original]/[repo].git
```

### **2. Create Branch**

```bash
# Crie branch descritiva
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

### **3. Make Changes**

- Escreva código limpo (siga [Code Style](#code-style))
- Adicione testes (coverage >= 80%)
- Rode linter: `npm run lint`
- Rode tests: `npm test`

### **4. Commit**

```bash
# Use Conventional Commits
git commit -m "feat: adiciona endpoint de busca de tasks"
git commit -m "fix: corrige validação de email"
git commit -m "docs: atualiza README com novos endpoints"
```

**Formato:** `<type>: <description>`

**Types:**
- `feat:` Nova feature
- `fix:` Bug fix
- `docs:` Documentação
- `test:` Testes
- `refactor:` Refatoração (sem mudar comportamento)
- `chore:` Manutenção (deps, config)

### **5. Push & PR**

```bash
git push origin feature/nome-da-feature
```

Abra Pull Request no GitHub com:
- Título claro
- Descrição do que mudou
- Screenshots (se UI)
- Relaciona issues (`Closes #123`)

### **Code Style**

- **TypeScript:** Strict mode enabled
- **Linter:** ESLint + Prettier
- **Naming:**
  - `camelCase` para variáveis/funções
  - `PascalCase` para classes/types
  - `UPPER_CASE` para constantes
- **Max line:** 100 caracteres
- **Indent:** 2 espaços

**[Veja guia completo →](./docs/CONTRIBUTING.md)**

---

## 📄 License

Este projeto está sob licença **MIT**. Veja [LICENSE](./LICENSE) para detalhes.

```
MIT License

Copyright (c) 2026 [Seu Nome]

Permission is hereby granted, free of charge, to any person obtaining a copy...
[texto completo da licença]
```

---

## 📞 Support

### **Documentação**
- [API Reference](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [FAQ](./docs/FAQ.md)

### **Comunidade**
- 💬 [Discord](https://discord.gg/seu-server) - Chat em tempo real
- 🐛 [Issues](https://github.com/[usuario]/[repo]/issues) - Bugs e feature requests
- 📧 [Email](mailto:contato@exemplo.com) - Contato direto

### **Changelog**
Veja [CHANGELOG.md](./CHANGELOG.md) para histórico de mudanças.

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Prisma](https://www.prisma.io/) - Amazing ORM
- [Zod](https://zod.dev/) - Schema validation
- [Contributors](https://github.com/[usuario]/[repo]/graphs/contributors) - Thank you! ❤️

---

**Made with ❤️ by [Seu Nome](https://github.com/seu-usuario)**

[⬆ Back to Top](#project-name)
```

---

## 📊 Completeness Checklist

Este template cobre todas as 12 seções obrigatórias:

- [x] **Title & Badges** (linha 1-6)
- [x] **Overview** (descrição clara)
- [x] **Features** (>= 5 features)
- [x] **Quick Start** (3-5 comandos)
- [x] **Installation** (requirements + dependencies)
- [x] **Configuration** (.env vars + database setup)
- [x] **Usage** (3 exemplos práticos)
- [x] **Architecture** (tech stack + diagram + folder structure)
- [x] **API Reference** (endpoints principais ou link)
- [x] **Testing** (como rodar + coverage)
- [x] **Contributing** (guidelines + code style)
- [x] **License** (especificada)
- [x] **Support** (docs + comunidade + contato)

**Completeness Score:** 100%

---

## 🎯 Como Usar Este Template

1. **Copie o template** completo
2. **Substitua** todos os `[...]` com info real do projeto:
   - `[Project Name]` → Nome do seu projeto
   - `[usuario]` → Seu user GitHub
   - `[repo]` → Nome do repositório
   - etc.
3. **Customize** seções conforme necessário:
   - Adicione mais features
   - Detalhe tech stack
   - Adicione diagramas específicos
4. **Valide** completeness (>= 95%)

---

**Template Version:** 1.0.0  
**Last Updated:** 2026  
**Completeness:** 100% (12/12 seções)
