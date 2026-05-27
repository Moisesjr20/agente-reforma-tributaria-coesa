#!/bin/bash
##############################################
# VPS Security Scanner - All Scans Runner
# Executa todos os scans em paralelo
##############################################

set -euo pipefail

VPS_IP="${VPS_HOST:-localhost}"
OUTPUT_DIR="/tmp/vps-security-scan-$(date +%s)"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Iniciando VPS Security Scan..."
echo "📁 Output: $OUTPUT_DIR"
echo ""

# 1. Network Scan
echo "[1/8] Network Scan (nmap)..."
if command -v nmap &> /dev/null; then
  timeout 60 nmap -sV -sC "$VPS_IP" > "$OUTPUT_DIR/nmap.txt" 2>&1 &
else
  echo "WARN: nmap not installed" > "$OUTPUT_DIR/nmap.txt"
fi

# 2. SSH Configuration
echo "[2/8] SSH Configuration Audit..."
if [ -f /etc/ssh/sshd_config ]; then
  cat /etc/ssh/sshd_config > "$OUTPUT_DIR/sshd_config.txt" 2>&1 &
else
  echo "ERROR: /etc/ssh/sshd_config not found" > "$OUTPUT_DIR/sshd_config.txt"
fi

# 3. Docker Vulnerability Scan
echo "[3/8] Docker Container Scan (trivy)..."
if command -v docker &> /dev/null && command -v trivy &> /dev/null; then
  docker ps --format '{{.Image}}' | xargs -I {} trivy image --severity HIGH,CRITICAL --no-progress {} > "$OUTPUT_DIR/trivy.txt" 2>&1 &
elif command -v docker &> /dev/null; then
  echo "WARN: trivy not installed (install: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh)" > "$OUTPUT_DIR/trivy.txt"
else
  echo "INFO: Docker not installed" > "$OUTPUT_DIR/trivy.txt"
fi

# 4. Package Vulnerabilities
echo "[4/8] System Package Audit..."
if command -v apt &> /dev/null; then
  apt list --upgradable 2>/dev/null > "$OUTPUT_DIR/upgradable.txt" &
elif command -v yum &> /dev/null; then
  yum list updates 2>/dev/null > "$OUTPUT_DIR/upgradable.txt" &
else
  echo "WARN: apt/yum not found" > "$OUTPUT_DIR/upgradable.txt"
fi

# 5. User Account Audit
echo "[5/8] User Account Audit..."
cat /etc/passwd | grep -v nologin | grep -v "/bin/false" > "$OUTPUT_DIR/users.txt" 2>&1 &

# 6. SUID Files
echo "[6/8] SUID Files Scan..."
timeout 120 find / -perm -4000 -type f 2>/dev/null > "$OUTPUT_DIR/suid.txt" &

# 7. Auth Log Analysis
echo "[7/8] Authentication Log Analysis..."
if [ -f /var/log/auth.log ]; then
  tail -n 500 /var/log/auth.log > "$OUTPUT_DIR/auth.txt" 2>&1 &
elif [ -f /var/log/secure ]; then
  tail -n 500 /var/log/secure > "$OUTPUT_DIR/auth.txt" 2>&1 &
else
  echo "WARN: auth.log not found" > "$OUTPUT_DIR/auth.txt"
fi

# 8. Firewall Status
echo "[8/8] Firewall Configuration..."
if command -v ufw &> /dev/null; then
  ufw status verbose > "$OUTPUT_DIR/firewall.txt" 2>&1 &
elif command -v iptables &> /dev/null; then
  iptables -L -n -v > "$OUTPUT_DIR/firewall.txt" 2>&1 &
else
  echo "WARN: No firewall found (ufw/iptables)" > "$OUTPUT_DIR/firewall.txt"
fi

# Aguarda todos os jobs em background
echo ""
echo "⏳ Aguardando conclusão de todos os scans..."
wait

echo ""
echo "✅ Scans concluídos!"
echo "📂 Resultados salvos em: $OUTPUT_DIR"
echo ""

# Retorna o path para o script Python processar
echo "$OUTPUT_DIR"
