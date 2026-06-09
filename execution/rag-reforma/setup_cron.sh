#!/usr/bin/env bash
# =============================================================
# setup_cron.sh — Configura o cron semanal do RAG Watchdog
# Executa toda segunda-feira às 08:00 UTC na VPS
#
# Uso:
#   bash execution/rag-reforma/setup_cron.sh
#   bash execution/rag-reforma/setup_cron.sh --remove
# =============================================================

set -euo pipefail

REMOVE=false
[[ "${1:-}" == "--remove" ]] && REMOVE=true

# ---------------------------------------------------------------------------
# Resolução de caminhos absolutos
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WATCHDOG="$SCRIPT_DIR/crawler_watchdog.py"
LOG_DIR="$PROJECT_ROOT/.tmp"
LOG_FILE="$LOG_DIR/watchdog.log"

# Detecta Python 3
PYTHON="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)"
if [[ -z "$PYTHON" ]]; then
  echo "[ERROR] Python não encontrado. Instale python3 e tente novamente."
  exit 1
fi

echo "======================================================"
echo "  RAG Watchdog — Configuração Cron (COESA)"
echo "======================================================"
echo ""
echo "Projeto  : $PROJECT_ROOT"
echo "Script   : $WATCHDOG"
echo "Python   : $PYTHON"
echo "Log      : $LOG_FILE"
echo "Schedule : toda segunda-feira às 08:00 UTC"
echo ""

# ---------------------------------------------------------------------------
# Remoção
# ---------------------------------------------------------------------------
if [[ "$REMOVE" == true ]]; then
  if crontab -l 2>/dev/null | grep -qF "crawler_watchdog.py"; then
    (crontab -l 2>/dev/null | grep -vF "crawler_watchdog.py") | crontab -
    echo "[OK] Cron removido."
  else
    echo "[INFO] Nenhum cron do watchdog encontrado."
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# Verificação de dependências
# ---------------------------------------------------------------------------
echo "Verificando dependências Python..."
if ! "$PYTHON" -c "import requests, bs4, openai, supabase, dotenv, pdfplumber" 2>/dev/null; then
  echo ""
  echo "[AVISO] Dependências faltando. Instalando..."
  "$PYTHON" -m pip install -r "$SCRIPT_DIR/requirements.txt" --quiet
  echo "[OK] Dependências instaladas."
fi
echo ""

# ---------------------------------------------------------------------------
# Verifica .env
# ---------------------------------------------------------------------------
ENV_FILE="$PROJECT_ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] Arquivo .env não encontrado em: $ENV_FILE"
  echo "        Crie o arquivo com as variáveis:"
  echo "          OPENROUTER_API_KEY=..."
  echo "          SUPABASE_URL=..."
  echo "          SUPABASE_SERVICE_ROLE_KEY=..."
  exit 1
fi

for VAR in OPENROUTER_API_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if ! grep -qE "^${VAR}=.+" "$ENV_FILE"; then
    echo "[ERROR] Variável '$VAR' ausente ou vazia no .env"
    exit 1
  fi
done
echo "[OK] .env verificado."
echo ""

# ---------------------------------------------------------------------------
# Garante diretório de logs
# ---------------------------------------------------------------------------
mkdir -p "$LOG_DIR"

# ---------------------------------------------------------------------------
# Registra o cron
# ---------------------------------------------------------------------------
# Linha: toda segunda 08:00 UTC | carrega .env antes de executar
CRON_LINE="0 8 * * 1 cd $PROJECT_ROOT && set -a && . $ENV_FILE && set +a && $PYTHON $WATCHDOG >> $LOG_FILE 2>&1"

if crontab -l 2>/dev/null | grep -qF "crawler_watchdog.py"; then
  echo "[INFO] Cron já está configurado:"
  crontab -l | grep "crawler_watchdog.py"
  echo ""
  read -rp "Deseja substituir? [s/N] " confirm
  if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo "Cancelado."
    exit 0
  fi
  (crontab -l 2>/dev/null | grep -vF "crawler_watchdog.py") | crontab -
fi

(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo ""
echo "[OK] Cron registrado com sucesso!"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Próximas execuções: toda segunda-feira às 08:00 UTC ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Verificar cron  : crontab -l"
echo "Testar agora    : $PYTHON $WATCHDOG --dry-run"
echo "Forçar execução : $PYTHON $WATCHDOG --force"
echo "Ver logs        : tail -f $LOG_FILE"
echo "Remover cron    : bash $0 --remove"
echo ""
