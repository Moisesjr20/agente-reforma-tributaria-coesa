#!/usr/bin/env python3
"""
send_campaign.py
Envia mensagem de prospecção para o próximo lead que:
  - Tem has_whatsapp = 1 no SQLite
  - Tem sent_at IS NULL e skip = 0

Modos:
  python3 send_campaign.py            → envia 1 mensagem (usado pelo worker)
  python3 send_campaign.py --force    → idem, sem verificar limite diário
  python3 send_campaign.py --status   → mostra resumo da campanha, não envia nada

O controle de "enviados hoje" é feito via worker_state.json.
"""
import os
import sys
import json
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from uazapi_helper import send_text, check_numbers
from db_manager import init_db, get_conn, get_next_to_send, mark_sent, get_stats

SKILL_DIR  = os.path.dirname(SCRIPT_DIR)
STATE_PATH = os.path.join(SKILL_DIR, "data", "worker_state.json")

DAILY_LIMIT = 4      # disparos máximos por dia
MAX_VERIFY_TRIES = 15  # máximo de leads a testar antes de desistir

MESSAGE_TEMPLATE = """\
Olá, Doutor(a). Seu escritório {title} ainda perde horas decifrando planilhas financeiras e lidando com laudos periciais e processos confusos?

Como assistente técnico, eu uno Contabilidade com Inteligência Artificial para varrer gigabytes de dados e entregar provas visuais e matemáticas irrefutáveis em tempo recorde. Nós cuidamos dos dados complexos; você foca na tese jurídica.

Conheça nossa metodologia e blinde seus processos:
👉 https://periciajudicial.kyrius.com.br/"""


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
    init_db()
    with get_conn() as conn:
        stats = get_stats(conn)

    state = load_state()
    today_count = sent_today(state)
    slots_fired = state.get("sent_slots", []) if state.get("date") == get_today() else []

    print("📊 STATUS DA CAMPANHA")
    print(f"   Total de leads:        {stats['total']}")
    print(f"   ✅ Têm WhatsApp:        {stats['has_wpp']}")
    print(f"   ❌ Sem WhatsApp:        {stats['no_wpp']}")
    print(f"   ❓ Não verificados:     {stats['not_checked']}")
    print(f"   📬 Já enviados:         {stats['sent_total']}")
    print(f"   ⏳ Fila pendente:       {stats['pending']}")
    print(f"   📅 Enviados hoje:        {today_count} / {DAILY_LIMIT}")
    if slots_fired:
        print(f"   Slots disparados hoje: {slots_fired}")


def _verify_whatsapp(number: str) -> bool:
    """Verifica em tempo real se o número tem WhatsApp via /chat/check.
    Em caso de erro na API, loga e retorna True (não bloqueia o envio).
    """
    try:
        result = check_numbers([number])
        # A API pode devolver a chave com ou sem código de país normalizado.
        # Tenta a chave exata primeiro; depois busca por sufixo.
        if number in result:
            return bool(result[number])
        # Comparação por sufixo (ex.: '85999999999' vs '5585999999999')
        for key, val in result.items():
            if number.endswith(key) or key.endswith(number):
                return bool(val)
        # Se a API não retornou o número de forma alguma, considera inválido
        print(f"  ⚠️  /chat/check não retornou entrada para {number} — pulando")
        return False
    except Exception as exc:
        print(f"  ⚠️  Falha em /chat/check para {number}: {exc} — tentando enviar mesmo assim")
        return True  # fallback conservador: não bloqueia se a API falhar


def send_one(force=False):
    init_db()
    state = load_state()

    if not force:
        count = sent_today(state)
        if count >= DAILY_LIMIT:
            print(f"⏸️  Limite diário atingido ({DAILY_LIMIT} disparos). Tente amanhã.")
            sys.exit(0)

    with get_conn() as conn:
        for attempt in range(1, MAX_VERIFY_TRIES + 1):
            next_lead = get_next_to_send(conn)

            if next_lead is None:
                print("⏸️  Nenhum lead pendente na fila. Campanha concluída ou verifique WhatsApp primeiro.")
                sys.exit(2)  # exit 2 = sem leads

            number  = next_lead["whatsapp_number"]
            title   = (next_lead["title"] or "Desconhecido").strip()
            lead_id = next_lead["id"]

            # ── Verificação em tempo real ──────────────────────────────────
            print(f"🔍 [{attempt}/{MAX_VERIFY_TRIES}] Verificando WhatsApp: {number} ({title})")
            if not _verify_whatsapp(number):
                print(f"  ❌ Sem WhatsApp — marcando skip e testando próximo")
                conn.execute(
                    "UPDATE leads SET has_whatsapp = 0, skip = 1 WHERE id = ?",
                    (lead_id,)
                )
                conn.commit()
                continue  # pega próximo lead

            # ── Número válido — dispara ────────────────────────────────────
            message = MESSAGE_TEMPLATE.format(title=title)
            print(f"📤 Enviando para: {number} ({title})")

            success, response = send_text(number, message)

            if success:
                sent_at = datetime.datetime.now().isoformat(timespec="seconds")
                mark_sent(conn, lead_id, sent_at)
                conn.commit()

                state = increment_today(state)
                save_state(state)

                pending = conn.execute(
                    "SELECT COUNT(*) FROM leads WHERE has_whatsapp = 1 AND sent_at IS NULL AND skip = 0"
                ).fetchone()[0]

                print(f"✅ Mensagem enviada com sucesso! ({sent_at})")
                print(f"📊 Enviados hoje: {sent_today(state)} / {DAILY_LIMIT} | Restantes na fila: {pending}")
                return  # disparo concluído — sai normalmente
            else:
                err = response.get("error", str(response))
                print(f"❌ Falha ao enviar para {number}: {err}")
                sys.exit(1)

        # Esgotou MAX_VERIFY_TRIES sem encontrar número válido
        print(f"⚠️  Testados {MAX_VERIFY_TRIES} leads consecutivos sem WhatsApp válido. Verifique o banco.")
        sys.exit(2)


if __name__ == "__main__":
    if "--status" in sys.argv:
        print_status()
    elif "--force" in sys.argv:
        send_one(force=True)
    else:
        send_one(force=False)
