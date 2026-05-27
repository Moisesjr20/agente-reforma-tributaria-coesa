# GoHighLevel API — Catálogo de Endpoints

Referência detalhada de todos os endpoints principais da API v2 do GoHighLevel.

**Base URL:** `https://services.leadconnectorhq.com`

---

## Contacts

### Buscar contato por ID
```http
GET /contacts/{contactId}
```
Resposta: `{ "contact": { "id", "firstName", "lastName", "email", "phone", "locationId", "tags", "customFields", ... } }`

### Criar contato
```http
POST /contacts/
Body: {
  "locationId": "string (required)",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",  // formato E.164: +5511999999999
  "address1": "string",
  "city": "string",
  "state": "string",
  "postalCode": "string",
  "website": "string",
  "timezone": "America/Sao_Paulo",
  "dnd": false,
  "tags": ["tag1", "tag2"],
  "customFields": [{ "id": "field_id", "value": "valor" }],
  "source": "string"
}
```

### Atualizar contato
```http
PUT /contacts/{contactId}
Body: (mesmos campos do POST, todos opcionais)
```

### Upsert contato (recomendado)
```http
POST /contacts/upsert
Body: (mesmos campos do POST — faz match por email ou phone)
```

### Deletar contato
```http
DELETE /contacts/{contactId}
```

### Buscar contatos
```http
GET /contacts/?locationId={id}&query={q}&limit={n}&startAfter={lastId}
```
Parâmetros opcionais: `query`, `email`, `phone`, `startAfterId`, `startAfter` (timestamp), `limit` (max 100)

### Adicionar tags
```http
POST /contacts/{contactId}/tags
Body: { "tags": ["tag1", "tag2"] }
```

### Remover tags
```http
DELETE /contacts/{contactId}/tags
Body: { "tags": ["tag1"] }
```

### Adicionar nota ao contato
```http
POST /contacts/{contactId}/notes
Body: { "body": "Texto da nota", "userId": "optional" }
```

### Adicionar tarefa ao contato
```http
POST /contacts/{contactId}/tasks
Body: {
  "title": "Ligar para cliente",
  "body": "Detalhes...",
  "dueDate": "2026-01-15T10:00:00Z",
  "completed": false,
  "assignedTo": "userId"
}
```

---

## Conversations

### Buscar conversa
```http
GET /conversations/{conversationId}
```

### Criar conversa
```http
POST /conversations/
Body: {
  "locationId": "string",
  "contactId": "string"
}
```

### Buscar conversas
```http
GET /conversations/search?locationId={id}&query={q}&limit={n}&startAfterDate={ts}
```
Parâmetros: `assignedTo`, `unreadOnly` (true/false), `status` (open/closed/all)

### Enviar mensagem
```http
POST /conversations/messages
Body: {
  "type": "SMS",  // SMS | Email | WhatsApp | GMB | FB | IG | Custom
  "conversationId": "string",
  "message": "Olá! Como posso ajudar?",
  // Para Email:
  "subject": "Assunto do email",
  "html": "<p>Corpo em HTML</p>",
  // Para agendamento:
  "scheduledTimestamp": 1700000000
}
```

### Buscar mensagens de uma conversa
```http
GET /conversations/{conversationId}/messages?limit={n}&lastMessageId={id}
```

### Upload de attachment
```http
POST /conversations/messages/upload
Content-Type: multipart/form-data
Body: file (campo "fileAttachment"), conversationId, locationId
```

---

## Calendars & Appointments

### Listar calendários da location
```http
GET /calendars/?locationId={id}
```

### Buscar calendário
```http
GET /calendars/{calendarId}
```

### Criar calendário
```http
POST /calendars/
Body: {
  "locationId": "string",
  "name": "Consultoria",
  "description": "...",
  "slug": "consultoria",
  "widgetType": "default",
  "eventType": "RoundRobin_OptimizeForAvailability",
  "teamMembers": [{ "userId": "uid", "priority": 0.5, "isPrimary": true }]
}
```

### Listar eventos/agendamentos
```http
GET /calendars/events?locationId={id}&startTime={ms}&endTime={ms}&calendarId={id}
```
`startTime` e `endTime` em milissegundos (Unix timestamp × 1000)

### Buscar horários livres
```http
GET /calendars/{calendarId}/free-slots?startDate={ms}&endDate={ms}&timezone=America/Sao_Paulo
```
Resposta: `{ "slots": { "2026-01-15": ["09:00", "10:00", ...] } }`

### Criar agendamento
```http
POST /calendars/events/appointments
Body: {
  "calendarId": "string",
  "locationId": "string",
  "contactId": "string",
  "startTime": "2026-01-15T10:00:00-03:00",
  "endTime": "2026-01-15T11:00:00-03:00",
  "title": "Reunião de onboarding",
  "appointmentStatus": "confirmed",  // new | confirmed | cancelled | showed | noshow | invalid
  "assignedUserId": "userId",
  "notes": "Trazer documentos",
  "address": "Online - Zoom"
}
```

### Atualizar agendamento
```http
PUT /calendars/events/appointments/{eventId}
Body: (campos do POST, todos opcionais)
```

### Deletar agendamento
```http
DELETE /calendars/events/appointments/{eventId}
```

---

## Opportunities (Pipeline / CRM)

### Buscar oportunidades
```http
GET /opportunities/search?location_id={id}&pipeline_id={id}&stage_id={id}&status={status}
```
Status: `open | won | lost | abandoned | all`

### Criar oportunidade
```http
POST /opportunities/
Body: {
  "pipelineId": "string",
  "locationId": "string",
  "name": "Proposta Cliente X",
  "pipelineStageId": "string",
  "status": "open",
  "contactId": "string",
  "monetaryValue": 5000,
  "assignedTo": "userId",
  "customFields": [{ "id": "field_id", "value": "..." }]
}
```

### Buscar oportunidade por ID
```http
GET /opportunities/{id}
```

### Atualizar oportunidade
```http
PUT /opportunities/{id}
Body: (campos do POST, todos opcionais)
```

### Atualizar status
```http
PUT /opportunities/{id}/status
Body: { "status": "won" }
```

### Deletar oportunidade
```http
DELETE /opportunities/{id}
```

### Listar pipelines
```http
GET /opportunities/pipelines?locationId={id}
```
Resposta inclui `stages` com seus IDs.

---

## Locations (Sub-Accounts)

### Buscar location por ID
```http
GET /locations/{locationId}
```

### Criar location (requer Agency API Key)
```http
POST /locations/
Body: {
  "name": "Nome da Empresa",
  "address": "Rua...",
  "city": "São Paulo",
  "state": "SP",
  "country": "Brazil",
  "postalCode": "01310-100",
  "website": "https://...",
  "timezone": "America/Sao_Paulo",
  "firstName": "Nome",
  "lastName": "Sobrenome",
  "email": "admin@empresa.com",
  "phone": "+5511999999999",
  "companyId": "agencyId"
}
```

### Atualizar location
```http
PUT /locations/{locationId}
Body: (campos do POST, todos opcionais)
```

### Buscar locations da agência
```http
GET /locations/search?companyId={agencyId}&limit={n}&skip={n}&order=asc&query={q}
```

### Custom Fields da location
```http
GET  /locations/{locationId}/customFields
POST /locations/{locationId}/customFields
Body: { "name": "CPF", "dataType": "TEXT", "position": 0 }
PUT  /locations/{locationId}/customFields/{id}
DELETE /locations/{locationId}/customFields/{id}
```

### Custom Values da location
```http
GET  /locations/{locationId}/customValues
POST /locations/{locationId}/customValues
Body: { "name": "Chave PIX", "value": "email@pix.com" }
```

### Tags da location
```http
GET  /locations/{locationId}/tags
POST /locations/{locationId}/tags
Body: { "name": "hot-lead" }
PUT  /locations/{locationId}/tags/{tagId}
DELETE /locations/{locationId}/tags/{tagId}
```

---

## Users

### Buscar usuário por ID
```http
GET /users/{userId}
```

### Criar usuário
```http
POST /users/
Body: {
  "companyId": "agencyId",
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@empresa.com",
  "password": "Senha@123",
  "phone": "+5511999999999",
  "type": "account",  // agency | account
  "role": "user",     // admin | user
  "locationIds": ["locationId1"],
  "permissions": { ... }
}
```

### Atualizar usuário
```http
PUT /users/{userId}
```

### Deletar usuário
```http
DELETE /users/{userId}
```

### Listar usuários da agência
```http
GET /users/?companyId={agencyId}
```

### Listar usuários de uma location
```http
GET /users/location/{locationId}
```

---

## Forms & Surveys

### Listar formulários
```http
GET /forms/?locationId={id}&skip={n}&limit={n}
```

### Buscar submissions de formulário
```http
GET /forms/submissions?locationId={id}&formId={id}&startAt={ms}&endAt={ms}&limit={n}&page={n}
```

### Listar surveys
```http
GET /surveys/?locationId={id}
```

### Buscar submissions de survey
```http
GET /surveys/submissions?locationId={id}&surveyId={id}&startAt={ms}&endAt={ms}&limit={n}
```

---

## Workflows

### Listar workflows
```http
GET /workflows/?locationId={id}
```

### Adicionar contato a um workflow
```http
POST /contacts/{contactId}/workflow/{workflowId}
Body: { "eventStartTime": "2026-01-15T10:00:00Z" }  // opcional
```

### Remover contato de um workflow
```http
DELETE /contacts/{contactId}/workflow/{workflowId}
```

---

## Campaigns

### Listar campanhas
```http
GET /campaigns/?locationId={id}&status={status}
```
Status: `active | draft | archived`

---

## Payments

### Listar pedidos
```http
GET /payments/orders?locationId={id}&contactId={id}&limit={n}&startAfterDate={ms}
```

### Buscar pedido
```http
GET /payments/orders/{orderId}
```

### Listar transações
```http
GET /payments/transactions?locationId={id}&contactId={id}&limit={n}
```

### Listar subscrições
```http
GET /payments/subscriptions?locationId={id}&contactId={id}&limit={n}
```

---

## Links (Funnels & Websites)

### Listar funnels
```http
GET /funnels/funnel/list?locationId={id}&type=funnel&limit={n}
```

### Listar páginas de um funnel
```http
GET /funnels/{funnelId}/pages?locationId={id}
```

---

## Blogs

### Listar posts
```http
GET /blogs/posts?locationId={id}&limit={n}&skip={n}
```

---

## Social Media Planner

### Listar posts agendados
```http
GET /social-media-posting/{locationId}/posts?skip={n}&limit={n}&status={status}
```

### Criar post
```http
POST /social-media-posting/{locationId}/posts
Body: {
  "summary": "Texto do post",
  "scheduleTime": "2026-01-15T10:00:00Z",
  "media": [{ "url": "https://...", "type": "image" }],
  "channels": ["facebook", "instagram"]
}
```

---

## Email Marketing

### Listar templates de email
```http
GET /marketing/email/template?locationId={id}&limit={n}
```

### Criar campanha de email
```http
POST /email-marketing/campaigns
Body: {
  "locationId": "string",
  "name": "Campanha Novembro",
  "subject": "Oferta especial",
  "body": "<html>...</html>",
  "from": { "name": "Empresa", "email": "noreply@empresa.com" }
}
```

---

## Medias (File Manager)

### Upload de arquivo
```http
POST /medias/upload-file
Content-Type: multipart/form-data
Body: file, locationId, name (opcional)
```

### Listar arquivos
```http
GET /medias/files?locationId={id}&sortBy=updatedAt&sortOrder=desc&limit={n}
```

---

## Notas de Implementação

- **IDs de location**: sempre inclua `locationId` em requests de recursos que pertencem a uma sub-account
- **Timestamps**: maioria dos endpoints usa milissegundos (ms) para filtros de data, mas ISO 8601 para campos de data/hora em bodies
- **Paginação**: use `limit` + `startAfter` (ou `skip` + `limit` dependendo do endpoint)
- **Custom Fields**: referencie sempre pelo `id` interno, não pelo nome
- **Phone format**: sempre E.164 — `+55` + DDD + número (ex: `+5511999999999`)
