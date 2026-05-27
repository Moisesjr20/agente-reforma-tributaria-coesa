# OWASP Top 10 (2021) - Complete Checklist

**Versão:** OWASP Top 10:2021  
**Atualização:** 2025 (com tendências 2025-2026)  
**Uso:** Checklist completo para auditoria de segurança

---

## 🎯 Como Usar Este Checklist

Para cada categoria (A01-A10):
1. Leia a descrição
2. Aplique os patterns de detecção
3. Marque ✅ se OK ou ❌ se vulnerable
4. Documente findings com severidade (Critical/High/Medium/Low)

**Severidade:**
- **Critical:** Exploitável remotamente + alto impacto (RCE, SQL Injection)
- **High:** Exploitável + impacto médio (XSS stored, secrets expostos)
- **Medium:** Harder to exploit OU impacto baixo (info disclosure)
- **Low:** Best practices (missing headers, verbose errors)

---

## A01:2021 - Broken Access Control

### **O Que É:**
Usuários acessam recursos que não deveriam (dados de outros users, admin panel, etc).

### **Vulnerabilidades Comuns:**

#### **1. IDOR (Insecure Direct Object Reference)**
```yaml
Exemplo:
  URL: /api/user/123
  Problema: Qualquer user pode trocar ID e acessar dados de outro

Vulnerable Code:
  GET /api/user/:id
  user = db.query("SELECT * FROM users WHERE id = " + req.params.id)
  ← SEM checar se req.user.id === req.params.id

Remediation:
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
```

#### **2. Bypass de Autenticação**
```yaml
Exemplo:
  Rota /admin acessível sem login

Vulnerable Code:
  app.get('/admin', (req, res) => {
    // Sem middleware de auth
    return res.render('admin-panel');
  });

Remediation:
  app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
    return res.render('admin-panel');
  });
```

#### **3. Elevation of Privilege**
```yaml
Exemplo:
  User comum consegue virar admin alterando parâmetro

Vulnerable Code:
  POST /user/update
  { "role": "admin" }  ← User pode setar próprio role

Remediation:
  - Não aceitar role via input do user
  - Validar permissões server-side SEMPRE
  - Usar allow list (não deny list)
```

### **Checklist de Detecção:**

- [ ] **IDOR:** Acessar recurso de outro user trocando ID
  - Teste: `GET /api/user/123` → trocar para `/api/user/456`
  - Esperado: 403 Forbidden (se não for seu user)

- [ ] **Auth Bypass:** Rotas protegidas acessíveis sem token
  - Teste: Remover header `Authorization` e tentar acessar `/admin`
  - Esperado: 401 Unauthorized

- [ ] **Privilege Escalation:** User comum consegue virar admin
  - Teste: `PATCH /user/me {"role": "admin"}`
  - Esperado: 403 Forbidden ou campo `role` ignorado

- [ ] **Path Traversal:** Acessar arquivos fora do permitido
  - Teste: `/download?file=../../etc/passwd`
  - Esperado: 403 ou sanitização (block `../`)

### **Padrões Regex (GrepTool):**

```regex
# IDOR potencial (acesso por ID sem validação)
(req|request)\.(params|query)\.(id|userId).*(?!.*req\.user)

# Rotas sem middleware de auth
app\.(get|post|put|delete)\(['"]\/admin|['"]\/api.*(?!.*requireAuth)

# Role assignment por user input
role.*=.*(req\.|request\.)
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto no Score |
|-----------------|------------|------------------|
| IDOR (qualquer user) | High | -1.0 |
| IDOR (admin) | Critical | -3.0 |
| Auth Bypass | Critical | -3.0 |
| Privilege Escalation | Critical | -3.0 |

---

## A02:2021 - Cryptographic Failures

### **O Que É:**
Falha em proteger dados sensíveis (senhas, CPF, cartão, etc).

### **Vulnerabilidades Comuns:**

#### **1. Senhas em Plaintext**
```yaml
Vulnerable:
  INSERT INTO users (password) VALUES ('senha123')

Remediation:
  const hash = await bcrypt.hash(password, 10);
  INSERT INTO users (password) VALUES (hash)
```

#### **2. Weak Hashing (MD5, SHA1)**
```yaml
Vulnerable:
  md5(password)   ← Quebra em segundos
  sha1(password)  ← Idem

Remediation:
  bcrypt.hash(password, 10)  ← Adaptive, slow by design
  argon2.hash(password)      ← Best (vencedor PHC 2015)
```

#### **3. Dados PII sem Criptografia**
```yaml
Vulnerable:
  cpf VARCHAR(11)  ← Plaintext no banco

Remediation:
  cpf_encrypted BYTEA  ← AES-256
  + key rotation strategy
```

### **Checklist de Detecção:**

- [ ] **Passwords:** Todas as senhas com bcrypt/argon2 (não MD5/SHA1)
- [ ] **PII:** CPF, cartão, SSN criptografados (não plaintext)
- [ ] **HTTPS:** Todas as conexões TLS 1.2+ (não HTTP)
- [ ] **Secrets:** API keys não hardcoded (usar env vars)

### **Padrões Regex:**

```regex
# Weak hashing
md5\(|sha1\(|crc32\(

# Password plaintext
password.*=.*["'][^{$]

# PII plaintext (CPF brasileiro)
cpf.*=.*\d{11}(?!.*encrypt)

# Secrets hardcoded
(api_key|secret|password).*=.*["'][A-Za-z0-9]{20,}["']
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Password plaintext | Critical | -3.0 |
| Weak hashing (MD5/SHA1) | High | -1.0 |
| Secrets hardcoded | High | -1.0 |
| PII not encrypted | High | -1.0 |

---

## A03:2021 - Injection

### **O Que É:**
Entrada do usuário não sanitizada é interpretada como código.

### **Vulnerabilidades Comuns:**

#### **1. SQL Injection**
```yaml
Vulnerable:
  query = "SELECT * FROM users WHERE id = " + req.query.id
  ← Attacker: ?id=1 OR 1=1--

Remediation:
  query = "SELECT * FROM users WHERE id = ?"
  db.execute(query, [req.query.id])  ← Prepared statement
```

#### **2. Command Injection**
```yaml
Vulnerable:
  os.system("ping " + user_ip)
  ← Attacker: 8.8.8.8; rm -rf /

Remediation:
  - NUNCA concatenar user input em comandos
  - Usar libs específicas (ping lib, não shell)
  - Validar input com whitelist
```

#### **3. NoSQL Injection**
```yaml
Vulnerable:
  db.users.find({ username: req.body.username })
  ← Attacker: {"username": {"$ne": null}}  (retorna todos)

Remediation:
  - Validar tipos (username deve ser string)
  - Sanitizar MongoDB operators ($ne, $gt, etc)
```

### **Checklist de Detecção:**

- [ ] **SQL:** Todas as queries com prepared statements (não string concat)
- [ ] **Commands:** Zero `os.system()`, `exec()`, `eval()` com user input
- [ ] **NoSQL:** Input validation (tipos corretos)
- [ ] **LDAP/XML:** Input sanitizado ou usar libs seguras

### **Padrões Regex:**

```regex
# SQL Injection
(SELECT|INSERT|UPDATE|DELETE).*\+.*(req\.|request\.|params|query|body)
execute\(.*\.format\(|f["']SELECT

# Command Injection
(os\.system|exec|eval|shell_exec|subprocess\.call)\(.*\+

# NoSQL Injection (MongoDB)
db\.\w+\.(find|findOne)\({.*req\.body
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| SQL Injection | Critical | -3.0 |
| Command Injection (RCE) | Critical | -3.0 |
| NoSQL Injection | High | -1.0 |

---

## A04:2021 - Insecure Design

### **O Que É:**
Falhas de arquitetura/design (não código, mas lógica).

### **Vulnerabilidades Comuns:**

#### **1. Falta de Rate Limiting**
```yaml
Problema:
  Login endpoint sem rate limit → Brute force possível

Remediation:
  - 5 tentativas/IP a cada 15 min
  - Captcha após 3 falhas
  - Account lockout após 10 falhas
```

#### **2. Business Logic Bypass**
```yaml
Exemplo:
  Comprar produto por R$ -10 (preço negativo)

Remediation:
  - Validar preço > 0 server-side
  - NUNCA confiar em input do client
```

#### **3. Reset Password Inseguro**
```yaml
Vulnerable:
  - Token previsível (timestamp)
  - Token sem expiração
  - Token reutilizável

Remediation:  - Token crypto random (32+ bytes)
  - Expira em 1h
  - Single use (invalidar após uso)
```

### **Checklist de Detecção:**

- [ ] **Rate Limiting:** Endpoints críticos (login, API) com limite
- [ ] **Business Logic:** Validações server-side (preço, quantidade, etc)
- [ ] **Reset Password:** Token seguro + expiração + single use
- [ ] **2FA:** Disponível para contas sensíveis

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Sem rate limit (login) | High | -1.0 |
| Business logic bypass | High | -1.0 |
| Reset password inseguro | Medium | -0.3 |

---

## A05:2021 - Security Misconfiguration

### **O Que É:**
Configuração insegura (defaults, debug ON, cors *, etc).

### **Vulnerabilidades Comuns:**

#### **1. Debug Mode em Production**
```yaml
Vulnerable:
  DEBUG=True  ← Em production

Remediation:
  DEBUG=False em production (só True em dev local)
```

#### **2. CORS Permissivo**
```yaml
Vulnerable:
  Access-Control-Allow-Origin: *

Remediation:
  Access-Control-Allow-Origin: https://seuapp.com
  (whitelist específica)
```

#### **3. Stack Traces Expostos**
```yaml
Vulnerable:
  Internal Server Error
  Error: Cannot read property 'name' of undefined
    at /home/user/app/src/controllers/user.js:42:18

Remediation:
  - Logar erro completo internamente
  - Retornar erro genérico ao client:
    { "error": "Internal Server Error" }
```

### **Checklist de Detecção:**

- [ ] **Debug:** `DEBUG=False` em production
- [ ] **CORS:** Origin específica (não `*`)
- [ ] **Errors:** Stack traces não expostos
- [ ] **Headers:** Security headers presentes (HSTS, CSP, X-Frame-Options)
- [ ] **Defaults:** Senha default alterada (admin/admin)

### **Padrões Regex:**

```regex
# Debug ON
DEBUG.*=.*(True|true|1|yes)

# CORS inseguro
Access-Control-Allow-Origin.*\*

# Permissões 777
chmod.*(777|666)
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Debug ON (production) | High | -1.0 |
| CORS * | Medium | -0.3 |
| Stack traces expostos | Medium | -0.3 |
| Missing security headers | Low | -0.1 |

---

## A06:2021 - Vulnerable and Outdated Components

### **O Que É:**
Dependências com CVEs conhecidas.

### **Vulnerabilidades Comuns:**

#### **Log4Shell (CVE-2021-44228)**
```yaml
Vulnerable:
  log4j-core: 2.0-2.15.0

Remediation:
  log4j-core: >= 2.17.1
```

#### **Lodash Prototype Pollution**
```yaml
Vulnerable:
  lodash: < 4.17.21

Remediation:
  lodash: >= 4.17.21
```

### **Checklist de Detecção:**

- [ ] Rodar `npm audit` ou `pip-audit` (zero High/Critical)
- [ ] Dependências atualizadas (< 6 meses de última release)
- [ ] Packages depreciados removidos

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| CVE Critical (RCE) | Critical | -3.0 |
| CVE High | High | -1.0 |
| CVE Medium | Medium | -0.3 |

---

## A07:2021 - Identification and Authentication Failures

### **O Que É:**
Falhas em login/sessão/autenticação.

### **Vulnerabilidades Comuns:**

#### **1. Session Fixation**
```yaml
Problema:
  Session ID não regenera após login

Remediation:
  req.session.regenerate() após login bem-sucedido
```

#### **2. Credentials em URL**
```yaml
Vulnerable:
  GET /api/login?password=senha123

Remediation:
  POST /api/login
  Body: { "password": "senha123" }  ← Não em URL
```

### **Checklist de Detecção:**

- [ ] Session regenerate após login
- [ ] Password nunca em GET/URL
- [ ] Rate limiting em login (brute force)
- [ ] 2FA disponível (opcional mas recomendado)

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Session fixation | High | -1.0 |
| Password em URL | High | -1.0 |
| Sem rate limit (login) | High | -1.0 |

---

## A08:2021 - Software and Data Integrity Failures

### **O Que É:**
Falha em garantir integridade (updates inseguros, deserialização).

### **Vulnerabilidades Comuns:**

#### **1. Deserialização Insegura**
```yaml
Vulnerable:
  pickle.loads(user_input)  ← RCE
  yaml.load(user_input)     ← RCE

Remediation:
  json.loads(user_input)    ← Safe
  yaml.safe_load(user_input)  ← Safe
```

### **Checklist de Detecção:**

- [ ] Zero `pickle.loads()`, `yaml.load()` (usar `safe_load`)
- [ ] CI/CD com verificação de integridade (checksums)

### **Padrões Regex:**

```regex
pickle\.loads?
yaml\.load\((?!.*safe)
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Pickle/YAML unsafe | Critical | -3.0 |

---

## A09:2021 - Security Logging and Monitoring Failures

### **O Que É:**
Falta de logs/monitoramento (não detecta attacks).

### **Checklist de Detecção:**

- [ ] Login failures logados
- [ ] Access to sensitive data logado
- [ ] Logs protegidos (não acessíveis publicamente)
- [ ] Monitoring/alerting ativo (ex: Sentry, CloudWatch)

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| Zero logging (critical ops) | Medium | -0.3 |
| Logs expostos publicamente | High | -1.0 |

---

## A10:2021 - Server-Side Request Forgery (SSRF)

### **O Que É:**
Servidor faz request para onde não deveria (interno, localhost).

### **Vulnerabilidades Comuns:**

```yaml
Vulnerable:
  url = req.query.url
  response = requests.get(url)
  ← Attacker: ?url=http://localhost:9000/admin

Remediation:
  - Whitelist de domínios permitidos
  - Bloquear IPs privados (10.*, 192.168.*, 127.0.0.1)
```

### **Checklist de Detecção:**

- [ ] URLs de user input validadas (whitelist)
- [ ] Block private IPs (localhost, 10.*, 192.168.*)

### **Padrões Regex:**

```regex
(requests\.(get|post)|fetch|file_get_contents)\(.*(req\.|request\.)
```

### **Score Impact:**

| Vulnerabilidade | Severidade | Impacto |
|-----------------|------------|---------|
| SSRF | Critical | -3.0 |

---

## 📊 Security Score Calculation

```yaml
Base Score: 10.0

Deduct:
  - Critical: × 3.0
  - High: × 1.0
  - Medium: × 0.3
  - Low: × 0.1

Example:
  Findings: 1 Critical, 2 High, 3 Medium
  Score = 10 - (1×3 + 2×1 + 3×0.3) = 10 - 5.9 = 4.1 (RUIM)
```

**Thresholds:**
- **9.0-10.0:** ✅ Excelente
- **7.0-8.9:** ⚠️ Bom
- **5.0-6.9:** ❌ Regular (corrigir antes de deploy)
- **3.0-4.9:** 🚨 Ruim (NÃO deploy)
- **< 3.0:** 🔥 Crítico (EMERGENCY)

---

## 🎯 Quick Reference

**Top 3 Mais Perigosos (sempre verificar):**
1. **A03 - Injection** (SQL Injection = RCE possível)
2. **A01 - Broken Access Control** (acesso não autorizado)
3. **A02 - Cryptographic Failures** (dados sensíveis expostos)

**Top 3 Mais Comuns:**
1. **A05 - Security Misconfiguration** (debug ON, cors *)
2. **A07 - Auth Failures** (session fixation, weak passwords)
3. **A09 - Logging Failures** (sem audit trail)

---

**Version:** OWASP Top 10:2021  
**Source:** https://owasp.org/Top10/  
**Last Update:** 2025
