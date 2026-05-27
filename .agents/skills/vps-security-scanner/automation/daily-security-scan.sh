#!/bin/bash
##############################################
# Daily Security Scan - Automation Script
# Executado via systemd timer às 06:00 diariamente
# Notifica via Telegram SEMPRE (independente de findings)
##############################################

set -euo pipefail

# Configuração
WORKSPACE="/opt/gueclaw-agent"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_USER_CHAT_ID:-}"
START_TIME=$(date +%s)

cd "$WORKSPACE" || exit 1

echo "🔒 Starting Daily VPS Security Scan..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Step 1: Run all security scans
echo "[1/4] Running security scans..."
OUTPUT_DIR=$(bash .agents/skills/vps-security-scanner/scripts/run-all-scans.sh)

if [ -z "$OUTPUT_DIR" ] || [ ! -d "$OUTPUT_DIR" ]; then
    echo "❌ ERROR: Scans failed to produce output directory"
    exit 1
fi

echo "✅ Scans completed: $OUTPUT_DIR"
echo ""

# Step 2: Parse results and generate report
echo "[2/4] Generating security report..."
REPORT=$(python3 .agents/skills/vps-security-scanner/scripts/parse-results.py "$OUTPUT_DIR")

if [ -z "$REPORT" ]; then
    echo "❌ ERROR: Report generation failed"
    exit 1
fi

echo "✅ Report generated"
echo ""

# Step 3: Save report
echo "[3/4] Saving report..."
REPORT_DIR="/opt/gueclaw-data/files/security-reports"
mkdir -p "$REPORT_DIR"

REPORT_PATH="$REPORT_DIR/$(date +%Y-%m-%d).md"
echo "$REPORT" > "$REPORT_PATH"

# Cleanup old reports (>90 days)
find "$REPORT_DIR" -name "*.md" -type f -mtime +90 -delete

echo "✅ Report saved: $REPORT_PATH"
echo ""

# Calculate scan duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Step 4: Send Telegram notification
echo "[4/4] Sending Telegram notification..."

# Determine severity badge
if echo "$REPORT" | grep -q "🔴 Critical"; then
    BADGE="🚨"
    ALERT_LEVEL="CRITICAL"
elif echo "$REPORT" | grep -c "🟠 High" | awk '$1 > 5' &> /dev/null; then
    BADGE="⚠️"
    ALERT_LEVEL="WARNING"
else
    BADGE="✅"
    ALERT_LEVEL="OK"
fi

# Extract summary (first 15 lines)
SUMMARY=$(echo "$REPORT" | head -n 20)

# Build notification message
MESSAGE="$BADGE **Daily Security Scan Report**

**Status:** $ALERT_LEVEL
**Scan Duration:** ${DURATION}s
**Full Report:** \`$REPORT_PATH\`

---

$SUMMARY

---

_Next scan: Tomorrow at 06:00 BRT_"

# Send via Telegram (if configured)
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"$TELEGRAM_CHAT_ID\",
            \"text\": $(echo "$MESSAGE" | jq -Rs .),
            \"parse_mode\": \"Markdown\"
        }" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Telegram notification sent"
    else
        echo "⚠️ WARNING: Telegram notification failed"
    fi
else
    echo "⚠️ WARNING: Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_USER_CHAT_ID)"
fi

echo ""
echo "📊 Security Scan Summary:"
echo "$REPORT" | grep -E "🔴|🟠|🟡|🔵|⚪" | head -10
echo ""
echo "✅ Daily security scan completed successfully!"
echo "📂 Full report: $REPORT_PATH"

exit 0
