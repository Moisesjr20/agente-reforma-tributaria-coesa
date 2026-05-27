# GoHighLevel API — Autenticação

Referência completa sobre os três métodos de autenticação da API v2.

---

## Tipos de Credencial

### 1. Agency API Key

- **Escopo:** Toda a agência (todas as locations)
- **Onde obter:** Agency Settings → API Keys
- **Uso:** Gerenciamento de locations, usuários globais, recursos da agência
- **Validade:** Não expira (até ser revogada)

```http
Authorization: Bearer {AGENCY_API_KEY}
Version: 2021-07-28
```

### 2. Location API Key (Sub-Account Key)

- **Escopo:** Recursos de uma única location (contatos, conversas, agendamentos, etc.)
- **Onde obter:** Sub-Account Settings → API Keys
- **Uso:** Automações específicas de uma location, webhooks, integrações de CRM
- **Validade:** Não expira (até ser revogada)

```http
Authorization: Bearer {LOCATION_API_KEY}
Version: 2021-07-28
```

### 3. OAuth 2.0

- **Escopo:** Definido pelos scopes solicitados durante a autorização
- **Onde obter:** Marketplace → My Apps → Create App
- **Uso:** Apps de marketplace, integrações multi-tenant, acesso em nome de usuários
- **Validade:** `access_token` expira em 24h; `refresh_token` em 365 dias

---

## OAuth 2.0 — Fluxo Completo

### Endpoints OAuth

```
Authorization URL: https://marketplace.gohighlevel.com/oauth/chooselocation
Token URL:         https://services.leadconnectorhq.com/oauth/token
```

### Passo 1 — Redirect para Authorization

Redirecione o usuário para:

```
https://marketplace.gohighlevel.com/oauth/chooselocation
  ?response_type=code
  &client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=contacts.readonly contacts.write calendars.readonly calendars.write
```

O usuário escolhe qual location autorizar.

### Passo 2 — Receber o Authorization Code

Após autorização, GHL redireciona para:
```
{REDIRECT_URI}?code={AUTH_CODE}&location_id={LOCATION_ID}
```

O `code` expira em **10 minutos**.

### Passo 3 — Trocar Code por Tokens

```http
POST https://services.leadconnectorhq.com/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
```

Resposta:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2...",
  "scope": "contacts.readonly contacts.write",
  "locationId": "abc123",
  "userId": "user123"
}
```

### Passo 4 — Usar o Access Token

```http
GET /contacts/?locationId=abc123
Authorization: Bearer {ACCESS_TOKEN}
Version: 2021-07-28
```

### Passo 5 — Renovar com Refresh Token

Faça isso antes do `access_token` expirar (24h):

```http
POST https://services.leadconnectorhq.com/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
```

Retorna novos `access_token` e `refresh_token`. **Salve sempre o novo refresh_token** — o antigo é invalidado.

---

## Scopes Disponíveis

### Contacts
| Scope | Permissão |
|-------|-----------|
| `contacts.readonly` | Leitura de contatos |
| `contacts.write` | Criar/editar/deletar contatos |

### Conversations
| Scope | Permissão |
|-------|-----------|
| `conversations.readonly` | Leitura de conversas e mensagens |
| `conversations.write` | Enviar mensagens |
| `conversations/message.readonly` | Histórico de mensagens |
| `conversations/message.write` | Envio de mensagens (granular) |

### Calendars
| Scope | Permissão |
|-------|-----------|
| `calendars.readonly` | Ver calendários e disponibilidade |
| `calendars.write` | Criar/editar calendários |
| `calendars/events.readonly` | Ver agendamentos |
| `calendars/events.write` | Criar/editar/cancelar agendamentos |

### Opportunities
| Scope | Permissão |
|-------|-----------|
| `opportunities.readonly` | Ver oportunidades e pipelines |
| `opportunities.write` | Criar/editar/deletar oportunidades |

### Locations
| Scope | Permissão |
|-------|-----------|
| `locations.readonly` | Ver dados da location |
| `locations.write` | Editar dados da location |
| `locations/customFields.readonly` | Ver campos customizados |
| `locations/customFields.write` | Gerenciar campos customizados |
| `locations/tags.readonly` | Ver tags |
| `locations/tags.write` | Gerenciar tags |

### Users
| Scope | Permissão |
|-------|-----------|
| `users.readonly` | Ver usuários |
| `users.write` | Criar/editar/deletar usuários |

### Forms
| Scope | Permissão |
|-------|-----------|
| `forms.readonly` | Ver formulários e submissions |

### Workflows
| Scope | Permissão |
|-------|-----------|
| `workflows.readonly` | Ver workflows |

### Payments
| Scope | Permissão |
|-------|-----------|
| `payments/orders.readonly` | Ver pedidos |
| `payments.readonly` | Ver transações e subscriptions |

### Outros
| Scope | Permissão |
|-------|-----------|
| `campaigns.readonly` | Ver campanhas |
| `funnels.readonly` | Ver funnels |
| `blogs.readonly` | Ver posts de blog |
| `medias.readonly` | Ver arquivos de mídia |
| `medias.write` | Upload de mídia |
| `social-media-posting.readonly` | Ver posts sociais |
| `social-media-posting.write` | Criar posts sociais |

---

## Criando um App OAuth no Marketplace

1. Acesse: https://marketplace.gohighlevel.com/apps
2. Clique em **Create App**
3. Preencha:
   - **App Name**: Nome da integração
   - **App Type**: `Agency` (acesso a múltiplas locations) ou `Sub-Account` (uma location)
   - **Redirect URIs**: URLs válidas para callback (ex: `https://minha-app.com/oauth/callback`)
4. Anote o **Client ID** e **Client Secret**
5. Configure os **Scopes** necessários na aba Permissions

---

## Segurança e Boas Práticas

### Armazenamento de Credenciais
- **Nunca** hardcode API Keys ou Client Secrets no código
- Use variáveis de ambiente (`.env`) ou um secret manager
- No n8n: use credenciais do tipo "Header Auth" com a chave `Authorization` = `Bearer {TOKEN}`

### Rotação de Tokens OAuth
```javascript
// Pseudocódigo para refresh automático
async function getAccessToken() {
  if (isExpired(stored.access_token)) {
    const newTokens = await refreshToken(stored.refresh_token);
    await saveTokens(newTokens); // salva novo access_token e refresh_token
    return newTokens.access_token;
  }
  return stored.access_token;
}
```

### Validação de Webhooks
GHL não envia assinatura HMAC por padrão. Para segurança:
- Use HTTPS obrigatoriamente
- Valide o `locationId` no payload contra locations conhecidas
- Implemente whitelist de IPs se possível
- Considere um token secreto na query string do webhook URL

---

## Exemplo Completo — n8n com Header Auth

**Configuração da credencial no n8n:**
- Type: `Header Auth`
- Name: `Authorization`
- Value: `Bearer SEU_TOKEN_AQUI`

**Configuração do nó HTTP Request:**
```
Method: GET
URL: https://services.leadconnectorhq.com/contacts/
Authentication: Predefined Credential Type > Header Auth
Headers:
  Version: 2021-07-28
Query Parameters:
  locationId: abc123
  limit: 20
```
