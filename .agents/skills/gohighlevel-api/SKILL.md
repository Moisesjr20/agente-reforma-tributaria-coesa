---
name: gohighlevel-api
description: Especialista em API GoHighLevel (GHL). Use sempre que o usuário precisar integrar, automatizar, consultar, criar ou modificar qualquer recurso do GoHighLevel via API — contatos, agendamentos, calendários, conversas, oportunidades, workflows, funnels, pagamentos, usuários, subaccounts ou qualquer outro endpoint. Inclui autenticação OAuth 2.0, Agency API Key, Location API Key, construção de requests, troubleshooting de erros e boas práticas. Acione esta skill para qualquer menção a GHL, GoHighLevel, HighLevel, LeadConnector ou CRM de automação de marketing.
---

# GoHighLevel API — Skill

Skill para trabalhar com a API REST do GoHighLevel (GHL), cobrindo autenticação, endpoints principais, padrões de integração e resolução de problemas.

Referências detalhadas:
- `references/auth.md` — Autenticação: Agency Key, Location Key, OAuth 2.0
- `references/endpoints.md` — Catálogo completo de endpoints por recurso

---

## Base URLs

| Versão | Base URL |
|--------|----------|
| **v2** (atual, preferida) | `https://services.leadconnectorhq.com` |
| v1 (legada) | `https://rest.gohighlevel.com/v1` |

Sempre prefira a **v2**. A v1 está em processo de depreciação para novos desenvolvimentos.

---

## Autenticação — Resumo rápido

Leia `references/auth.md` para detalhes completos. Resumo:

```
Authorization: Bearer {API_KEY ou ACCESS_TOKEN}
Version: 2021-07-28
```

Três tipos de credencial:

| Tipo | Escopo | Quando usar |
|------|--------|-------------|
| **Agency API Key** | Toda a agência | Gerenciar locations, usuários globais |
| **Location API Key** | Uma sub-account | Contatos, conversas, agendamentos de uma location |
| **OAuth 2.0 Access Token** | Definido pelos scopes | Apps de marketplace, integrações de terceiros |

---

## Headers Obrigatórios

```http
Authorization: Bearer {TOKEN}
Content-Type: application/json
Version: 2021-07-28
```

O header `Version` é obrigatório em todos os requests v2. Sem ele, a API pode retornar comportamento inesperado.

---

## Recursos Principais — Endpoints Resumidos

Leia `references/endpoints.md` para a referência completa. Abaixo os recursos mais utilizados.

### Contacts

```
GET    /contacts/{contactId}
POST   /contacts/
PUT    /contacts/{contactId}
DELETE /contacts/{contactId}
GET    /contacts/?locationId={id}&query={q}
POST   /contacts/{contactId}/tags
POST   /contacts/upsert
```

### Conversations & Messages

```
GET    /conversations/{conversationId}
POST   /conversations/
GET    /conversations/search?locationId={id}
POST   /conversations/messages
GET    /conversations/messages/{conversationId}
```

### Calendars & Appointments

```
GET    /calendars/?locationId={id}
GET    /calendars/{calendarId}
GET    /calendars/events?locationId={id}&startTime={ts}&endTime={ts}
POST   /calendars/events/appointments
GET    /calendars/events/appointments/{eventId}
PUT    /calendars/events/appointments/{eventId}
DELETE /calendars/events/appointments/{eventId}
GET    /calendars/{calendarId}/free-slots?startDate={ts}&endDate={ts}
```

### Opportunities (Pipeline)

```
GET    /opportunities/search?location_id={id}
POST   /opportunities/
GET    /opportunities/{id}
PUT    /opportunities/{id}
DELETE /opportunities/{id}
PUT    /opportunities/{id}/status
```

### Locations (Sub-Accounts)

```
GET    /locations/{locationId}
POST   /locations/
PUT    /locations/{locationId}
GET    /locations/search?companyId={id}
```

### Users

```
GET    /users/{userId}
POST   /users/
PUT    /users/{userId}
DELETE /users/{userId}
GET    /users/?companyId={id}
GET    /users/location/{locationId}
```

### Forms & Surveys

```
GET    /forms/?locationId={id}
GET    /forms/submissions?locationId={id}&formId={id}
GET    /surveys/?locationId={id}
GET    /surveys/submissions?locationId={id}
```

### Workflows

```
GET    /workflows/?locationId={id}
POST   /contacts/{contactId}/workflow/{workflowId}
DELETE /contacts/{contactId}/workflow/{workflowId}
```

### Payments

```
GET    /payments/orders?locationId={id}
GET    /payments/orders/{orderId}
GET    /payments/transactions?locationId={id}
GET    /payments/subscriptions?locationId={id}
```

---

## Padrões de Paginação

A maioria dos endpoints de listagem usa paginação via `limit` e `startAfter` ou `page`:

```http
GET /contacts/?locationId=abc123&limit=20&startAfter=<lastId>
```

Parâmetros comuns:
- `limit` — número de itens por página (máximo geralmente 100)
- `startAfter` — ID do último item para cursor-based pagination
- `page` — paginação numérica (alguns endpoints)

Sempre verifique o campo `meta.nextPageUrl` ou `meta.total` na resposta para saber se há mais páginas.

---

## Formato de Resposta Padrão

```json
{
  "contact": { ... },         // ou o recurso principal
  "traceId": "abc-123",
  "meta": {
    "total": 150,
    "currentPage": 1,
    "nextPageUrl": "..."
  }
}
```

Erros retornam com HTTP 4xx/5xx:
```json
{
  "statusCode": 422,
  "message": "Unprocessable Entity",
  "error": "...",
  "traceId": "..."
}
```

---

## Tratamento de Erros Comuns

| Código | Causa provável | Solução |
|--------|----------------|---------|
| `401 Unauthorized` | Token inválido ou expirado | Renovar OAuth token ou verificar API Key |
| `403 Forbidden` | Escopo insuficiente | Adicionar scope necessário no OAuth |
| `404 Not Found` | ID errado ou location incorreta | Verificar o ID e o locationId |
| `422 Unprocessable` | Campos obrigatórios faltando ou formato errado | Verificar body do request |
| `429 Too Many Requests` | Rate limit atingido | Aguardar e usar retry com backoff |
| `500 Internal Server` | Erro no servidor GHL | Tentar novamente; abrir suporte se persistir |

---

## Rate Limits

- **v2 API**: ~100 requests/10 segundos por location
- Use **exponential backoff** ao receber 429
- Para operações em lote (bulk), espaçe os requests ou use webhooks para evitar polling

---

## Webhooks — Eventos Disponíveis

O GHL envia webhooks para os seguintes eventos:

```
ContactCreate, ContactUpdate, ContactDelete
ConversationUnreadUpdate
InboundMessage, OutboundMessage
AppointmentCreate, AppointmentUpdate, AppointmentDelete
NoteCreate, TaskCreate
OpportunityCreate, OpportunityUpdate, OpportunityDelete
FormSubmission, SurveySubmission
```

**Configuração:** Settings → Integrations → Webhooks (dentro da location)

Payload padrão:
```json
{
  "type": "ContactCreate",
  "locationId": "...",
  "id": "...",
  "data": { ... },
  "timestamp": 1234567890
}
```

---

## OAuth 2.0 — Fluxo Resumido

Leia `references/auth.md` para o fluxo completo. Resumo:

1. Redirecionar usuário para authorization URL
2. Receber `code` no redirect_uri
3. Trocar `code` por `access_token` + `refresh_token`
4. Usar `access_token` no header `Authorization: Bearer`
5. Renovar com `refresh_token` antes de expirar (24h)

**Token endpoint:** `POST https://services.leadconnectorhq.com/oauth/token`

---

## Upsert de Contato (padrão recomendado)

Para evitar duplicatas, sempre use upsert ao criar/atualizar contatos:

```http
POST /contacts/upsert
Content-Type: application/json
Authorization: Bearer {TOKEN}
Version: 2021-07-28

{
  "locationId": "abc123",
  "email": "user@example.com",
  "phone": "+5511999999999",
  "firstName": "João",
  "lastName": "Silva",
  "tags": ["lead", "n8n"],
  "customFields": [
    { "id": "field_id_aqui", "value": "valor" }
  ]
}
```

---

## Custom Fields

Custom fields são identificados pelo `id` interno. Para descobrir os IDs:

```http
GET /locations/{locationId}/customFields
```

Resposta:
```json
{
  "customFields": [
    { "id": "abc123", "name": "CPF", "fieldKey": "contact.cpf", "dataType": "TEXT" }
  ]
}
```

---

## Integração com n8n

Ao construir automações no n8n com GHL:

1. Use o nó **HTTP Request** com autenticação por header
2. Configure `Authorization: Bearer {{$credentials.token}}` e `Version: 2021-07-28`
3. Para webhooks, use nó **Webhook** + valide o payload pelo campo `type`
4. Prefira upsert de contato ao invés de create para evitar duplicatas
5. Use o nó **Split In Batches** para operações em lote respeitando rate limits

---

## Documentação Oficial

- API Reference v2: https://highlevel.stoplight.io/docs/integrations/
- Marketplace Docs: https://marketplace.gohighlevel.com/docs/
- OAuth Apps: https://marketplace.gohighlevel.com/apps
