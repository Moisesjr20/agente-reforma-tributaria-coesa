---
name: whatsapp-leads-sender
description: Skill para campanha automática de WhatsApp com leads de escritórios de advocacia. Use quando o usuário quiser verificar quais números têm WhatsApp, checar o status da campanha, iniciar o worker de envio, ver quantos leads foram enviados, pausar/retomar a campanha, pedir um relatório de disparos, ou mencionar "disparos", "leads", "campanha", "advocacia", "periciajudicial", "relatório", "relatorio", "quantos foram enviados", "progresso da campanha". Combina verificação de WhatsApp (UazAPI /chat/check), envio de mensagens, banco SQLite e geração de relatórios.
---

# Skill: WhatsApp Leads Sender — Campanha Advocacia

## Propósito
Automatiza o envio de mensagens de prospecção para escritórios de advocacia listados em CSV.

Fluxo completo:
1. **Migrar** CSV para SQLite (`import_csv.py`) — dados ficam seguros mesmo após deploys
2. **Verificar** WhatsApp em lotes de 10 a cada 5 min (`check_whatsapp.py --daemon`) → preenche `has_whatsapp`
3. **Enviar** mensagem personalizada para os confirmados — preenche `sent_at`
4. **Controlar** disparo: máximo 4 por dia, nos horários 9h, 12h, 15h, 18h (Brasília), **segunda a sexta**

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use `vps_execute_command`** para rodar os scripts. Nunca simule saídas.
2. O banco SQLite fica em: `.agents/skills/whatsapp-leads-sender/data/leads.db` no VPS.
3. O CSV original em `data/leads.csv` é apenas para seed — o SQLite é a fonte de verdade.
4. **Nunca altere o banco manualmente** — use os scripts.
5. Após cada ação, **mostre o resumo** (quantos verificados, quantos enviados, o que resta).
6. O token UazAPI é lido do `.env` — não hardcode.

## Onde os Scripts Estão (no VPS)

```
/opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/
    scripts/
        db_manager.py       ← camada SQLite (importada pelos outros scripts)
        import_csv.py       ← migração CSV → SQLite (rodar 1x)
        check_whatsapp.py   ← verifica has_whatsapp (lotes 10/5min)
        send_campaign.py    ← envia 1 mensagem para o próximo lead válido
        worker.py           ← daemon — dispara seg-sex 9h/12h/15h/18h
        uazapi_helper.py    ← utilitários HTTP (importado pelos outros)
        report.py           ← relatório completo
    data/
        leads.csv           ← CSV seed (lido pelo import_csv.py)
        leads.db            ← BANCO SQLITE (fonte de verdade dos leads)
        worker_state.json   ← controla quais slots já foram disparados hoje
        worker.log          ← log do worker daemon
        check.log           ← log do check_whatsapp daemon
```

---

## Relatório da Campanha

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/report.py
```

Saída esperada (formatada para Telegram):
```
📊 RELATÓRIO DE DISPAROS — ADVOCACIA
━━━━━━━━━━━━━━━━━━━━━

📋 BASE DE LEADS
  Total no banco:      992
  ✅ Têm WhatsApp:      961
  ❌ Sem WhatsApp:      31

📬 ENVIOS
  Enviados total:      8
  Fila pendente:       953
  Progresso:           0.8% da base válida

📅 HOJE
  Disparados hoje:     2 / 4
  Slots já disparados: 09h, 12h
  Próximos slots hoje: 15:00, 18:00
...
```

---

## Passo 0 — Migrar CSV para SQLite (1x)

Apenas na primeira vez ou após perda de dados:

```bash
cd /opt/gueclaw-agent
# 1. Garante que o CSV existe
ls .agents/skills/whatsapp-leads-sender/data/leads.csv

# 2. Importa CSV → SQLite
python3 .agents/skills/whatsapp-leads-sender/scripts/import_csv.py

# 3. Se quiser marcar leads que já foram enviados antes, use:
#    python3 import_csv.py --skip 5511999001 5511999002
```

---

## Passo 1 — Verificar Números WhatsApp (daemon 10/5min)

Inicia o verificador em background (lotes de 10, pausa de 5 minutos entre lotes):

```bash
cd /opt/gueclaw-agent
nohup python3 .agents/skills/whatsapp-leads-sender/scripts/check_whatsapp.py --daemon \
  > .agents/skills/whatsapp-leads-sender/data/check.log 2>&1 &
echo "Check daemon PID: $!"
```

Ver progresso:
```bash
tail -f /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/data/check.log
```

Alternativa sem daemon (verifica 1 lote de 10 e sai — para cron):
```bash
python3 .agents/skills/whatsapp-leads-sender/scripts/check_whatsapp.py
```

---

## Passo 2 — Enviar Manualmente (Teste)

Para enviar 1 mensagem imediatamente (ignora os horários programados):

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/send_campaign.py --force
```

---

## Passo 3 — Iniciar Worker (Envio Automático Seg-Sex 9h/12h/15h/18h)

```bash
cd /opt/gueclaw-agent
nohup python3 .agents/skills/whatsapp-leads-sender/scripts/worker.py \
  > .agents/skills/whatsapp-leads-sender/data/worker.log 2>&1 &
echo "Worker PID: $!"
```

Verificar se está rodando:
```bash
ps aux | grep "whatsapp-leads-sender.*worker" | grep -v grep
```

Ver logs do worker:
```bash
tail -30 /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/data/worker.log
```

---

## Passo 4 — Ver Status da Campanha

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/send_campaign.py --status
```

---

## Parar Workers

```bash
pkill -f "whatsapp-leads-sender.*worker"
pkill -f "whatsapp-leads-sender.*check_whatsapp"
```

---

## Reiniciar via PM2 (Opcional)

```bash
pm2 start /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/scripts/worker.py \
  --name wl-sender --interpreter python3
pm2 start /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/scripts/check_whatsapp.py \
  --name wl-checker --interpreter python3 -- --daemon
pm2 save
```

---

## Marcar Leads Já Enviados (histórico)

Se o usuário informar que já enviou para determinados números antes do SQLite existir:

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/import_csv.py \
  --skip 5588996427185 5588994853125
```

Ou marcar diretamente no SQLite:
```bash
sqlite3 .agents/skills/whatsapp-leads-sender/data/leads.db \
  "UPDATE leads SET sent_at='2026-03-19 09:00:00' WHERE whatsapp_number='5588996427185';"
```

---

## Mensagem Enviada aos Leads

```
Olá, Doutor(a). Seu escritório {NOME DO ESCRITÓRIO} ainda perde horas decifrando planilhas financeiras e lidando com laudos periciais e processos confusos?

Como assistente técnico, eu uno Contabilidade com Inteligência Artificial para varrer gigabytes de dados e entregar provas visuais e matemáticas irrefutáveis em tempo recorde. Nós cuidamos dos dados complexos; você foca na tese jurídica.

Conheça nossa metodologia e blinde seus processos:
👉 https://periciajudicial.kyrius.com.br/
```

---

## Horários de Disparo

| Slot | Horário (Brasília) | Dias          |
|------|-------------------|---------------|
| 1    | 09:00             | Seg a Sex     |
| 2    | 12:00             | Seg a Sex     |
| 3    | 15:00             | Seg a Sex     |
| 4    | 18:00             | Seg a Sex     |

- Máximo **4 disparos por dia**
- **1 lead por slot**
- Tolerância de **±4 minutos**
- **Fim de semana: nenhum disparo**
- Se o worker estiver offline durante um slot, esse slot é **perdido**

---

## Troubleshooting

**"DB não encontrado"**: rode `import_csv.py` para criar o banco a partir do CSV.

**"Nenhum lead na fila"**: todos os leads com WhatsApp já foram contatados, ou nenhum foi verificado ainda. Rode o `check_whatsapp.py` primeiro.

**"Token inválido"**: verifique `UAIZAPI_TOKEN` no `.env` do projeto.

**Worker não dispara no horário**: verifique os logs, se o processo está vivo com `ps aux | grep worker`, e se hoje é dia útil.

**Dados perdidos após deploy**: o SQLite (`leads.db`) está no `.gitignore` — nunca será deletado por `git clean`. Use `import_csv.py` para re-popular se necessário.

# Skill: WhatsApp Leads Sender — Campanha Advocacia

## Propósito
Automatiza o envio de mensagens de prospecção para escritórios de advocacia listados em CSV.

Fluxo completo:
1. **Verificar** quais números têm WhatsApp → preenche coluna `Tem Whatsapp?`
2. **Enviar** mensagem personalizada para os confirmados → preenche coluna `Enviado`
3. **Controlar** disparo: máximo 4 por dia, nos horários 9h, 12h, 15h, 18h (Brasília)

## ⚠️ REGRAS ABSOLUTAS

1. **SEMPRE use `vps_execute_command`** para rodar os scripts. Nunca simule saídas.
2. O CSV fica em: `.agents/skills/whatsapp-leads-sender/data/leads.csv` no VPS.
3. **Nunca altere o CSV manualmente** — use os scripts.
4. Após cada ação, **mostre o resumo** (quantos verificados, quantos enviados, o que resta).
5. O token UazAPI é lido do `.env` — não hardcode.

## Onde os Scripts Estão (no VPS)

```
/opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/
    scripts/
        check_whatsapp.py   ← verifica e atualiza coluna "Tem Whatsapp?"
        send_campaign.py    ← envia 1 mensagem para o próximo lead válido
        worker.py           ← daemon — dispara nos horários 9h/12h/15h/18h
        uazapi_helper.py    ← utilitários HTTP (importado pelos outros)
    data/
        leads.csv           ← CSV original + colunas preenchidas
        worker_state.json   ← controla quais slots já foram disparados hoje
```

---

## Relatório da Campanha

Gera um relatório completo com totais, progresso, últimos envios e próximos da fila.

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/report.py
```

Saída esperada (formatada para Telegram):
```
📊 RELATÓRIO DE DISPAROS — ADVOCACIA
━━━━━━━━━━━━━━━━━━━━━

📋 BASE DE LEADS
  Total no CSV:        992
  ✅ Têm WhatsApp:      961
  ❌ Sem WhatsApp:      31

📬 ENVIOS
  Enviados total:      8
  Fila pendente:       953
  Progresso:           0.8% da base válida

📅 HOJE
  Disparados hoje:     2 / 4
  Slots já disparados: 09h, 12h
  Próximos slots hoje: 15:00, 18:00

🕒 ÚLTIMOS ENVIOS
  • 2026-03-18 12:00 → Escritório Dr. Alexandre Pinto / Massapê
  • 2026-03-18 09:00 → Monteiro Setubal Advocacia / Camocim
  ...

⏭️ PRÓXIMOS NA FILA
  • Rafael Saldanha — Camocim
  • ADVOGADO EM MERUOCA — Meruoca
  • Sândila Barros — Jijoca de Jericoacoara
━━━━━━━━━━━━━━━━━━━━━
```

**Gatilhos para gerar o relatório:**
- "relatório de disparos"
- "relatorio da campanha"
- "quantos leads foram enviados"
- "progresso da campanha de advocacia"
- "me manda o relatório"
- "como está a campanha"

---

## Passo 0 — Upload do CSV para o VPS

Se o CSV ainda não estiver no VPS, use `vps_execute_command` para criar a pasta e então execute upload via `file_operations` ou cole o conteúdo diretamente:

```bash
mkdir -p /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/data
```

Depois envie o arquivo como `leads.csv` nessa pasta.

---

## Passo 1 — Verificar Números WhatsApp

Roda a verificação em lote (processa todos os números sem `Tem Whatsapp?` preenchido):

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/check_whatsapp.py
```

Saída esperada:
```
🔍 Verificando 120 números...
✅ 87 têm WhatsApp
❌ 33 não têm WhatsApp
📄 CSV atualizado em leads.csv
```

---

## Passo 2 — Enviar Manualmente (Teste)

Para enviar 1 mensagem imediatamente (ignora os horários programados):

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/send_campaign.py --force
```

Saída esperada:
```
📤 Enviando para: 5588999145201 (Escritório de Advocacia Dr. Alexandre Pinto)
✅ Mensagem enviada com sucesso!
📊 Resumo: 1 enviado hoje | 86 restantes na fila
```

---

## Passo 3 — Iniciar Worker (Envio Automático 9h/12h/15h/18h)

Inicia o daemon que verifica a hora e dispara nos slots configurados:

```bash
cd /opt/gueclaw-agent
nohup python3 .agents/skills/whatsapp-leads-sender/scripts/worker.py > .agents/skills/whatsapp-leads-sender/data/worker.log 2>&1 &
echo "Worker PID: $!"
```

Verificar se está rodando:
```bash
ps aux | grep "whatsapp-leads-sender.*worker" | grep -v grep
```

Ver logs do worker:
```bash
tail -30 /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/data/worker.log
```

---

## Passo 4 — Ver Status da Campanha

```bash
cd /opt/gueclaw-agent
python3 .agents/skills/whatsapp-leads-sender/scripts/send_campaign.py --status
```

Saída esperada:
```
📊 STATUS DA CAMPANHA
Total de leads:        120
✅ Têm WhatsApp:        87
❌ Sem WhatsApp:        33
📬 Já enviados:         12
⏳ Fila pendente:       75
📅 Enviados hoje:        2 / 4
```

---

## Parar o Worker

```bash
pkill -f "whatsapp-leads-sender.*worker"
```

---

## Reiniciar Worker via PM2 (Opcional)

Se o projeto usa PM2:
```bash
pm2 start /opt/gueclaw-agent/.agents/skills/whatsapp-leads-sender/scripts/worker.py --name wl-sender --interpreter python3
pm2 save
```

---

## Mensagem Enviada aos Leads

```
Olá, Doutor(a). Seu escritório {NOME DO ESCRITÓRIO} ainda perde horas decifrando planilhas financeiras e lidando com laudos periciais e processos confusos?

Como assistente técnico, eu uno Contabilidade com Inteligência Artificial para varrer gigabytes de dados e entregar provas visuais e matemáticas irrefutáveis em tempo recorde. Nós cuidamos dos dados complexos; você foca na tese jurídica.

Conheça nossa metodologia e blinde seus processos:
👉 https://periciajudicial.kyrius.com.br/
```

---

## Horários de Disparo

| Slot | Horário (Brasília) |
|------|-------------------|
| 1    | 09:00             |
| 2    | 12:00             |
| 3    | 15:00             |
| 4    | 18:00             |

- Máximo **4 disparos por dia**
- **1 lead por slot**
- O worker verifica com tolerância de **±4 minutos** por slot
- Se o worker estiver offline durante um slot, esse slot é **perdido** (não recuperado)

---

## Troubleshooting

**"Nenhum lead na fila"**: todos os leads com WhatsApp já foram contatados, ou nenhum foi verificado ainda. Rode o `check_whatsapp.py` primeiro.

**"Token inválido"**: verifique `UAIZAPI_TOKEN` no `.env` do projeto.

**Worker não dispara no horário**: verifique os logs e se o processo está vivo com `ps aux | grep worker`.
