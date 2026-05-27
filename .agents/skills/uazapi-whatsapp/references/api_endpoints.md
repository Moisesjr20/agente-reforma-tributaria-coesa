# Referência Completa de Endpoints - UazAPI

## Base URL
```
https://api.uazapi.com
```

## Autenticação

### Endpoints Admin
Header: `admintoken: SEU_ADMIN_TOKEN`

### Endpoints de Instância
Header: `token: TOKEN_DA_INSTANCIA`

---

## 📱 INSTANCES (Gerenciamento)

### POST /instance/init
Cria nova instância do WhatsApp

**Headers:**
- `admintoken` (obrigatório)
- `Content-Type: application/json`

**Body:**
```json
{
  "instanceName": "nome-da-instancia",
  "token": "token-personalizado-opcional"
}
```

**Response:**
```json
{
  "instanceName": "nome-da-instancia",
  "token": "token-gerado",
  "status": "created"
}
```

---

### POST /instance/connect
Gera QR code ou código de pareamento

**Headers:**
- `token` (da instância)
- `Content-Type: application/json`

**Body (opcional):**
```json
{
  "phone": "5511999999999"
}
```

**Response (QR):**
```json
{
  "qrcode": "data:image/png;base64,...",
  "status": "connecting"
}
```

**Response (Pair Code):**
```json
{
  "pairCode": "ABC123",
  "status": "connecting"
}
```

---

### GET /instance/status
Verifica status da instância

**Headers:**
- `token` (da instância)

**Response:**
```json
{
  "state": "connected",  // disconnected, connecting, connected
  "status": "online",
  "number": "5511999999999"
}
```

---

### POST /instance/disconnect
Desconecta a instância

**Headers:**
- `token` (da instância)

---

### GET /instance/all
Lista todas as instâncias

**Headers:**
- `admintoken` (obrigatório)

**Response:**
```json
[
  {
    "instanceName": "instancia-1",
    "token": "...",
    "status": "connected"
  }
]
```

---

### POST /instance/updateInstanceName
Atualiza nome da instância

**Headers:**
- `token` (da instância)

**Body:**
```json
{
  "instanceName": "novo-nome"
}
```

---

### DELETE /instance/delete
Deleta a instância

**Headers:**
- `token` (da instância)

---

## 💬 MENSAGENS

### POST /message/sendText
Envia mensagem de texto

**Headers:**
- `token` (da instância)
- `Content-Type: application/json`

**Body:**
```json
{
  "phone": "5511999999999",
  "message": "Olá! 👋",
  "delay": 1000,
  "readchat": true,
  "replyid": "message-id-optional",
  "mentions": ["5511888888888"]
}
```

**Response:**
```json
{
  "id": "message-id",
  "timestamp": 1234567890,
  "status": "sent"
}
```

---

### POST /message/sendImage
Envia imagem

**Body:**
```json
{
  "phone": "5511999999999",
  "image": "https://url-da-imagem.jpg",
  "caption": "Descrição da imagem",
  "delay": 1000
}
```

---

### POST /message/sendDocument
Envia documento

**Body:**
```json
{
  "phone": "5511999999999",
  "document": "https://url-do-documento.pdf",
  "fileName": "documento.pdf",
  "caption": "Descrição",
  "delay": 1000
}
```

---

### POST /message/sendAudio
Envia arquivo de áudio

**Body:**
```json
{
  "phone": "5511999999999",
  "audio": "https://url-do-audio.mp3",
  "delay": 1000
}
```

---

### POST /message/sendVideo
Envia vídeo

**Nota:** Limite de 16MB

**Body:**
```json
{
  "phone": "5511999999999",
  "video": "https://url-do-video.mp4",
  "caption": "Descrição do vídeo",
  "delay": 1000
}
```

---

## 🎨 MENSAGENS INTERATIVAS

### POST /send/menu
Endpoint unificado para menus interativos

**Body para Botões:**
```json
{
  "phone": "5511999999999",
  "message": "Escolha uma opção:",
  "type": "button",
  "buttons": [
    {"buttonId": "1", "buttonText": "Opção 1"},
    {"buttonId": "2", "buttonText": "Opção 2"},
    {"buttonId": "3", "buttonText": "Opção 3"}
  ],
  "delay": 1000
}
```

**Body para Lista:**
```json
{
  "phone": "5511999999999",
  "message": "Escolha uma opção:",
  "type": "list",
  "buttonText": "Ver opções",
  "sections": [
    {
      "title": "Seção 1",
      "rows": [
        {"rowId": "1", "title": "Opção 1", "description": "Descrição"},
        {"rowId": "2", "title": "Opção 2", "description": "Descrição"}
      ]
    }
  ],
  "delay": 1000
}
```

**Body para Carousel:**
```json
{
  "phone": "5511999999999",
  "message": "Escolha uma opção:",
  "type": "carousel",
  "cards": [
    {
      "cardId": "1",
      "title": "Card 1",
      "description": "Descrição",
      "image": "https://url-imagem.jpg",
      "buttons": [
        {"buttonId": "1", "buttonText": "Botão 1"}
      ]
    }
  ],
  "delay": 1000
}
```

**Body para Enquete:**
```json
{
  "phone": "5511999999999",
  "message": "Qual sua opinião?",
  "type": "poll",
  "poll": {
    "name": "Título da enquete",
    "options": ["Opção 1", "Opção 2", "Opção 3"],
    "selectableCount": 1
  },
  "delay": 1000
}
```

---

## ⚠️ CÓDIGOS DE ERRO

| Código | Descrição | Solução |
|--------|-----------|---------|
| 400 | Bad Request | Verificar formato do JSON |
| 401 | Unauthorized | Token inválido ou expirado |
| 403 | Forbidden | Sem permissão |
| 404 | Not Found | Endpoint ou recurso não existe |
| 429 | Too Many Requests | Rate limit, aguarde |
| 500 | Internal Server Error | Erro na API, tente novamente |

---

## 📝 NOTAS IMPORTANTES

### Limitações

1. **Botões e Listas:**
   - Podem não funcionar se o número estiver logado no WhatsApp Web
   - Recomendado usar WhatsApp Business

2. **Mídia:**
   - Vídeos limitados a 16MB
   - URLs não devem ter caracteres especiais

3. **Rate Limiting:**
   - Delay padrão: 5 segundos entre mensagens
   - Configurável no body (mínimo recomendado: 1000ms)

### Campos Opcionais Comuns

Todos os endpoints de envio suportam:
- `delay`: Delay em ms (padrão: 5000)
- `readchat`: Marcar chat como lido (padrão: false)
- `replyid`: ID da mensagem para responder
- `mentions`: Array de números para mencionar
- `forward`: Encaminhar mensagem (boolean)
- `track_source`: Origem do envio
- `track_id`: ID para tracking

---

## 🔗 LINKS ÚTEIS

- **Documentação:** https://docs.uazapi.com/
- **Postman:** https://www.postman.com/augustofcs/uazapi-v2
- **GitHub:** (consultar documentação)
