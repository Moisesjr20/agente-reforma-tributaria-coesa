#!/usr/bin/env python3
"""
check_whatsapp.py
Lê o CSV de leads, verifica quais números têm WhatsApp via UazAPI /chat/check
e atualiza a coluna "Tem Whatsapp?" com true ou false.

Uso:
    python3 check_whatsapp.py [--csv CAMINHO]

Por padrão, usa: .agents/skills/whatsapp-leads-sender/data/leads.csv
"""
import csv
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from uazapi_helper import check_numbers

SKILL_DIR = os.path.dirname(SCRIPT_DIR)
DEFAULT_CSV = os.path.join(SKILL_DIR, "data", "leads.csv")

BATCH_SIZE = 10          # quantos números por chamada à API (reduzido para evitar 504)
SLEEP_BETWEEN_BATCHES = 3  # segundos entre batches para não sobrecarregar

WHATSAPP_COL = "Tem Whatsapp?"
NUMBER_COL = "Whatsapp"


def load_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)
        fieldnames = reader.fieldnames
    return rows, fieldnames


def save_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";",
                                extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main():
    csv_path = DEFAULT_CSV
    if "--csv" in sys.argv:
        idx = sys.argv.index("--csv")
        if idx + 1 < len(sys.argv):
            csv_path = sys.argv[idx + 1]

    if not os.path.exists(csv_path):
        print(f"❌ Arquivo CSV não encontrado: {csv_path}")
        print("   Coloque o arquivo em .agents/skills/whatsapp-leads-sender/data/leads.csv")
        sys.exit(1)

    rows, fieldnames = load_csv(csv_path)

    # Garante que as colunas existam
    if WHATSAPP_COL not in fieldnames:
        fieldnames = list(fieldnames) + [WHATSAPP_COL]
    if "Enviado" not in fieldnames:
        fieldnames = list(fieldnames) + ["Enviado"]

    # Filtra apenas os que ainda não foram verificados
    to_check = [
        (i, row) for i, row in enumerate(rows)
        if not row.get(WHATSAPP_COL, "").strip()
        and row.get(NUMBER_COL, "").strip()
    ]

    if not to_check:
        print("✅ Todos os números já foram verificados.")
        total_true = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "true")
        total_false = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "false")
        print(f"   ✅ Com WhatsApp: {total_true}")
        print(f"   ❌ Sem WhatsApp: {total_false}")
        return

    numbers_only = [row.get(NUMBER_COL, "").strip() for _, row in to_check]
    print(f"🔍 Verificando {len(numbers_only)} números ainda não checados...")

    # Processa em batches
    results = {}
    for start in range(0, len(to_check), BATCH_SIZE):
        batch_items = to_check[start : start + BATCH_SIZE]
        batch_numbers = [row.get(NUMBER_COL, "").strip() for _, row in batch_items]

        print(f"   → Batch {start // BATCH_SIZE + 1}: {len(batch_numbers)} números...")
        try:
            batch_result = check_numbers(batch_numbers)
            results.update(batch_result)
        except Exception as e:
            print(f"   ⚠️  Erro no batch: {e}")
            # Marca como "error" para tentar novamente depois
            for num in batch_numbers:
                results[num] = None

        if start + BATCH_SIZE < len(to_check):
            time.sleep(SLEEP_BETWEEN_BATCHES)

    # Atualiza as linhas do CSV
    count_true = 0
    count_false = 0
    count_error = 0

    for i, row in to_check:
        num = row.get(NUMBER_COL, "").strip()
        verdict = results.get(num)
        if verdict is True:
            rows[i][WHATSAPP_COL] = "true"
            count_true += 1
        elif verdict is False:
            rows[i][WHATSAPP_COL] = "false"
            count_false += 1
        else:
            # Não conseguiu verificar — deixa em branco para tentar de novo
            rows[i][WHATSAPP_COL] = ""
            count_error += 1

    save_csv(csv_path, rows, fieldnames)

    print()
    print("📄 CSV atualizado!")
    print(f"   ✅ Com WhatsApp:       {count_true}")
    print(f"   ❌ Sem WhatsApp:       {count_false}")
    if count_error:
        print(f"   ⚠️  Erro (tentar depois): {count_error}")

    total_true = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "true")
    total_false = sum(1 for r in rows if r.get(WHATSAPP_COL, "").lower() == "false")
    total_pending = sum(1 for r in rows if not r.get(WHATSAPP_COL, "").strip())
    print(f"\n📊 Total geral:")
    print(f"   ✅ Com WhatsApp:    {total_true}")
    print(f"   ❌ Sem WhatsApp:    {total_false}")
    print(f"   ❓ Não verificado:  {total_pending}")


if __name__ == "__main__":
    main()
