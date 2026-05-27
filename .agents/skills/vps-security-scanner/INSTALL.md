# VPS Security Scanner - Installation & Setup Guide

## Instalação Completa (VPS)

### Passo 1: Copie os arquivos para o VPS

```bash
# Da sua máquina local:
cd "d:\Clientes de BI\projeto GueguelClaw"

# Copiar skill para o VPS
scp -r .agents/skills/vps-security-scanner root@147.93.69.211:/opt/gueclaw-agent/.agents/skills/

# Copiar subagente para o VPS
scp .agents/agents/03-infrastructure/security-guardian.md root@147.93.69.211:/opt/gueclaw-agent/.agents/agents/03-infrastructure/
```

### Passo 2: Configurar systemd timer no VPS

```bash
# SSH no VPS
ssh -i C:\Users\kyriu\.ssh\gueclaw_vps root@147.93.69.211

# Criar diretório de automação
mkdir -p /opt/gueclaw/automation

# Copiar script de automação
cp /opt/gueclaw-agent/.agents/skills/vps-security-scanner/automation/daily-security-scan.sh /opt/gueclaw/automation/
chmod +x /opt/gueclaw/automation/daily-security-scan.sh

# Instalar timer e service
cp /opt/gueclaw-agent/.agents/skills/vps-security-scanner/systemd/vps-security-scan.timer /etc/systemd/system/
cp /opt/gueclaw-agent/.agents/skills/vps-security-scanner/systemd/vps-security-scan.service /etc/systemd/system/

# Recarregar systemd
systemctl daemon-reload

# Habilitar e iniciar timer
systemctl enable vps-security-scan.timer
systemctl start vps-security-scan.timer

# Verificar status
systemctl status vps-security-scan.timer
```

### Passo 3: Instalar dependências (tools de scan)

```bash
# nmap (network scan)
apt update && apt install -y nmap

# trivy (Docker CVE scanner)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# grype (package vulnerability scanner - opcional)
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# jq (JSON processing para Telegram)
apt install -y jq

# Verificar instalações
which nmap trivy jq
```

### Passo 4: Teste manual

```bash
# Executar scan manualmente
bash /opt/gueclaw/automation/daily-security-scan.sh

# Deve gerar relatório em:
# /opt/gueclaw-data/files/security-reports/YYYY-MM-DD.md

# Verificar próxima execução do timer
systemctl list-timers vps-security-scan.timer
```

### Passo 5: Validar automação

```bash
# Forçar execução do service (sem esperar timer)
systemctl start vps-security-scan.service

# Ver logs
journalctl -u vps-security-scan.service -f

# Ver status do timer
systemctl status vps-security-scan.timer

# Próxima execução agendada
systemctl list-timers | grep vps-security
```

---

## Troubleshooting

### Erro: "trivy not found"
```bash
# Reinstalar trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
# Testar
trivy --version
```

### Erro: "Permission denied" ao rodar scans
```bash
# Scripts precisam ser executáveis
chmod +x /opt/gueclaw-agent/.agents/skills/vps-security-scanner/scripts/*.sh
chmod +x /opt/gueclaw-agent/.agents/skills/vps-security-scanner/scripts/*.py
chmod +x /opt/gueclaw/automation/daily-security-scan.sh
```

### Timer não executa no horário certo
```bash
# Verificar timezone do sistema
timedatectl

# Ajustar para America/Sao_Paulo se necessário
timedatectl set-timezone America/Sao_Paulo

# Recarregar timer
systemctl restart vps-security-scan.timer
```

### Telegram não envia notificações
```bash
# Verificar variáveis de ambiente no .env
cat /opt/gueclaw-agent/.env | grep TELEGRAM

# Variáveis necessárias:
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_USER_CHAT_ID=...

# Testar envio manual
TELEGRAM_BOT_TOKEN="seu_token"
TELEGRAM_CHAT_ID="seu_chat_id"

curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=Teste de notificação"
```

---

## Comandos Úteis

| Comando | Descrição |
|---|---|
| `systemctl status vps-security-scan.timer` | Ver status do timer |
| `systemctl list-timers` | Listar todos os timers ativos |
| `journalctl -u vps-security-scan.service` | Ver logs do service |
| `systemctl start vps-security-scan.service` | Executar scan manualmente |
| `ls -lh /opt/gueclaw-data/files/security-reports/` | Listar relatórios salvos |
| `systemctl disable vps-security-scan.timer` | Para desabilitar scan automático |

---

## Estrutura de Arquivos Final

```
/opt/gueclaw-agent/
└── .agents/
    ├── skills/
    │   └── vps-security-scanner/
    │       ├── SKILL.md
    │       ├── scripts/
    │       │   ├── run-all-scans.sh
    │       │   └── parse-results.py
    │       ├── automation/
    │       │   └── daily-security-scan.sh
    │       └── systemd/
    │           ├── vps-security-scan.timer
    │           └── vps-security-scan.service
    └── agents/
        └── 03-infrastructure/
            └── security-guardian.md

/opt/gueclaw/
└── automation/
    └── daily-security-scan.sh

/etc/systemd/system/
├── vps-security-scan.timer
└── vps-security-scan.service

/opt/gueclaw-data/files/security-reports/
├── 2026-04-09.md
├── 2026-04-10.md
└── ... (um por dia)
```

---

**Status:** ✅ Pronto para deploy
**Próxima ação:** Executar os comandos de instalação no VPS
