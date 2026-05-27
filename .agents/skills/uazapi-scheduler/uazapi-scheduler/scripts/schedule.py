#!/usr/bin/env python3
import json
import os
import sys
import uuid
import datetime

# Path relativo ao script ou variável de ambiente
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
DATA_FILE = os.path.join(SKILL_DIR, "data", "queue.json")

# Criar pasta data se não existir
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

def load_queue():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_queue(queue):
    with open(DATA_FILE, 'w') as f:
        json.dump(queue, f, indent=4)

def add_schedule(number, text, scheduled_time, timezone_str="America/Sao_Paulo"):
    queue = load_queue()
    
    # Valida formato ISO
    try:
        dt = datetime.datetime.fromisoformat(scheduled_time)
    except ValueError:
        print("❌ Erro: Data/Hora deve estar no formato ISO (YYYY-MM-DDTHH:MM:SS)")
        sys.exit(1)

    task_id = str(uuid.uuid4())[:8]
    
    task = {
        "id": task_id,
        "number": number,
        "text": text,
        "scheduled_time": scheduled_time,
        "timezone": timezone_str,
        "status": "pending",
        "created_at": datetime.datetime.now().isoformat()
    }
    
    queue.append(task)
    save_queue(queue)
    
    print(f"✅ Agendado com sucesso! ID: {task_id}")
    print(f"📅 Horário: {scheduled_time}")
    print(f"📱 Destino: {number}")
    print(f"💬 Mensagem: {text}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python3 schedule.py <numero> <data_hora_iso> <texto>")
        sys.exit(1)
        
    number = sys.argv[1]
    scheduled_time = sys.argv[2]
    text = sys.argv[3]
    
    add_schedule(number, text, scheduled_time)
