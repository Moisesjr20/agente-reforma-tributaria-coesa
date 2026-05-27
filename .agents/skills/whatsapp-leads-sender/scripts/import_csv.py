#!/usr/bin/env python3
"""
import_csv.py
Migração única: lê leads.csv e popula o banco SQLite.

Uso:
    python3 import_csv.py                          # usa leads.csv padrão
    python3 import_csv.py --csv /caminho/outro.csv # CSV alternativo
    python3 import_csv.py --skip NUMERO1 NUMERO2   # marca números como já enviados

Flags:
    --skip NUM [NUM ...]   Números (whatsapp_number) a marcar como skip=1
                           Use para registrar leads que já foram disparados manualmente
                           antes do banco existir.
    --dry-run              Mostra quantos seriam importados sem gravar
"""
import csv
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR  = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from db_manager import DB_PATH, init_db, get_conn, upsert_lead, mark_skip

DEFAULT_CSV = os.path.join(SKILL_DIR, "data", "leads.csv")

# Colunas do CSV (case-insensitive)
COL_MAP = {
    "title":          "title",
    "street":         "street",
    "city":           "city",
    "website":        "website",
    "phone":          "phone",
    "whatsapp":       "whatsapp_number",
    "tem whatsapp?":  "_has_whatsapp",   # lido mas salvo pelo db_manager
    "enviado":        "_sent_at",        # lido para restaurar histórico de envios
}


def parse_args():
    args = {"csv": DEFAULT_CSV, "skip": [], "dry_run": False}
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == "--csv" and i + 1 < len(sys.argv):
            args["csv"] = sys.argv[i + 1]; i += 2
        elif arg == "--skip":
            i += 1
            while i < len(sys.argv) and not sys.argv[i].startswith("--"):
                args["skip"].append(sys.argv[i]); i += 1
        elif arg == "--dry-run":
            args["dry_run"] = True; i += 1
        else:
            i += 1
    return args


def normalize_col(name: str) -> str:
    return name.strip().lower()


def main():
    args = parse_args()
    csv_path = args["csv"]

    if not os.path.exists(csv_path):
        print(f"❌ CSV não encontrado: {csv_path}")
        sys.exit(1)

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    if not rows:
        print("⚠️  CSV vazio.")
        sys.exit(0)

    # Detecta colunas disponíveis
    sample_keys = {normalize_col(k) for k in rows[0].keys()}
    print(f"📄 CSV carregado: {len(rows)} linhas")
    print(f"   Colunas: {', '.join(rows[0].keys())}")

    if args["dry_run"]:
        valid = [r for r in rows if r.get("Whatsapp", "").strip()]
        print(f"\n🔍 DRY-RUN: {len(valid)} leads com número WhatsApp seriam importados.")
        return

    init_db()

    imported = 0
    skipped_no_num = 0
    already_existed = 0
    restored_sent = 0
    restored_wpp = 0

    with get_conn() as conn:
        for row in rows:
            # Normaliza chaves do CSV
            norm = {normalize_col(k): v for k, v in row.items()}

            whatsapp_number = (
                norm.get("whatsapp", "") or norm.get("whatsapp_number", "")
            ).strip()

            if not whatsapp_number:
                skipped_no_num += 1
                continue

            lead_id = upsert_lead(
                conn,
                title           = norm.get("title", "").strip(),
                street          = norm.get("street", "").strip(),
                city            = norm.get("city", "").strip(),
                website         = norm.get("website", "").strip(),
                phone           = norm.get("phone", "").strip(),
                whatsapp_number = whatsapp_number,
            )

            if lead_id == -1:
                already_existed += 1
            else:
                imported += 1

            # Restaura has_whatsapp do CSV se disponível
            has_wpp_raw = norm.get("tem whatsapp?", "").strip().lower()
            if has_wpp_raw == "true":
                conn.execute(
                    "UPDATE leads SET has_whatsapp = 1 WHERE whatsapp_number = ? AND has_whatsapp IS NULL",
                    (whatsapp_number,)
                )
                restored_wpp += 1
            elif has_wpp_raw == "false":
                conn.execute(
                    "UPDATE leads SET has_whatsapp = 0 WHERE whatsapp_number = ? AND has_whatsapp IS NULL",
                    (whatsapp_number,)
                )

            # Restaura sent_at do CSV se disponível
            sent_raw = norm.get("enviado", "").strip()
            if sent_raw and sent_raw not in ("sem_numero", ""):
                conn.execute(
                    "UPDATE leads SET sent_at = ? WHERE whatsapp_number = ? AND sent_at IS NULL",
                    (sent_raw, whatsapp_number)
                )
                restored_sent += 1

        # Marca skip para números informados pelo usuário
        for num in args["skip"]:
            mark_skip(conn, num.strip())
            print(f"   ⏭️  Marcado como já enviado: {num}")

        conn.commit()

    print(f"\n✅ Importação concluída!")
    print(f"   Inseridos (novos):      {imported}")
    print(f"   Já existiam no DB:      {already_existed}")
    print(f"   Sem número (ignorados): {skipped_no_num}")
    if restored_wpp:
        print(f"   WhatsApp restaurado:    {restored_wpp} leads")
    if restored_sent:
        print(f"   Enviados restaurados:   {restored_sent} leads")
    if args["skip"]:
        print(f"   Marcados skip:         {len(args['skip'])}")
    print(f"\n   Banco: {DB_PATH}")


if __name__ == "__main__":
    main()
