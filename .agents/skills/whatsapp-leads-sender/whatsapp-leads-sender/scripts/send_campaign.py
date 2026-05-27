#!/usr/bin/env python3
"""
send_campaign.py
Envia mensagem de prospecção para o próximo lead que:
  - Tem "Tem Whatsapp?" == "true"
  - Tem "Enviado" em branco

Modos:
  python3 send_campaign.py            → envia 1 mensagem (usado pelo worker)
  python3 send_campaign.py --force    → idem, sem verificar limite diário
  python3 send_campaign.py --status   → mostra resumo da campanha, não envia nada

O controle de "enviados hoje" é feito via worker_state.json.
"""
import csv
import os
import sys
import json
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from uazapi_helper import send_text

SKILL_DIR = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(SKILL_DIR, "data", "leads.csv")
STATE_PATH = os.path.join(SKILL_DIR, "data", "worker_state.json")

WHATSAPP_COL = "Tem Whatsapp?"
NUMBER_COL = "Whatsapp"
SENT_COL = "Enviado"
TITLE_COL = "title"

DAILY_LIMIT = 4  # disparos máximos por dia

MESSAGE_TEMPLATE = """\
Olá, Doutor(a). Seu escritório {title} ainda perde horas decifrando planilhas financeiras e lidando com laudos periciais e processos confusos?

Como assistente técnico, eu uno Contabilidade com Inteligência Artificial para varrer gigabytes de dados e entregar provas visuais e matemáticas irrefutáveis em tempo recorde. Nós cuidamos dos dados complexos; você foca na tese jurídica.

Conheça nossa metodologia e blinde seus processos:
👉 https://periciajudicial.kyrius.com.br/"""


def load_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)
        fieldnames = list(reader.fieldnames)
    return rows, fieldnames


def save_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";",
                                extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


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


def sent_today(state):
    today = get_today()
    return state.get("date") == today and state.get("sent_count", 0) or 0


def increment_today(state):
    today = get_today()
    if state.get("date") != today:
        state["date"] = today
        state["sent_count"] = 0
        state["sent_slots"] = []
    state["sent_count"] = state.get("sent_count", 0) + 1
    return state


def print_status():
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV não encontrado: {CSV_PATH}")
        return

    rows, _ = load_csv(CSV_PATH)
    state = load_state()

    total = len(rows)
    has_wpp = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "true")
    no_wpp = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "false")
    not_checked = sum(1 for r in rows if not r.get(WHATSAPP_COL, "").strip())
    sent = sum(1 for r in rows if r.get(SENT_COL, "").strip())
    pending = sum(
        1 for r in rows
        if r.get(WHATSAPP_COL, "").lower() == "true"
        and not r.get(SENT_COL, "").strip()
    )

    today_count = sent_today(state)
    slots_fired = state.get("sent_slots", []) if state.get("date") == get_today() else []

    print("📊 STATUS DA CAMPANHA")
    print(f"   Total de leads:        {total}")
    print(f"   ✅ Têm WhatsApp:        {has_wpp}")
    print(f"   ❌ Sem WhatsApp:        {no_wpp}")
    print(f"   ❓ Não verificados:     {not_checked}")
    print(f"   📬 Já enviados:         {sent}")
    print(f"   ⏳ Fila pendente:       {pending}")
    print(f"   📅 Enviados hoje:        {today_count} / {DAILY_LIMIT}")
    if slots_fired:
        print(f"   Slots disparados hoje: {slots_fired}")


def send_one(force=False):
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV não encontrado: {CSV_PATH}")
        sys.exit(1)

    rows, fieldnames = load_csv(CSV_PATH)

    # Garante colunas de saída existem
    if SENT_COL not in fieldnames:
        fieldnames.append(SENT_COL)

    state = load_state()

    if not force:
        count = sent_today(state)
        if count >= DAILY_LIMIT:
            print(f"⏸️  Limite diário atingido ({DAILY_LIMIT} disparos). Tente amanhã.")
            sys.exit(0)

    # Pega próximo lead válido
    next_lead = None
    next_idx = None
    for i, row in enumerate(rows):
        if (
            row.get(WHATSAPP_COL, "").lower() == "true"
            and not row.get(SENT_COL, "").strip()
        ):
            next_lead = row
            next_idx = i
            break

    if next_lead is None:
        print("✅ Nenhum lead pendente na fila. Campanha concluída ou verifique WhatsApp primeiro.")
        sys.exit(0)

    number = next_lead.get(NUMBER_COL, "").strip()
    title = next_lead.get(TITLE_COL, "Desconhecido").strip()

    if not number:
        print(f"⚠️  Lead {title} não tem número, pulando...")
        rows[next_idx][SENT_COL] = "sem_numero"
        save_csv(CSV_PATH, rows, fieldnames)
        sys.exit(1)

    message = MESSAGE_TEMPLATE.format(title=title)

    print(f"📤 Enviando para: {number} ({title})")

    success, response = send_text(number, message)

    if success:
        sent_at = datetime.datetime.now().isoformat(timespec="seconds")
        rows[next_idx][SENT_COL] = sent_at
        save_csv(CSV_PATH, rows, fieldnames)

        state = increment_today(state)
        save_state(state)

        pending = sum(
            1 for r in rows
            if r.get(WHATSAPP_COL, "").lower() == "true"
            and not r.get(SENT_COL, "").strip()
        )
        print(f"✅ Mensagem enviada com sucesso! ({sent_at})")
        print(f"📊 Enviados hoje: {sent_today(state)} / {DAILY_LIMIT} | Restantes na fila: {pending}")
    else:
        err = response.get("error", str(response))
        print(f"❌ Falha ao enviar para {number}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    if "--status" in sys.argv:
        print_status()
    elif "--force" in sys.argv:
        send_one(force=True)
    else:
        send_one(force=False)
