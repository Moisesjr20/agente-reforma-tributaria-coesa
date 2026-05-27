#!/usr/bin/env python3
"""
worker.py
Daemon que dispara 1 mensagem de prospecção por slot horário:
  Slots: 9h, 12h, 15h, 18h (horário de Brasília / America/Sao_Paulo)
  Tolerância: até 4 minutos após o início do slot.

Uso:
    python3 worker.py            → loop contínuo (via nohup / PM2)
    python3 worker.py --once     → executa uma verificação e sai (para cron)

O estado dos slots já disparados hoje é salvo em worker_state.json
para evitar duplo disparo mesmo que o worker reinicie.
"""
import os
import sys
import time
import json
import datetime
import subprocess

from zoneinfo import ZoneInfo

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
STATE_PATH = os.path.join(SKILL_DIR, "data", "worker_state.json")

TZ = ZoneInfo("America/Sao_Paulo")

# Horários dos slots (hora inteira, 24h)
FIRE_HOURS = [9, 12, 15, 18]

# Janela de tolerância em minutos após o início do slot
TOLERANCE_MINUTES = 4

CHECK_INTERVAL_SECONDS = 30  # frequência do loop principal


def load_state():
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def get_today():
    return datetime.date.today().isoformat()


def already_fired_slot(state, slot_hour):
    today = get_today()
    if state.get("date") != today:
        return False
    return slot_hour in state.get("sent_slots", [])


def mark_slot_fired(state, slot_hour):
    today = get_today()
    if state.get("date") != today:
        state["date"] = today
        state["sent_count"] = 0
        state["sent_slots"] = []
    state["sent_slots"] = list(state.get("sent_slots", [])) + [slot_hour]
    state["sent_count"] = state.get("sent_count", 0) + 1
    return state


def fire_one_message():
    """Chama send_campaign.py --force. Retorna True se sucesso."""
    send_script = os.path.join(SCRIPT_DIR, "send_campaign.py")
    result = subprocess.run(
        [sys.executable, send_script, "--force"],
        capture_output=True,
        text=True,
    )
    print(result.stdout.strip())
    if result.returncode == 0:
        return True
    else:
        if result.stderr.strip():
            print(f"  stderr: {result.stderr.strip()}")
        return False


def check_and_fire():
    now = datetime.datetime.now(TZ)
    state = load_state()

    for slot_hour in FIRE_HOURS:
        if now.hour != slot_hour:
            continue
        if now.minute > TOLERANCE_MINUTES:
            continue
        if already_fired_slot(state, slot_hour):
            continue

        # É o momento de disparar!
        ts = now.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] 🕐 Slot das {slot_hour:02d}h — disparando mensagem...")

        success = fire_one_message()

        if success:
            state = mark_slot_fired(state, slot_hour)
            save_state(state)
            print(f"[{ts}] ✅ Slot {slot_hour}h registrado. Slots hoje: {state['sent_slots']}")
        else:
            print(f"[{ts}] ⚠️  Falha no envio do slot {slot_hour}h. Será tentado novamente se ainda dentro da janela.")

        # Só processa 1 slot por ciclo
        break


def main():
    print(f"🤖 WhatsApp Leads Sender Worker iniciado!")
    print(f"   Slots de disparo: {FIRE_HOURS} (Brasília)")
    print(f"   Tolerância: {TOLERANCE_MINUTES} minutos por slot")
    print(f"   Estado: {STATE_PATH}")
    print()

    if "--once" in sys.argv:
        check_and_fire()
        return

    while True:
        try:
            check_and_fire()
        except Exception as e:
            ts = datetime.datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{ts}] ❌ Erro no worker: {e}")

        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
