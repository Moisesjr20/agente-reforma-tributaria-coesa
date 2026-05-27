# Documentation Completeness Checklist

**Objetivo:** Garantir documentação completa (score >= 95%)  
**Total de Itens:** 22 obrigatórios (README + API + Architecture)  
**Uso:** Marcar ✅ para cada item presente, validar score no final

---

## 📚 Seção 1: README.md (12 itens)

### ✅ 1.1 - Title & Description
- [ ] **Title claro** (nome do projeto)
- [ ] **Tagline** (1 frase resumindo valor)
- [ ] **Badges** (license, build status, version) - opcional mas recomendado

**Exemplo:**
```markdown
# MyAPI

> Modern REST API for task management. Simple, fast, and scalable.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
```

---

### ✅ 1.2 - Overview
- [ ] **Descrição clara** (2-3 parágrafos)
  - O que o projeto faz
  - Por que ele existe
  - Para quem é (target audience)

**Exemplo:**
```markdown
## 🎯 Overview

MyAPI é uma API RESTful moderna para gerenciamento de tarefas...
```

---

### ✅ 1.3 - Features
- [ ] **Lista de features** (>= 3 principais)
- [ ] **Formato claro** (bullets com ✅ ou -)
- [ ] **Benefícios descritos** (não apenas "tem X", mas "tem X que faz Y")

**Exemplo:**
```markdown
## ✨ Features

- ✅ **JWT Auth** - Login seguro com tokens Bearer
- ✅ **CRUD Completo** - Create, Read, Update, Delete
- ✅ **Rate Limiting** - Proteção contra abuse
```

**Critério:** >= 3 features (ideal 5)

---

### ✅ 1.4 - Quick Start
- [ ] **Comandos claros** (3-5 comandos para rodar)
- [ ] **順序lógica** (clone → install → configure → run)
- [ ] **Resultado esperado** ("Pronto! Rodando em http://...")

**Exemplo:**
```markdown
## 🚀 Quick Start

```bash
git clone https://github.com/user/repo
cd repo
npm install
cp .env.example .env
npm run dev
```

✅ Pronto! API em http://localhost:3000
```

**Critério:** Deve ser possível rodar projeto em < 5 minutos seguindo apenas esses comandos

---

### ✅ 1.5 - Installation
- [ ] **Requirements** (Node.js version, database, etc)
- [ ] **Dependências principais** listadas
- [ ] **Comando de instalação** (`npm install`, `pip install`, etc)

**Exemplo:**
```markdown
## 📦 Installation

### Requirements
- Node.js >= 18.0.0
- PostgreSQL >= 14.0

### Install
```bash
npm install
```
```

---

### ✅ 1.6 - Configuration
- [ ] **Variáveis de ambiente** (.env documentadas)
- [ ] **Valores de exemplo** (não valores reais/secrets)
- [ ] **Instruções de setup** (database, migrations, etc)

**Exemplo:**
```markdown
## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
JWT_SECRET="your-secret-key"
PORT=3000
```

### Database Setup

```bash
npx prisma migrate dev
```
```

**Critério:** Todas as env vars obrigatórias documentadas

---

### ✅ 1.7 - Usage
- [ ] **Exemplos práticos** (code ou curl)
- [ ] **Mínimo 2 exemplos** (basic + advanced ou casos de uso principais)
- [ ] **Output esperado** mostrado

**Exemplo:**
```markdown
## 📖 Usage

### Basic Example

```typescript
const user = await createUser({ name: 'João', email: 'joao@...' });
console.log(user);  // { id: 1, name: 'João', ... }
```

### API Example

```bash
curl http://localhost:3000/api/users
```
```

---

### ✅ 1.8 - Architecture
- [ ] **Tech stack listado** (linguagem, framework, database, etc)
- [ ] **Diagrama de sistema** (Mermaid, imagem, ou texto visual)
- [ ] **Folder structure** explicada
- [ ] **Data flow** (opcional mas recomendado)

**Exemplo:**
```markdown
## 🏗️ Architecture

### Tech Stack
- Runtime: Node.js 20
- Framework: Express
- Database: PostgreSQL

### System Diagram

```mermaid
graph TB
    Client --> API
    API --> Database
```

### Folder Structure
```
src/
├── controllers/
├── services/
└── models/
```
```

**Critério:** Tech stack + (diagrama OU folder structure)

---

### ✅ 1.9 - API Reference
- [ ] **Endpoints principais** listados (completo ou resumo)
- [ ] **Link para docs completos** (se API grande)

**Exemplo:**
```markdown
## 🔌 API Reference

### Endpoints

- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

[Full API Documentation →](./docs/API.md)
```

**Critério:** Pelo menos endpoints principais OU link para docs completos

---

### ✅ 1.10 - Testing
- [ ] **Como rodar testes** (`npm test`, `pytest`, etc)
- [ ] **Coverage mínimo** (se aplicável)
- [ ] **Estrutura de testes** (opcional)

**Exemplo:**
```markdown
## 🧪 Testing

```bash
npm test               # Run all tests
npm run test:coverage  # With coverage
```

**Coverage:** >= 80%
```

---

### ✅ 1.11 - Contributing
- [ ] **Como contribuir** (fork → branch → PR)
- [ ] **Code style** (linter, formatter, conventions)
- [ ] **Commit guidelines** (Conventional Commits recomendado)

**Exemplo:**
```markdown
## 🤝 Contributing

1. Fork & clone
2. Create branch: `git checkout -b feature/nome`
3. Commit: `git commit -m "feat: descrição"`
4. Push & open PR

**Code Style:** ESLint + Prettier
```

---

### ✅ 1.12 - License
- [ ] **Licença especificada** (MIT, Apache, GPL, etc)
- [ ] **Link para LICENSE file**

**Exemplo:**
```markdown
## 📄 License

MIT License. See [LICENSE](./LICENSE).
```

**Critério:** Licença clara (mesmo que "Proprietary" ou "All Rights Reserved")

---

### ✅ 1.13 - Support
- [ ] **Links úteis** (docs, community, issues)
- [ ] **Contato** (email, Discord, etc) - opcional mas recomendado

**Exemplo:**
```markdown
## 📞 Support

- 📖 [Documentation](./docs/)
- 💬 [Discord](https://discord.gg/...)
- 🐛 [Issues](https://github.com/.../issues)
- 📧 [Email](mailto:contact@...)
```

---

## 🔌 Seção 2: API Documentation (6 itens)

**Aplicável se:** Projeto tem API REST/GraphQL

### ✅ 2.1 - Authentication
- [ ] **Método de auth documentado** (Bearer, API Key, OAuth)
- [ ] **Como obter token/key** (se necessário)

**Exemplo:**
```markdown
## Authentication

All endpoints require Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get token via `POST /auth/login`.
```

---

### ✅ 2.2 - Endpoints List
- [ ] **Todos os endpoints listados** (>= 90% cobertura)
- [ ] **Método HTTP** (GET, POST, PUT, DELETE)
- [ ] **Path** (/api/users/:id)

**Exemplo:**
```markdown
## Endpoints

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
```

**Critério:** >= 90% dos endpoints (se muitos, pelo menos os principais)

---

### ✅ 2.3 - Parameters
- [ ] **Parâmetros documentados** (query, path, body)
- [ ] **Tipos** (string, int, optional)
- [ ] **Descrição** de cada parâmetro

**Exemplo:**
```markdown
### GET /api/users

**Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 10)
- `search` (string, optional): Search by name
```

---

### ✅ 2.4 - Responses
- [ ] **Response examples** (JSON, XML, etc)
- [ ] **Success response** (200, 201)
- [ ] **Status codes** documentados

**Exemplo:**
```markdown
**Response (200):**

```json
{
  "data": [
    { "id": 1, "name": "João", "email": "joao@..." }
  ],
  "pagination": { "page": 1, "total": 100 }
}
```
```

---

### ✅ 2.5 - Errors
- [ ] **Error responses** documentados
- [ ] **Error codes** (400, 401, 404, 500)
- [ ] **Error format** (JSON structure)

**Exemplo:**
```markdown
**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Token missing/invalid
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Error Format:**
```json
{
  "error": "Invalid input",
  "details": ["Email is required"]
}
```
```

---

### ✅ 2.6 - Code Examples
- [ ] **Exemplos de uso** (curl, fetch, axios, SDK)
- [ ] **Mínimo 2 exemplos** (diferentes linguagens ou tools)

**Exemplo:**
```markdown
**Example (curl):**

```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.exemplo.com/api/users
```

**Example (JavaScript):**

```javascript
const response = await fetch('https://api.exemplo.com/api/users', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const users = await response.json();
```
```

---

## 🏗️ Seção 3: Architecture Documentation (4 itens)

### ✅ 3.1 - Tech Stack
- [ ] **Stack completo listado**
  - Runtime (Node, Python, Go)
  - Framework (Express, FastAPI, Gin)
  - Database (PostgreSQL, MongoDB)
  - Cache (Redis, Memcached)
  - Outros (auth, queue, etc)

**Exemplo:**
```markdown
## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Framework | Express 4.18 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT |
```

---

### ✅ 3.2 - System Diagram
- [ ] **Diagrama de sistema** (Mermaid, imagem, ou C4)
- [ ] **Componentes principais** representados
- [ ] **Comunicação entre componentes** (setas)

**Exemplo:**
```markdown
## System Diagram (C4 Level 2)

```mermaid
graph TB
    Client[Client] --> API[API Server]
    API --> DB[(Database)]
    API --> Cache[(Redis)]
```
```

**Critério:** Diagrama visual (não apenas texto)

---

### ✅ 3.3 - Folder Structure
- [ ] **Estrutura de pastas** documentada
- [ ] **Descrição de cada pasta** (1 linha)

**Exemplo:**
```markdown
## Folder Structure

```
src/
├── controllers/     ← HTTP route handlers
├── services/        ← Business logic
├── models/          ← Database models
├── middleware/      ← Express middlewares
└── utils/           ← Helpers
```
```

---

### ✅ 3.4 - Data Flow
- [ ] **Fluxo de dados explicado** (request → response)
- [ ] **Camadas/layers** mencionadas

**Exemplo:**
```markdown
## Data Flow

1. Client → HTTP Request → API Server
2. Middleware → Auth validation
3. Controller → Service layer
4. Service → Database (via ORM)
5. Database → Response → Client
```

**Critério:** Fluxo claro (pode ser diagrama ou lista numerada)

---

## 📊 Scoring System

### **Cálculo de Completeness:**

```yaml
README: 12 itens (mínimo 11 para 95%)
API Docs: 6 itens (se aplicável, mínimo 5 para 95%)
Architecture: 4 itens (mínimo 4 para 95%)

Total Máximo: 22 itens

Score = (Itens presentes / Itens aplicáveis) × 100%
```

### **Exemplo:**

```yaml
# Projeto com API (22 itens aplicáveis)
README: 12/12 ✅
API Docs: 6/6 ✅
Architecture: 4/4 ✅

Score = (22/22) × 100% = 100% ✅ EXCELENTE
```

```yaml
# Projeto sem API (16 itens aplicáveis)
README: 11/12 ⚠️ (faltando "Support")
API Docs: N/A
Architecture: 4/4 ✅

Score = (15/16) × 100% = 93.75% ⚠️ BOM (próximo de 95%)
```

---

## ✅ Critérios de Aprovação

### **Score >= 95%:** ✅ EXCELENTE (Production-Ready)
- Documentação completa, profissional
- Zero seções críticas faltando
- Pronto para release/open source

### **Score 85-94%:** ⚠️ BOM (Revisar)
- 1-2 seções secundárias faltando
- Docs utilizáveis mas podem melhorar
- OK para uso interno

### **Score 70-84%:** ❌ REGULAR (Incompleto)
- Várias seções importantes faltando
- README básico mas insuficiente
- NÃO recomendado para público externo

### **Score < 70%:** 🚨 RUIM (Inaceitável)
- Docs muito incompletos
- Dificulta onboarding
- NÃO publicar/compartilhar

---

## 🎯 Quick Check (1 Minuto)

**Para validação rápida, verifique apenas itens CRÍTICOS:**

- [ ] ⚠️ **README existe** (não vazio)
- [ ] ⚠️ **Overview claro** (2+ parágrafos)
- [ ] ⚠️ **Quick Start** (3-5 comandos para rodar)
- [ ] ⚠️ **Installation** (requirements + install)
- [ ] ⚠️ **Configuration** (.env vars documentadas)
- [ ] ⚠️ **Usage** (>= 1 exemplo)
- [ ] ⚠️ **Architecture** (tech stack OU diagrama)
- [ ] ⚠️ **License** (especificada)

**Se TODOS ✅ → Score provavelmente >= 85%**

**Se algum ❌ → Score < 85%, revisar**

---

## 📚 References

- **Template:** README-template.md (100% complete)
- **Best Practices:** https://readme.so, https://makeareadme.com
- **C4 Model:** https://c4model.com
- **Badges:** https://shields.io

---

**Checklist Version:** 1.0.0  
**Total Items:** 22 (README: 12, API: 6, Architecture: 4)  
**Target Score:** >= 95%
