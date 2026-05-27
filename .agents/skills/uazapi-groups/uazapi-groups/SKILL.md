---
name: uazapi-groups
framework: doe
description: Lista e armazena todos os grupos do WhatsApp via UazAPI. Use esta skill quando o usuário quiser listar grupos do WhatsApp, sincronizar a lista de grupos, buscar o JID de um grupo, obter IDs de grupos, ou qualquer menção a "grupos do WhatsApp". Armazena os resultados em arquivo JSON para consulta futura.
blocked_tools: [api_request]
---

# UazAPI — Grupos do WhatsApp

> **Operação DOE** — Esta skill segue a arquitetura DOE. Toda execução obedece ao fluxo: **Análise → Plano → Aprovação → Execução → Review**. Quando um script falhar, aplique o loop de self-annealing: corrija, teste, atualize esta skill.

---

Skill para listar todos os grupos do WhatsApp conectado e armazenar a lista com nome e JID.

## 🔑 Configuração

```
Base URL: https://kyrius.uazapi.com   (variável UAIZAPI_BASE_URL)
Token:    ${UAIZAPI_TOKEN}  (variável UAIZAPI_TOKEN)
```

Use sempre os valores das variáveis de ambiente. Não hardcode.

---

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use `vps_execute_command`** para listar grupos. Nunca use `api_request` diretamente — a resposta tem >700KB e estoura o contexto do LLM.
2. Use o header `token: {UAIZAPI_TOKEN}`.
3. O filtro dos campos DEVE acontecer no servidor (via python3 inline), nunca traga o JSON completo para o contexto.
4. Nunca invente JIDs ou nomes — use apenas os dados reais da resposta da API.

---

## 📋 Listar e Salvar Grupos — Comando Único

Use **`vps_execute_command`** com este comando exato (uma linha, sem quebras):

```
curl -s -H 'token: ${UAIZAPI_TOKEN}' 'https://kyrius.uazapi.com/group/list' | python3 -c "import sys,json,datetime;d=json.load(sys.stdin);g=d.get('groups',[]);f=[{'name':x['Name'],'jid':x['JID'],'n':x.get('ParticipantCount',0)} for x in g];json.dump({'updated_at':datetime.datetime.utcnow().isoformat()+'Z','total':len(f),'groups':[{'name':x['name'],'jid':x['jid']} for x in f]},open('/opt/gueclaw-agent/.agents/skills/uazapi-groups/data/groups.json','w'),ensure_ascii=False,indent=2);[print(f'{i+1}. {x[\"name\"]} ({x[\"n\"]} membros) - {x[\"jid\"]}') for i,x in enumerate(f)];print(f'Total: {len(f)} grupos')"
```

> **Por que `vps_execute_command` e não `api_request`?**
> A API retorna >700KB (34 campos por grupo incluindo lista de participantes). Trazer isso para o contexto do LLM estoura o limite de tokens. Filtrando no servidor com python3, apenas os campos `name`, `jid` e `participants` chegam ao agente — em torno de 3KB.

---

## 🔍 Consultar Grupos Salvos (Sem Chamar a API)

Para ler a lista salva sem chamar a API novamente:

```bash
cat /opt/gueclaw-agent/.agents/skills/uazapi-groups/data/groups.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Atualizado em: {data[\"updated_at\"]}')
for i, g in enumerate(data['groups'], 1):
    print(f'{i}. {g[\"name\"]} — {g[\"jid\"]}')
print(f'Total: {data[\"total\"]} grupos')
"
```

---

## 📤 Apresentar Resultado ao Usuário

Após executar o comando, apresente ao usuário:
- Quantidade total de grupos encontrados
- Lista com **nome**, **número de membros** e **JID** de cada grupo
- Confirmação de que o arquivo foi salvo

**Exemplo de resposta formatada:**
```
✅ Encontrei 45 grupos no seu WhatsApp:

1. Família Silva (8 membros) — 120363001@g.us
2. Trabalho Equipe (23 membros) — 120363002@g.us
3. Amigos Futebol (11 membros) — 120363003@g.us
...

💾 Lista salva em data/groups.json
```

---

## 🛠️ Fluxo Completo

```
1. vps_execute_command → curl | python3 (filtra + salva + imprime)
2. Apresentar a lista impressa ao usuário com formatação
```


## 🔑 Configuração

```
Base URL: https://kyrius.uazapi.com   (variável UAIZAPI_BASE_URL)
Token:    ${UAIZAPI_TOKEN}  (variável UAIZAPI_TOKEN)
```

Use sempre os valores das variáveis de ambiente. Não hardcode.

---

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use a ferramenta `api_request`** para chamar a UazAPI. Nunca simule respostas.
2. Use o header `token: {UAIZAPI_TOKEN}`, não `Authorization`.
3. **SEMPRE salve o resultado em arquivo** após listar os grupos (veja seção "Armazenar").
4. Nunca invente JIDs ou nomes — use apenas os dados reais da resposta da API.

---

## 📋 Listar Grupos

**Endpoint:** `GET {UAIZAPI_BASE_URL}/group/list`

**Headers:**
```
Accept: application/json
token: {UAIZAPI_TOKEN}
```

**Exemplo de chamada via `api_request`:**
```json
{
  "method": "GET",
  "url": "https://kyrius.uazapi.com/group/list",
  "headers": {
    "Accept": "application/json",
    "token": "${UAIZAPI_TOKEN}"
  }
}
```

**Exemplo de resposta esperada:**
```json
{
  "groups": [
    {
      "JID": "120363423366742688@g.us",
      "Name": "Nome do Grupo",
      "ParticipantCount": 42,
      "OwnerJID": "5511999999999@s.whatsapp.net",
      "GroupCreated": 1700000000
    }
  ]
}
```

> O campo `JID` é o identificador único do grupo (formato `XXXXXX@g.us`).
> O campo `Name` é o nome do grupo.
> A resposta tem nível raiz `{ "groups": [...] }` — itere em `response.groups`.

---

## 💾 Armazenar a Lista de Grupos

Após obter a lista, salve em `.agents/skills/uazapi-groups/data/groups.json` usando a ferramenta `file_operations`.

**Formato do arquivo a salvar:**
```json
{
  "updated_at": "2026-03-16T10:00:00.000Z",
  "total": 5,
  "groups": [
    {
      "name": "Nome do Grupo",
      "jid": "120363000000000001@g.us"
    }
  ]
}
```

**Passos:**
1. Receba a resposta da API (objeto com chave `groups`)
2. Extraia apenas `Name` (→ `name`) e `JID` (→ `jid`) de cada item em `response.groups`
3. Monte o JSON com `updated_at` (timestamp ISO atual), `total` (quantidade) e `groups`
4. Use `file_operations` com `action: "write"` para salvar em `.agents/skills/uazapi-groups/data/groups.json`

---

## 🔍 Consultar Grupos Salvos (Opcional)

Para ler a lista já salva sem chamar a API novamente:
- Use `file_operations` com `action: "read"` no caminho `.agents/skills/uazapi-groups/data/groups.json`

---

## 📤 Apresentar Resultado ao Usuário

Após listar e salvar, apresente ao usuário:
- Quantidade total de grupos encontrados
- Tabela ou lista com **nome** e **JID** de cada grupo
- Confirmação de que o arquivo foi salvo

**Exemplo de resposta formatada:**
```
✅ Encontrei 5 grupos no seu WhatsApp:

1. **Família Silva** — `120363001@g.us`
2. **Trabalho Equipe** — `120363002@g.us`
3. **Amigos Futebol** — `120363003@g.us`
...

💾 Lista salva em `.agents/skills/uazapi-groups/data/groups.json`
```

---

## 🛠️ Fluxo Completo

```
1. api_request → GET /group/list
2. Parsear resposta: extrair name (subject) + jid (id)
3. file_operations write → salvar groups.json
4. Responder ao usuário com a lista formatada
```

