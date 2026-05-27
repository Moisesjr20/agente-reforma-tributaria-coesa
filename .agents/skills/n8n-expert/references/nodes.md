# n8n — Referência de Nodes

Propriedades detalhadas e exemplos dos nodes mais utilizados no n8n.

---

## Trigger Nodes

### Webhook
Recebe dados via HTTP de qualquer serviço externo.

**Propriedades:**
```
HTTP Method: GET | POST | PUT | PATCH | DELETE | HEAD
Path: string (ex: "receber-lead")
Authentication: None | Basic Auth | Header Auth
Respond: Immediately | Using 'Respond to Webhook' Node | Last Node
Binary Property: (para uploads de arquivo)
```

**Dados disponíveis após trigger:**
```javascript
$json.body           // corpo do request (POST/PUT)
$json.query          // query parameters
$json.headers        // headers HTTP
$json.params         // path parameters
```

**Tip:** Em produção o workflow deve estar **ativo**. Em teste use a URL `/webhook-test/`.

---

### Schedule Trigger
Executa em horários programados.

**Modos:**
- `Interval` — a cada N minutos/horas/dias
- `Cron` — expressão cron customizada

**Exemplos de cron:**
```
0 9 * * 1-5        // 9h de segunda a sexta
0 8,12,18 * * *    // 8h, 12h e 18h todo dia
*/30 * * * *       // a cada 30 minutos
0 0 1 * *          // 1º dia de cada mês às meia-noite
```

---

### Manual Trigger
Para testes manuais. Não tem parâmetros extras.

---

### Email Trigger (IMAP)
Monitora caixa de e-mail por novos emails.

```
Host: imap.gmail.com
Port: 993
SSL: true
Mailbox: INBOX
Action: Mark as Read
```

---

### n8n Form Trigger
Cria um formulário web nativo no n8n.

---

## Core Nodes

### HTTP Request
O node mais versátil — chama qualquer API REST.

```
Method: GET | POST | PUT | PATCH | DELETE
URL: https://api.exemplo.com/v1/recurso

Authentication:
  Generic Credential Type:
    - Header Auth (Bearer token, API Key em header)
    - Query Auth (API Key em query string)
    - Basic Auth (usuário + senha)
  Predefined Credential Type:
    - Google, Slack, GitHub, Salesforce, etc.

Send Headers: (Add Header)
  - Content-Type: application/json
  - Authorization: Bearer {{ $vars.TOKEN }}

Send Query Parameters:
  - locationId: {{ $json.locationId }}
  - limit: 50

Body Content Type: JSON | Form | Multipart | Raw
Body (JSON): { "campo": "{{ $json.valor }}" }

Options:
  - Batching → Request Interval: 500 (ms entre requests)
  - Follow Redirects: true
  - Ignore SSL Issues: false (true só em dev)
  - Full Response: true (inclui headers e statusCode na resposta)
  - Timeout: 30000 (ms)
```

**Com Full Response ativo, acesse:**
```javascript
$json.statusCode     // 200, 400, 500...
$json.headers        // headers da resposta
$json.body           // corpo da resposta (seu JSON normal)
```

---

### Code
Executa JavaScript ou Python no contexto do n8n.

**Modos:**
- `Run Once for All Items` — recebe todos os items, retorna array
- `Run Once for Each Item` — recebe um item por vez, retorna objeto

**JavaScript — All Items:**
```javascript
const output = [];

for (const item of $input.all()) {
  output.push({
    json: {
      ...item.json,
      processado: true,
      timestamp: new Date().toISOString(),
    }
  });
}

return output;
```

**JavaScript — Each Item:**
```javascript
const { nome, email, telefone } = $json;

return {
  json: {
    nome: nome?.trim(),
    email: email?.toLowerCase(),
    telefone: telefone?.replace(/\D/g, ''),
    valido: !!(nome && email),
  }
};
```

**Helpers disponíveis no Code:**
```javascript
$input.all()                    // todos os items do node anterior
$input.first()                  // primeiro item
$input.last()                   // último item
$input.item                     // item atual (modo each)
$json                           // $input.item.json (atalho)
$binary                         // dados binários do item
$('Node Name').all()            // items de qualquer node anterior
$('Node Name').first().json     // primeiro item de outro node

$now                            // DateTime Luxon atual
$today                          // data de hoje

$workflow.id                    // ID do workflow
$workflow.name                  // nome do workflow
$execution.id                   // ID da execução

$vars.NOME_VAR                  // variável de ambiente n8n
$env.NODE_ENV                   // variáveis de sistema

// Bibliotecas disponíveis:
// DateTime (Luxon), $jmespath, $_ (lodash-like)
```

---

### Set (Edit Fields)
Define ou transforma campos dos items.

```
Mode: Manual Mapping | JSON
Fields to Set:
  - nome: {{ $json.firstName + ' ' + $json.lastName }}
  - email: {{ $json.email.toLowerCase() }}
  - score: 100

Include in Output: All Input Fields | No Input Fields | Selected Fields
```

---

### IF
Divide o fluxo em dois branches: TRUE e FALSE.

```
Conditions:
  - String: $json.status equals "ativo"
  - Number: $json.valor greaterThan 1000
  - Boolean: $json.ativo is true
  - Date/Time: $json.data after "2026-01-01"
  - Empty: $json.campo is empty / is not empty
  - Regex: $json.email matches /^[^@]+@[^@]+\.[^@]+$/

Combine: AND | OR
```

**Output 0** = TRUE branch | **Output 1** = FALSE branch

---

### Switch
Múltiplos branches por valor de um campo.

```
Mode: Rules | Expression
Value: {{ $json.status }}
Rules:
  - equals "novo" → Output 0
  - equals "ativo" → Output 1  
  - equals "cancelado" → Output 2
Fallback Output: Output 3 (opcional)
```

---

### Merge
Combina dados de múltiplos branches.

```
Mode:
  Append      — junta todos os items em sequência
  Combine     — combina items por posição ou chave (join)
  Choose Branch — deixa passar apenas um branch
  Multiplex   — repete items do branch 1 para cada item do branch 2

Combine:
  By Position — item[0] + item[0], item[1] + item[1]...
  By Key      — match por campo (ex: campo "id")
  
Join Type: Inner | Left | Right | Full (para Combine by Key)
```

---

### Split In Batches
Divide o array de items em lotes menores.

```
Batch Size: 10
Options:
  Reset: false
```

**Loop pattern:**
```
[Split In Batches] → [processar lote] → [Split In Batches]
                                       (conecta de volta — continua até esgotar)
```

---

### Filter
Remove items que não atendem às condições.

```
Conditions: (mesma sintaxe do IF)
  - String, Number, Boolean, Date, Empty, Regex
Combine: AND | OR
```

Apenas items que passam na condição continuam no fluxo.

---

### Aggregate
Combina múltiplos items em um único item ou agrupa.

```
Aggregate: All Item Data (Into a Single List)
  Field Name: items
  
  Resultado:
  { "items": [{ ...item1 }, { ...item2 }, ...] }
```

---

### Loop Over Items
Itera sobre uma lista dentro de um item (diferente de Split In Batches).

```
Field: $json.contatos   // campo que contém o array
```

---

### Wait
Pausa o workflow.

```
Resume: After Time Interval | At Specified Time | On Webhook Call
Amount: 30
Unit: Seconds | Minutes | Hours | Days
```

---

### Execute Workflow
Chama outro workflow como sub-rotina.

```
Source: Database | Local
Workflow ID: abc123
Wait For Sub-Workflow: true
Input Data: (dados para passar ao sub-workflow)
```

---

### Respond to Webhook
Envia resposta HTTP ao chamador do Webhook Trigger.

```
Respond With: First Incoming Item | All Incoming Items | Text | JSON | Binary | Redirect | No Data
Response Code: 200
Response Headers: Content-Type: application/json
Response Body: {{ $json }}
```

---

### Stop and Error
Para o workflow com um erro customizado.

```
Error Type: Error Message | Error Object
Error Message: "Contato não encontrado: {{ $json.id }}"
```

---

## Nodes de Serviço

### Google Sheets
```
Operation: Read Rows | Append | Update | Delete | Get All
Spreadsheet ID: (ID da URL do Google Sheets — a longa string)
Sheet Name: Planilha1
Range: A1:Z1000

Filters (Read with filters):
  Filter: column equals value

Options:
  Row Number: true (inclui número da linha)
  Value Render: Formatted Value | Unformatted Value | Formula
```

---

### Gmail
```
Operation: Send | Get | Get All | Mark as Read | Delete | Reply

Send:
  From: email@gmail.com
  To: {{ $json.email }}
  Subject: Assunto aqui
  Message: <p>Corpo HTML</p>
  Options: CC, BCC, Attachments, Reply To
```

---

### Telegram
```
Operation: Send Message | Send Photo | Send Document | Get Updates

Send Message:
  Chat ID: {{ $json.chatId }}  // ou @channelname
  Text: Olá {{ $json.nome }}!
  Parse Mode: Markdown | HTML
```

---

### Slack
```
Operation: Send a Message | Update a Message | Delete a Message | Get Channel

Send Message:
  Channel: #geral  // ou @usuario
  Text: {{ $json.mensagem }}
  Blocks: (JSON de Block Kit)
```

---

### MySQL / PostgreSQL
```
Operation: Execute Query | Insert | Update | Select

Execute Query:
  Query: SELECT * FROM contatos WHERE email = ?
  Query Parameters: $json.email

Insert:
  Table: contatos
  Columns: nome, email, telefone

Update:
  Table: contatos
  Update Key: id
  Columns: status, updated_at
```

---

### Redis
```
Operation: Get | Set | Delete | Increment | Push (lista)
Key: {{ $json.chave }}
Value: {{ $json.valor }}
TTL: 3600 (segundos)
```

---

### OpenAI
```
Resource: Chat | Text | Image | Audio
Operation: Message (Chat Completions)
Model: gpt-4o | gpt-4o-mini
System Message: Você é um assistente...
User Message: {{ $json.pergunta }}
Max Tokens: 1000
Temperature: 0.7

Output: Completo | apenas texto
```

---

## Binary Nodes

### Read/Write Files
```
Operation: Read File | Write File | Delete File
File Path: /tmp/arquivo.csv
Binary Property: data
```

### Extract From File
```
Convert File Type: CSV → JSON | XML → JSON | PDF → Text
```

### Spreadsheet File
```
Operation: Read from File | Write to File
Format: CSV | ODS | XLS | XLSX
```
