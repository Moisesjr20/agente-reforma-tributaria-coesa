# Code Reviewer - OWASP Security Expert

**Versão:** 1.0.0  
**Framework:** OWASP Top 10 (2021-2025) + CWE Top 25  
**ROI Esperado:** R$ 15.000/projeto economizados (prevenção de vulnerabilidades)

---

## 🎯 Propósito

Esta skill transforma o GueClaw em um **especialista em segurança de código** usando padrões OWASP (Open Web Application Security Project).

**Não é um simples "revisar código"**. É uma **auditoria de segurança completa** com perspectiva de pentester.

**Resultado:**
- Detecta **vulnerabilidades críticas** ANTES de production (SQL injection, XSS, secrets expostos, etc)
- Gera **relatório de security score** (0-10) com severidade (Critical, High, Medium, Low)
- Previne **brechas de R$ 15.000+** (custo médio de incident response)
- Aplica **checklist OWASP Top 10** completo (A01-A10)

---

## 🏗️ Arquitetura Multi-Tier

```
┌─────────────────────────────────────┐
│  TIER 0: Security Orchestrator      │  ← Coordena análise completa
│  (Decide estratégia de scanning)    │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐   ┌─────▼──────┐
│ TIER 1A:   │   │ TIER 1B:   │
│ Detection  │   │ Analysis   │
│            │   │            │
│ • OWASP    │   │ • SAST     │
│ • Secrets  │   │ • Pentest  │
│ • Deps     │   │ • Code     │
└─────┬──────┘   └─────┬──────┘
      │                │
      └────────┬────────┘
               │
      ┌────────▼─────────┐
      │  TIER 1C:        │
      │  Quality Check   │  ← Valida findings
      │  (Security Score)│
      └──────────────────┘
```

**Fluxo:**
1. **Orchestrator** analisa contexto (linguagem, framework, tipo de app)
2. **Tier 1A (Detection)** aplica scanners (OWASP patterns, secret detection, dependency check)
3. **Tier 1B (Analysis)** revisa código com olhar de pentester (lógica vulnerável, bypass potencial)
4. **Tier 1C (Quality)** consolida findings + calcula Security Score (0-10)

---

## 🔐 Framework: OWASP Top 10 (2021-2025)

### **A01:2021 - Broken Access Control**
Falhas em controle de acesso (usuário acessa o que não deveria)

**Exemplos:**
- Bypass de autenticação
- Acesso a recursos de outros usuários (IDOR - Insecure Direct Object Reference)
- Elevation of privilege (user vira admin)

**Padrões detectáveis:**
```regex
# Acesso direto por ID sem validação
/api/user/\d+  # ← Sem validação se user pode acessar
SELECT \* FROM users WHERE id = \$_GET\['id'\]  # ← SQL sem auth check
```

---

### **A02:2021 - Cryptographic Failures**
Proteção inadequada de dados sensíveis

**Exemplos:**
- Senhas em plaintext
- Dados PII sem criptografia (CPF, cartão)
- Weak hashing (MD5, SHA1)

**Padrões detectáveis:**
```regex
# Hashing fraco
md5\(
sha1\(
password.*=.*["']  # Senha hardcoded

# Dados sensíveis sem encriptação
cpf|cnpj|credit.?card.*=  # ← Sem crypto
```

---

### **A03:2021 - Injection**
Entrada não sanitizada (SQL, NoSQL, Command, LDAP injection)

**Exemplos:**
- SQL Injection: `SELECT * FROM users WHERE id = '1 OR 1=1'`
- Command Injection: `os.system("ls " + user_input)`

**Padrões detectáveis:**
```regex
# SQL Injection
(SELECT|INSERT|UPDATE|DELETE).*\$_(GET|POST|REQUEST)
execute\(.*\+.*user
query.*\.format\(

# Command Injection
(os\.system|subprocess|exec|eval|shell_exec)\(.*\+
```

---

### **A04:2021 - Insecure Design**
Falhas de arquitetura (design sem threat modeling)

**Exemplos:**
- Sistema sem rate limiting (brute force possível)
- Lógica de negócios sem validação (compra por R$ -1)
- Reset password sem verificação adequada

**Detectável via:** Code review manual (não regex)

---

### **A05:2021 - Security Misconfiguration**
Configuração insegura (defaults perigosos, debug ON)

**Exemplos:**
- Debug mode em production
- Stack traces expostos
- Permissões 777
- CORS `*` (any origin)

**Padrões detectáveis:**
```regex
# Debug ON
DEBUG.*=.*True
RAILS_ENV.*development  # ← Em production

# CORS inseguro
Access-Control-Allow-Origin.*\*

# Permissões 777
chmod.*777
```

---

### **A06:2021 - Vulnerable and Outdated Components**
Dependências com CVEs conhecidas

**Exemplos:**
- Lodash < 4.17.21 (CVE-2020-28500)
- Log4j 2.x < 2.16.0 (CVE-2021-44228 - Log4Shell)

**Detectável via:** `npm audit`, `pip-audit`, dependency checkers

---

### **A07:2021 - Identification and Authentication Failures**
Falhas em autenticação/sessão

**Exemplos:**
- Session fixation
- Credentials em URL
- Brute force sem rate limit
- Weak password policy

**Padrões detectáveis:**
```regex
# Credentials em URL
password.*GET
token.*GET.*=

# Session inseguro
session.*secure.*false
SameSite.*None
```

---

### **A08:2021 - Software and Data Integrity Failures**
Falhas em integridade (updates/pipelines inseguros)

**Exemplos:**
- CI/CD sem verificação de integridade
- Deserialização insegura (pickle, yaml.load)

**Padrões detectáveis:**
```regex
# Deserialização insegura
pickle\.loads?
yaml\.load\(  # ← Unsafe (deve usar safe_load)
json\.loads.*eval
```

---

### **A09:2021 - Security Logging and Monitoring Failures**
Falta de logging/monitoramento

**Exemplos:**
- Login failure sem log
- Transactions críticas sem audit trail
- Logs sem proteção (expostos publicamente)

**Detectável via:** Ausência de logs em operações críticas

---

### **A10:2021 - Server-Side Request Forgery (SSRF)**
Servidor faz requests para onde não deveria

**Exemplos:**
- Fetch de URL fornecida por user sem validação
- Acesso a internal services (http://localhost:9000)

**Padrões detectáveis:**
```regex
# SSRF
requests\.get\(.*user
fetch\(.*\$_(GET|POST)
file_get_contents\(.*http
```

---

## 🛠️ Operação

### **Como Usar:**

```yaml
# Opção 1: Scan completo de arquivo
tarefa: "Revise este arquivo para vulnerabilidades OWASP"
arquivo: src/controllers/userController.ts

# Opção 2: Scan de projeto inteiro
tarefa: "Auditoria de segurança completa"
diretorio: src/

# Opção 3: Foco em categoria específica
tarefa: "Detecte SQL Injection em todo o projeto"
owasp_category: A03  # Injection
```

### **Processo (3 etapas):**

#### **Etapa 1: SAST (Static Application Security Testing)**

Orchestrator convoca:
- **owasp-specialist** → Aplica patterns OWASP Top 10
- **secret-detector** → Busca API keys, tokens, senhas hardcoded
- **dependency-checker** → Verifica CVEs em dependências

**Output:** Lista de findings com severidade

#### **Etapa 2: Manual Code Review**

Orchestrator convoca:
- **pentest-reviewer** → Olhar de pentester (bypass, race conditions, business logic flaws)
- **sast-analyzer** → Análise estática aprofundada

**Output:** Findings adicionais (falsos negativos do SAST)

#### **Etapa 3: Security Score**

Orchestrator convoca:
- **quality-checker** → Consolida findings + calcula score

**Score Formula:**
```
Security Score = 10 - (Critical×3 + High×1 + Medium×0.3 + Low×0.1)

Critical: Exploitável remoto, alto impacto (SQL Injection, RCE)
High: Exploitável, impacto médio (XSS stored, secret exposure)
Medium: Harder to exploit ou impacto baixo (Info disclosure, weak config)
Low: Best practices (missing security headers, verbose errors)
```

**Escala:**
- **9.0-10.0:** Excelente (production-ready)
- **7.0-8.9:** Bom (alguns fixes menores)
- **5.0-6.9:** Regular (vulnerabilidades médias, corrigir antes de deploy)
- **3.0-4.9:** Ruim (vulnerabilidades altas, NÃO deploy)
- **< 3.0:** Crítico (RCE/SQL Injection, EMERGENCY)

---

## 📊 Exemplo de Uso

### **INPUT:**

```typescript
// src/controllers/userController.ts
export async function getUser(req: Request, res: Response) {
  const userId = req.query.id;
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  const user = await db.query(query);
  return res.json(user);
}
```

### **OUTPUT:**

```markdown
# Security Audit Report

## 🚨 CRITICAL Findings (1)

### [A03] SQL Injection
**File:** src/controllers/userController.ts:3  
**Severity:** CRITICAL  
**CWE:** CWE-89

**Vulnerable Code:**
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Issue:**  
User input (`req.query.id`) concatenado diretamente no SQL. Attacker pode injetar:
```
?id=1 OR 1=1 -- 
→ SELECT * FROM users WHERE id = 1 OR 1=1 --
  (retorna TODOS os usuários)
```

**Remediation:**
```typescript
// CORRETO: Usar prepared statements
const query = 'SELECT * FROM users WHERE id = ?';
const user = await db.query(query, [userId]);
```

**CVSS Score:** 9.8 (Critical)  
**Exploitability:** Easy (automated scanners detectam)  
**Impact:** Confidentiality Loss (High), Integrity Loss (High)

---

## ⚠️ HIGH Findings (1)

### [A01] Broken Access Control (IDOR)
**File:** src/controllers/userController.ts:2-5  
**Severity:** HIGH

**Issue:**  
Nenhuma validação se `req.user.id === userId`. Qualquer user pode acessar dados de outros.

**Remediation:**
```typescript
if (req.user.id !== userId && !req.user.isAdmin) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## 📊 Security Score

**Score: 4.0 / 10** ⚠️ **RUIM**

**Breakdown:**
- Critical: 1 × 3.0 = -3.0
- High: 1 × 1.0 = -1.0
- Medium: 0
- Low: 0

**Score = 10 - 4.0 = 6.0** ❌ Não deploy

**Recommendation:**  
🚨 **NÃO FAZER DEPLOY** até corrigir SQL Injection (CRITICAL) e IDOR (HIGH).  
Tempo estimado de fix: 30-60 min

---

## ✅ Remediation Checklist

- [ ] **CRITICAL:** Fix SQL Injection em userController.ts:3 (usar prepared statements)
- [ ] **HIGH:** Adicionar access control check em getUser()
- [ ] Validar input (userId deve ser inteiro válido)
- [ ] Adicionar rate limiting (prevenir brute force de IDs)
- [ ] Adicionar audit log (acessos a dados sensíveis)

---

## 📚 References

- **OWASP Top 10 2021:** https://owasp.org/Top10/
- **CWE-89 (SQL Injection):** https://cwe.mitre.org/data/definitions/89.html
- **CWE-639 (IDOR):** https://cwe.mitre.org/data/definitions/639.html
```

---

## 🎯 Standards de Qualidade

### **Score >= 9.0:** ✅ Production-Ready
- Zero Critical/High
- Máximo 3 Medium
- Qualquer número de Low (best practices)

### **Score 7.0-8.9:** ⚠️ Revisar
- Zero Critical
- Máximo 1 High
- Deploy possível mas recomendamos fix

### **Score 5.0-6.9:** ❌ Corrigir Antes de Deploy
- Zero Critical (obrigatório)
- Máximo 3 High
- NÃO deploy sem revisão de segurança

### **Score < 5.0:** 🚨 EMERGENCY
- Contém Critical vulnerabilities
- PROIBIDO deploy
- Fix imediato obrigatório

---

## 📂 Estrutura da Skill

```
code-reviewer/
├── SKILL.md                          ← Este arquivo (orchestrator)
│
├── agents/
│   ├── security-orchestrator.md      ← Coordenador da auditoria
│   ├── owasp-specialist.md           ← Aplica OWASP Top 10 patterns
│   ├── secret-detector.md            ← Detecta API keys, tokens
│   ├── sast-analyzer.md              ← Análise estática profunda
│   ├── pentest-reviewer.md           ← Olhar de pentester
│   └── quality-checker.md            ← Calcula Security Score
│
├── tasks/
│   ├── scan-owasp-top10.md           ← Processo completo A01-A10
│   ├── detect-secrets.md             ← Buscar credentials hardcoded
│   └── analyze-dependencies.md       ← CVEs em libs/packages
│
├── checklists/
│   ├── owasp-top10.md                ← Detalhamento A01-A10
│   ├── cwe-top25.md                  ← CWE Top 25 Most Dangerous
│   └── security-score.md             ← Critérios de pontuação
│
├── patterns/
│   ├── sql-injection.regex           ← Regex patterns SQL Injection
│   ├── xss-patterns.regex            ← XSS detection patterns
│   ├── command-injection.regex       ← Command Injection patterns
│   ├── secrets.regex                 ← API keys, tokens, senhas
│   └── ssrf-patterns.regex           ← SSRF detection
│
└── data/
    ├── cve-database.json             ← CVEs conhecidas (popular via API)
    └── owasp-references.md           ← Links oficiais OWASP
```

---

## 🔧 Integração com GitWorkflow

```yaml
# Adicionar no CI/CD (.github/workflows/security-scan.yml)
name: Security Scan

on: [push, pull_request]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run OWASP Security Scan
        run: |
          # Aciona GueClaw skill code-reviewer
          curl -X POST $GUECLAW_API/skills/code-reviewer \
            -H "Authorization: Bearer $GUECLAW_TOKEN" \
            -d '{"task": "scan completo", "directory": "src/"}'
      
      - name: Check Security Score
        run: |
          if [ $SECURITY_SCORE -lt 7.0 ]; then
            echo "❌ Security Score < 7.0. Deploy bloqueado."
            exit 1
          fi
```

---

## 📚 Referências

- **OWASP Top 10 (2021):** https://owasp.org/Top10/
- **CWE Top 25 (2024):** https://cwe.mitre.org/top25/
- **OWASP ASVS:** https://owasp.org/www-project-application-security-verification-standard/
- **CVSS v3.1 Calculator:** https://www.first.org/cvss/calculator/3.1

---

## 🎯 Quando Usar Esta Skill

**USE code-reviewer quando:**
- Revisar código antes de deploy
- Auditar projeto completo (pentest interno)
- Validar PR (pull request review)
- Detectar secrets expostos (keys, tokens)
- Verificar dependências (CVEs)
- Checar compliance (OWASP, CWE, PCI-DSS)

**Resultado esperado:**
- Security Score (0-10)
- Lista de findings (Critical → Low)
- Remediation steps (como corrigir)
- Tempo estimado de fix

---

**Skill:** code-reviewer  
**Version:** 1.0.0  
**Framework:** OWASP Top 10 (2021) + CWE Top 25  
**ROI:** R$ 15.000/projeto (prevenção de incidents)
