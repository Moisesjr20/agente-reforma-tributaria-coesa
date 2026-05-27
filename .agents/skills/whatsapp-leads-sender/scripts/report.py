#!/usr/bin/env python3
"""
report.py
Gera relatório completo da campanha de disparos WhatsApp.

Uso:
    python3 report.py            → texto formatado para Telegram
    python3 report.py --json     → JSON puro (para automações)

Retorna código 0 sempre (relatório é informativo, não pode "falhar").
"""
import os
import sys
import json
import datetime

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR  = os.path.dirname(SCRIPT_DIR)
STATE_PATH = os.path.join(SKILL_DIR, "data", "worker_state.json")
sys.path.insert(0, SCRIPT_DIR)

from db_manager import init_db, get_conn, get_stats

DAILY_LIMIT = 4
FIRE_HOURS  = [9, 12, 15, 18]


def load_state():
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def get_today():
    return datetime.date.today().isoformat()


def worker_is_running():
    import subprocess
    try:
        result = subprocess.run(
            ["ps", "aux"],
            capture_output=True, text=True
        )
        return "whatsapp-leads-sender/scripts/worker.py" in result.stdout
    except Exception:
        return None  # indeterminado


def build_stats(state):
    init_db()
    with get_conn() as conn:
        db_stats = get_stats(conn)

    today = get_today()
    sent_today_count = 0
    slots_fired = []
    if state.get("date") == today:
        sent_today_count = state.get("sent_count", 0)
        slots_fired = state.get("sent_slots", [])

    # Next slots today
    if ZoneInfo:
        tz = ZoneInfo("America/Sao_Paulo")
        now = datetime.datetime.now(tz)
    else:
        now = datetime.datetime.now()

    unfired_slots = [h for h in FIRE_HOURS if h not in slots_fired]
    next_slots = [f"{h:02d}:00" for h in unfired_slots
                  if h > now.hour or (h == now.hour and now.minute <= 4)]

    return {
        "total":             db_stats["total"],
        "has_wpp":           db_stats["has_wpp"],
        "no_wpp":            db_stats["no_wpp"],
        "not_checked":       db_stats["not_checked"],
        "sent_total":        db_stats["sent_total"],
        "pending":           db_stats["pending"],
        "sent_today":        sent_today_count,
        "daily_limit":       DAILY_LIMIT,
        "slots_fired_today": slots_fired,
        "next_slots_today":  next_slots,
        "recent_sends":      db_stats["recent_sends"],
        "next_leads":        db_stats["next_leads"],
        "pct_sent":          db_stats["pct_sent"],
    }


def format_telegram(stats):
    lines = []
    lines.append("📊 RELATÓRIO DE DISPAROS — ADVOCACIA")
    lines.append("━━━━━━━━━━━━━━━━━━━━━")
    lines.append("")
    lines.append("📋 BASE DE LEADS")
    lines.append(f"  Total no banco:      {stats['total']}")
    lines.append(f"  ✅ Têm WhatsApp:      {stats['has_wpp']}")
    lines.append(f"  ❌ Sem WhatsApp:      {stats['no_wpp']}")
    if stats["not_checked"]:
        lines.append(f"  ❓ Não verificados:  {stats['not_checked']}")
    lines.append("")
    lines.append("📬 ENVIOS")
    lines.append(f"  Enviados total:      {stats['sent_total']}")
    lines.append(f"  Fila pendente:       {stats['pending']}")
    if stats["has_wpp"]:
        lines.append(f"  Progresso:           {stats['pct_sent']}% da base válida")
    lines.append("")
    lines.append("📅 HOJE")
    lines.append(f"  Disparados hoje:     {stats['sent_today']} / {stats['daily_limit']}")

    if stats["slots_fired_today"]:
        fired_str = ", ".join(f"{h:02d}h" for h in stats["slots_fired_today"])
        lines.append(f"  Slots já disparados: {fired_str}")

    if stats["next_slots_today"]:
        slots_str = ", ".join(stats["next_slots_today"])
        lines.append(f"  Próximos slots hoje: {slots_str}")
    else:
        lines.append("  Próximos slots hoje: nenhum (fim do dia)")

    if stats["recent_sends"]:
        lines.append("")
        lines.append("🕒 ÚLTIMOS ENVIOS")
        for r in stats["recent_sends"]:
            sent_at = r["sent_at"][:16].replace("T", " ") if "T" in r["sent_at"] else r["sent_at"][:16]
            city = f" / {r['city']}" if r["city"] else ""
            lines.append(f"  • {sent_at} → {r['title'][:35]}{city}")

    if stats["next_leads"]:
        lines.append("")
        lines.append("⏭️ PRÓXIMOS NA FILA")
        for r in stats["next_leads"]:
            city = f" — {r['city']}" if r["city"] else ""
            lines.append(f"  • {r['title'][:40]}{city}")

    lines.append("")
    lines.append("━━━━━━━━━━━━━━━━━━━━━")

    return "\n".join(lines)


def main():
    state = load_state()
    stats = build_stats(state)

    if "--json" in sys.argv:
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    else:
        print(format_telegram(stats))


if __name__ == "__main__":
    main()
