---
name: google-calendar-events
description: Criação, consulta e gerenciamento de eventos no Google Calendar profissional (contato@kyrius.info) via Telegram. Use esta skill quando o usuário pedir para agendar, criar, marcar, registrar ou cancelar um evento, reunião, compromisso, call ou tarefa. Também use para listar eventos futuros, ver a agenda da semana ou dos próximos dias. Interprete linguagem natural como "agende reunião amanhã às 14h", "crie um evento sexta às 10h chamado Review", "quais eventos tenho essa semana".
---

# Google Calendar Events — Agenda Profissional

Skill para criar e consultar eventos no calendário profissional `contato@kyrius.info`.

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use `vps_execute_command`** para executar scripts. Nunca invente confirmações.
2. Após criar evento, exiba o link retornado para o usuário confirmar.
3. Datas em ISO-8601 sem fuso (o script assume `America/Sao_Paulo` = UTC-3).
4. Se o usuário não especificar duração, use **1 hora** como padrão.
5. Se `GOOGLE_WORK_REFRESH_TOKEN` estiver vazio, informe que é necessário gerar o token primeiro.

---

## Criar Evento

Passe um JSON como argumento único:

```
cd /opt/gueclaw-agent && python3 .agents/skills/google-calendar-events/scripts/create_event.py '{"title":"TITULO","start":"YYYY-MM-DDTHH:MM:SS","end":"YYYY-MM-DDTHH:MM:SS","description":"DESC","location":"LOCAL"}'
```

**Campos obrigatórios:** `title`, `start`, `end`
**Campos opcionais:** `description` (padrão: `""`), `location` (padrão: `""`)

**Exemplos:**

```bash
# Reunião simples
python3 create_event.py '{"title":"Reunião com cliente","start":"2026-03-17T14:00:00","end":"2026-03-17T15:00:00"}'

# Com descrição e local
python3 create_event.py '{"title":"Review Sprint 12","start":"2026-03-20T09:00:00","end":"2026-03-20T10:30:00","description":"Review das entregas do sprint","location":"Sala de conferências"}'
```

---

## Listar Eventos Futuros

```
cd /opt/gueclaw-agent && python3 .agents/skills/google-calendar-events/scripts/get_events.py [DIAS]
```

Onde `[DIAS]` é o número de dias a partir de hoje (padrão: 7).

**Exemplos:**
```bash
python3 get_events.py       # próximos 7 dias
python3 get_events.py 30    # próximo mês
python3 get_events.py 1     # só hoje
```

---

## Interpretação de Linguagem Natural

Quando o usuário pedir em linguagem natural, extraia:

| Campo | Como interpretar |
|---|---|
| Título | Nome explícito ou infira do contexto ("reunião com cliente" → "Reunião com cliente") |
| Data | Converta de linguagem natural: "amanhã", "sexta", "dia 20", "próxima semana" |
| Hora início | Horário mencionado. Se não houver, pergunte. |
| Hora fim | Se duração mencionada, calcule. Senão: início + 1h. |
| Descrição | Detalhes adicionais mencionados |
| Local | Se mencionado ("em tal lugar", "na sala X") |

**Data de referência:** hoje é **2026-03-16** (atualizar conforme data real da execução).

**Exemplo de interpretação:**
- Usuário: *"Agenda uma call com o João amanhã às 15h de 30 minutos"*
- title: `"Call com João"`, start: `"2026-03-17T15:00:00"`, end: `"2026-03-17T15:30:00"`

---

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `GOOGLE_WORK_CLIENT_ID` | OAuth Client ID profissional |
| `GOOGLE_WORK_CLIENT_SECRET` | OAuth Client Secret profissional |
| `GOOGLE_WORK_REFRESH_TOKEN` | Refresh Token (gerar com `scripts/generate-google-token.py`) |
| `GOOGLE_WORK_CALENDAR_ID` | ID do calendário (`contato@kyrius.info`) |
