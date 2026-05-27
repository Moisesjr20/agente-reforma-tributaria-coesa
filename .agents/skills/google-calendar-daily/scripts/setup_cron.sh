#!/bin/bash
# GueClaw - Setup cron job for daily calendar digest at 07:00 (São Paulo = UTC-3 = 10:00 UTC)

AGENT_DIR="/opt/gueclaw-agent"
ENV_FILE="$AGENT_DIR/.env"
SCRIPT="$AGENT_DIR/.agents/skills/google-calendar-daily/scripts/fetch_daily.py"
LOG_FILE="$AGENT_DIR/logs/calendar-daily.log"

# 07:00 São Paulo = 10:00 UTC (São Paulo is always UTC-3, no DST since 2019)
# Scripts load .env via python-dotenv — no need for `source .env`
CRON_ENTRY="0 10 * * * cd $AGENT_DIR && python3 $SCRIPT >> $LOG_FILE 2>&1"

# Create log directory if needed
mkdir -p "$AGENT_DIR/logs"

# Remove existing entry to avoid duplicates
if crontab -l 2>/dev/null | grep -q "fetch_daily.py"; then
    echo "⚠️  Cron job existente encontrado. Removendo entrada antiga..."
    crontab -l 2>/dev/null | grep -v "fetch_daily.py" | crontab -
fi

# Install new cron entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job configurado: todo dia às 10:00 UTC (07:00 São Paulo)"
echo "📋 Entrada: $CRON_ENTRY"
echo "📄 Log: $LOG_FILE"
echo ""
echo "Para verificar: crontab -l | grep fetch_daily"
echo "Para testar agora: cd $AGENT_DIR && set -a && . $ENV_FILE && set +a && python3 $SCRIPT"
