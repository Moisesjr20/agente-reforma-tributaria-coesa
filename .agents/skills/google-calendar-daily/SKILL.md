---
name: google-calendar-daily
description: Resumo diário da agenda Google Calendar enviado via Telegram. Use esta skill quando o usuário quiser ver os eventos de hoje, perguntar sobre a agenda do dia, configurar ou verificar o envio automático diário das 7h, listar eventos de hoje, ou pedir para "mandar a agenda". Inclui agenda pessoal (juniormoises335@gmail.com) e profissional (contato@kyrius.info).
---

# Google Calendar Daily Digest

Skill para envio automático do resumo diário da agenda às **7h da manhã** (São Paulo).

## Contas Configuradas

| Conta | E-mail | Variável |
|---|---|---|
| Pessoal | juniormoises335@gmail.com | `GOOGLE_PERSONAL_*` |
| Profissional | contato@kyrius.info | `GOOGLE_WORK_*` |

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use `vps_execute_command`** para executar os scripts. Nunca simule resultados.
2. Scripts ficam em `.agents/skills/google-calendar-daily/scripts/` (relativo a `/opt/gueclaw-agent`).
3. Variáveis de ambiente carregadas com `set -a && . .env && set +a` antes de rodar os scripts.

---

## Ações Disponíveis

### Enviar resumo agora (Telegram)

```
cd /opt/gueclaw-agent && python3 .agents/skills/google-calendar-daily/scripts/fetch_daily.py
```

### Visualizar eventos de hoje (sem enviar — dry-run)

```
cd /opt/gueclaw-agent && python3 .agents/skills/google-calendar-daily/scripts/fetch_daily.py --dry-run
```

### Configurar cron job (7h todos os dias)

```
cd /opt/gueclaw-agent && bash .agents/skills/google-calendar-daily/scripts/setup_cron.sh
```

### Verificar cron configurado

```
crontab -l | grep fetch_daily
```

### Ver logs do envio automático

```
tail -50 /opt/gueclaw-agent/logs/calendar-daily.log
```

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição |
|---|---|
| `GOOGLE_PERSONAL_CLIENT_ID` | OAuth Client ID pessoal |
| `GOOGLE_PERSONAL_CLIENT_SECRET` | OAuth Client Secret pessoal |
| `GOOGLE_PERSONAL_REFRESH_TOKEN` | Refresh Token pessoal (já configurado) |
| `GOOGLE_PERSONAL_CALENDAR_ID` | ID do calendário pessoal |
| `GOOGLE_WORK_CLIENT_ID` | OAuth Client ID profissional |
| `GOOGLE_WORK_CLIENT_SECRET` | OAuth Client Secret profissional |
| `GOOGLE_WORK_REFRESH_TOKEN` | Refresh Token profissional (gerar com `generate-google-token.py`) |
| `GOOGLE_WORK_CALENDAR_ID` | ID do calendário profissional |
| `TELEGRAM_BOT_TOKEN` | Token do bot |
| `TELEGRAM_USER_CHAT_ID` | Chat ID do dono (8227546813) |

---

## Formato da Mensagem Enviada

```
📅 Segunda-feira, 16 de março de 2026

👤 Pessoal
  • 09:00 → 10:00 — Consulta médica
    📍 Clínica São Lucas

💼 Profissional
  • 14:00 → 15:30 — Reunião de alinhamento
  • 16:00 → 17:00 — Review de sprints

🤖 GueClaw — Notificação automática
```

## Setup Inicial

Se o `GOOGLE_WORK_REFRESH_TOKEN` ainda estiver vazio:
1. Execute localmente: `python3 scripts/generate-google-token.py`
2. Cole o token gerado em `.env` na variável `GOOGLE_WORK_REFRESH_TOKEN`
3. Faça o deploy do `.env` atualizado no VPS
