#!/usr/bin/env python3
import json
import os
import sys

# Path relativo ao script
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

def list_schedules(status_filter=None):
    queue = load_queue()
    
    if status_filter:
        queue = [q for q in queue if q.get("status") == status_filter]
        
    if not queue:
        print(f"Nenhum agendamento encontrado{f' com status: {status_filter}' if status_filter else ''}.")
        return

    print(f"📋 Total de agendamentos: {len(queue)}\n")
    for task in queue:
        status_emoji = "⏳" if task["status"] == "pending" else "✅" if task["status"] == "sent" else "❌" if task["status"] == "cancelled" else "⚠️"
        print(f"{status_emoji} ID: {task['id']}")
        print(f"   Data: {task['scheduled_time']}")
        print(f"   Para: {task['number']}")
        print(f"   Msg:  {task['text'][:50]}...")
        print(f"   Status: {task['status']}")
        print("-" * 30)

def cancel_schedule(task_id):
    queue = load_queue()
    found = False
    
    for task in queue:
        if task["id"] == task_id:
            if task["status"] == "pending":
                task["status"] = "cancelled"
                found = True
                print(f"✅ Agendamento {task_id} cancelado com sucesso!")
            else:
                print(f"❌ Agendamento {task_id} já está com status '{task['status']}' e não pode ser cancelado.")
                return
            break
            
    if found:
        save_queue(queue)
    else:
        print(f"❌ ID {task_id} não encontrado.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python3 manage.py list [status]")
        print("  python3 manage.py cancel <id>")
        sys.exit(1)
        
    action = sys.argv[1]
    
    if action == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        list_schedules(status)
    elif action == "cancel":
        if len(sys.argv) < 3:
            print("Informe o ID para cancelar.")
            sys.exit(1)
        cancel_schedule(sys.argv[2])
    else:
        print("Ação desconhecida.")
