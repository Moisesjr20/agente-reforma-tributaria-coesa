#!/usr/bin/env python3
"""
check_whatsapp.py
Verifica quais números têm WhatsApp via UazAPI e salva resultado no SQLite.

Modos:
    python3 check_whatsapp.py              → verifica próximos 10 não checados e sai
    python3 check_whatsapp.py --daemon     → loop: 10 números a cada 5 minutos
    python3 check_whatsapp.py --all        → verifica TODOS os não checados de uma vez
                                             (não recomendado — pode ser bloqueado pela API)
    python3 check_whatsapp.py --batch N    → define tamanho do lote (padrão 10)

Em modo --daemon o processo fica vivo e é controlado por PM2 ou nohup.
O modo padrão (sem flag) é ideal para chamada via cron a cada 5 minutos:

    */5 * * * * cd /opt/gueclaw-agent && python3 \\
        .agents/skills/whatsapp-leads-sender/scripts/check_whatsapp.py >> \\
        .agents/skills/whatsapp-leads-sender/data/check.log 2>&1
"""
import os
import sys
import time
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR  = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from uazapi_helper import check_numbers
from db_manager import init_db, get_conn, get_unchecked, set_has_whatsapp, get_stats

BATCH_SIZE    = 10   # números por chamada à API
DAEMON_SLEEP  = 300  # 5 minutos entre batches no modo daemon


def _ts():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def process_batch(batch_size: int) -> dict:
    """
    Pega 'batch_size' leads não verificados, consulta a API e salva no DB.
    Retorna {"checked": N, "found_wpp": N, "no_wpp": N, "errors": N, "remaining": N}
    """
    init_db()
    with get_conn() as conn:
        rows = get_unchecked(conn, limit=batch_size)

        if not rows:
            stats = get_stats(conn)
            return {"checked": 0, "found_wpp": 0, "no_wpp": 0, "errors": 0,
                    "remaining": 0, "total_not_checked": stats["not_checked"]}

        numbers = [r["whatsapp_number"] for r in rows]
        print(f"[{_ts()}] 🔍 Verificando {len(numbers)} números...")

        try:
            results = check_numbers(numbers)
        except Exception as e:
            print(f"[{_ts()}] ❌ Erro na API: {e}")
            return {"checked": 0, "found_wpp": 0, "no_wpp": 0, "errors": len(numbers),
                    "remaining": None}

        found_wpp = 0
        no_wpp    = 0
        errors    = 0

        for r in rows:
            num = r["whatsapp_number"]
            verdict = results.get(num)
            if verdict is True:
                set_has_whatsapp(conn, num, True)
                found_wpp += 1
            elif verdict is False:
                set_has_whatsapp(conn, num, False)
                no_wpp += 1
            else:
                # API não retornou resposta para este número — mantém NULL para tentar depois
                errors += 1

        conn.commit()

        remaining = conn.execute(
            "SELECT COUNT(*) FROM leads WHERE has_whatsapp IS NULL AND skip = 0"
        ).fetchone()[0]

    checked = found_wpp + no_wpp
    print(f"[{_ts()}] ✅ {found_wpp} têm WhatsApp | ❌ {no_wpp} sem WhatsApp"
          + (f" | ⚠️  {errors} erros" if errors else "")
          + f" | 🔄 {remaining} ainda a verificar")

    return {"checked": checked, "found_wpp": found_wpp, "no_wpp": no_wpp,
            "errors": errors, "remaining": remaining}


def run_daemon(batch_size: int):
    print(f"[{_ts()}] 🤖 check_whatsapp daemon iniciado (lotes de {batch_size}, intervalo {DAEMON_SLEEP}s)")
    while True:
        result = process_batch(batch_size)

        if result.get("remaining") == 0:
            print(f"[{_ts()}] ✅ Todos os números verificados. Daemon encerrando.")
            break

        if result.get("checked") == 0 and result.get("errors", 0) == 0:
            print(f"[{_ts()}] ✅ Nada a verificar. Daemon encerrando.")
            break

        time.sleep(DAEMON_SLEEP)


def run_all(batch_size: int):
    """Processa todos os não-verificados em batches seguidos (com pausa curta)."""
    total_checked = 0
    total_found   = 0
    total_no      = 0

    while True:
        result = process_batch(batch_size)
        total_checked += result.get("checked", 0)
        total_found   += result.get("found_wpp", 0)
        total_no      += result.get("no_wpp", 0)

        remaining = result.get("remaining", 0)
        if not remaining:
            break

        time.sleep(3)

    print(f"\n📊 Verificação completa: {total_checked} checados | "
          f"{total_found} com WhatsApp | {total_no} sem WhatsApp")


def main():
    batch_size = BATCH_SIZE
    if "--batch" in sys.argv:
        i = sys.argv.index("--batch")
        if i + 1 < len(sys.argv):
            try:
                batch_size = int(sys.argv[i + 1])
            except ValueError:
                pass

    if "--daemon" in sys.argv:
        run_daemon(batch_size)
    elif "--all" in sys.argv:
        run_all(batch_size)
    else:
        # Modo padrão: processa um lote e sai (ideal para cron)
        process_batch(batch_size)


if __name__ == "__main__":
    main()
