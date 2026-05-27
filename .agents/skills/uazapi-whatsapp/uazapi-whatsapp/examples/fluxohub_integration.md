# Guia de Integração com FluxoHub

Este guia mostra como usar a UazAPI em workflows do FluxoHub.

## Configuração Inicial

### 1. Criar Instância (uma vez)

Use o script `create_instance.py` ou faça via API:

```javascript
// Node no FluxoHub - Criar Instância
const response = await fetch('https://api.uazapi.com/instance/init', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'admintoken': input.adminToken
  },
  body: JSON.stringify({
    instanceName: 'fluxohub-producao'
  })
});

const instance = await response.json();
return { 
  output: {
    instanceToken: instance.token,
    instanceName: instance.instanceName
  }
};
```

### 2. Salvar Token

Salve o `instanceToken` em uma config segura do FluxoHub ou no banco de dados.

---

## Exemplos de Workflows

### Workflow 1: Notificação Simples

**Trigger:** Formulário preenchido  
**Ação:** Enviar confirmação via WhatsApp

```javascript
// Node: Verificar Status
const statusRes = await fetch('https://api.uazapi.com/instance/status', {
  headers: { 'token': input.instanceToken }
});
const status = await statusRes.json();

if (status.state !== 'connected') {
  throw new Error('WhatsApp não conectado');
}

return { output: { connected: true } };
```

```javascript
// Node: Enviar Mensagem
const messageRes = await fetch('https://api.uazapi.com/message/sendText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'token': input.instanceToken
  },
  body: JSON.stringify({
    phone: input.clientPhone,
    message: `Olá ${input.clientName}! 👋\n\nRecebemos seu formulário e entraremos em contato em breve.`,
    delay: 1000,
    readchat: true
  })
});

return { output: await messageRes.json() };
```

---

### Workflow 2: Menu Interativo

```javascript
// Node: Enviar Menu de Opções
const menuRes = await fetch('https://api.uazapi.com/send/menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'token': input.instanceToken
  },
  body: JSON.stringify({
    phone: input.clientPhone,
    message: "Olá! Bem-vindo ao atendimento. Escolha uma opção:",
    type: "button",
    buttons: [
      { buttonId: "1", buttonText: "📋 Serviços" },
      { buttonId: "2", buttonText: "💰 Orçamento" },
      { buttonId: "3", buttonText: "📞 Falar com humano" }
    ],
    delay: 1000
  })
});

return { output: await menuRes.json() };
```

---

### Workflow 3: Enviar Documento

```javascript
// Node: Gerar e Enviar Contrato
const docRes = await fetch('https://api.uazapi.com/message/sendDocument', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'token': input.instanceToken
  },
  body: JSON.stringify({
    phone: input.clientPhone,
    document: input.documentUrl,
    fileName: "contrato.pdf",
    caption: `Olá ${input.clientName}! 👋\n\nSegue o contrato para sua análise.`,
    delay: 1000
  })
});

return { output: await docRes.json() };
```

---

## Webhooks (Receber Mensagens)

### Configurar Webhook na UazAPI

Configure a URL do webhook no painel da UazAPI:
```
https://fluxohub.kyrius.com.br/webhook/uazapi
```

### Workflow: Receber e Processar

**Trigger:** Webhook UazAPI

```javascript
// Node: Processar Mensagem Recebida
const webhookData = input.body;

// Extrair dados
const messageData = {
  from: webhookData.phone,  // Quem enviou
  message: webhookData.message,  // Conteúdo
  timestamp: webhookData.timestamp,
  type: webhookData.type  // text, image, etc
};

// Salvar no banco
await fetch('https://seu-supabase.com/rest/v1/mensagens_recebidas', {
  method: 'POST',
  headers: {
    'apikey': input.supabaseKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(messageData)
});

// Responder automaticamente
if (messageData.message.toLowerCase().includes('oi')) {
  await fetch('https://api.uazapi.com/message/sendText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': input.instanceToken
    },
    body: JSON.stringify({
      phone: messageData.from,
      message: "Olá! Como posso ajudar? Digite 1 para serviços, 2 para preços.",
      delay: 1000
    })
  });
}

return { output: { processed: true } };
```

---

## Boas Práticas

### 1. Verificar Status Antes de Enviar

Sempre verifique se a instância está conectada:

```javascript
const checkConnection = async (token) => {
  const res = await fetch('https://api.uazapi.com/instance/status', {
    headers: { 'token': token }
  });
  const status = await res.json();
  return status.state === 'connected';
};
```

### 2. Rate Limiting

Respeite o delay entre mensagens:

```javascript
// Função de delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enviar com delay
for (const client of clients) {
  await sendMessage(client.phone, client.message);
  await sleep(5000);  // 5 segundos entre mensagens
}
```

### 3. Tratamento de Erros

```javascript
try {
  const response = await fetch('https://api.uazapi.com/message/sendText', {
    // ... config
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return { output: await response.json() };
  
} catch (error) {
  // Log error
  console.error('Erro ao enviar mensagem:', error);
  
  // Retentar ou notificar
  return { 
    output: { error: error.message },
    error: true
  };
}
```

### 4. Formato de Telefone

Sempre use o formato internacional:
```javascript
// Correto ✅
"5511999999999"  // DDI (55) + DDD (11) + Número

// Incorreto ❌
"11999999999"     // Sem DDI
"(11) 99999-9999" // Com formatação
```

---

## Variáveis de Ambiente no FluxoHub

Configure no `.env` do servidor:

```bash
# UazAPI
UAIZAPI_BASE_URL=https://api.uazapi.com
UAIZAPI_ADMIN_TOKEN=seu_token_admin

# Instance Token (salvo no banco após criação)
# UAIZAPI_INSTANCE_TOKEN_PROD=token_da_instancia_producao
```

---

## Debugging

### Verificar Logs

No FluxoHub, habilite logs detalhados:

```javascript
console.log('Input recebido:', input);
console.log('Response da API:', response);
```

### Testar Manualmente

Use os exemplos em `examples/curl_examples.sh`:

```bash
export INSTANCE_TOKEN="seu_token"
export PHONE="5511999999999"

# Testar envio
curl -X POST "https://api.uazapi.com/message/sendText" \
  -H "Content-Type: application/json" \
  -H "token: $INSTANCE_TOKEN" \
  -d "{
    \"phone\": \"$PHONE\",
    \"message\": \"Teste\"
  }"
```

---

## Próximos Passos

1. Criar instância de teste
2. Configurar webhook
3. Criar workflow de notificação
4. Testar envio de mensagens
5. Implementar respostas automáticas

Para dúvidas, consulte a documentação oficial: https://docs.uazapi.com/
