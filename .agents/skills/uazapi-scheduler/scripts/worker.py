#!/usr/bin/env python3
import json
import os
import sys
import time
import datetime
from zoneinfo import ZoneInfo

# Carrega .env do projeto (dois níveis acima de scripts/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(os.path.dirname(SKILL_DIR))  # /opt/gueclaw-agent
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")

if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

sys.path.insert(0, SCRIPT_DIR)
from uazapi_sender import send_message

# Path relativo ao script
DATA_FILE = os.path.join(SKILL_DIR, "data", "queue.json")

# Criar pasta data se não existir
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

# Buscar token do ENV
TOKEN = os.getenv("UAIZAPI_TOKEN")
if not TOKEN:
    print("❌ Erro: UAIZAPI_TOKEN não configurado!")
    sys.exit(1)

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

def process_queue():
    queue = load_queue()
    changed = False
    
    # Hora atual no timezone SP (padrão)
    tz = ZoneInfo("America/Sao_Paulo")
    now = datetime.datetime.now(tz)
    
    for task in queue:
        if task.get("status") != "pending":
            continue
            
        # Converter string ISO para datetime
        try:
            # Se não tiver timezone explícito, assume America/Sao_Paulo
            scheduled = datetime.datetime.fromisoformat(task["scheduled_time"])
            if scheduled.tzinfo is None:
                scheduled = scheduled.replace(tzinfo=tz)
                
            # Se a hora atual passou da hora agendada
            if now >= scheduled:
                print(f"[{now.isoformat()}] 🚀 Disparando tarefa {task['id']} para {task['number']}...")
                
                # Executa envio
                success, result = send_message(TOKEN, task["number"], task["text"])
                
                # Atualiza status
                if success:
                    task["status"] = "sent"
                    task["sent_at"] = now.isoformat()
                    print(f"  ✅ Enviado!")
                else:
                    task["status"] = "error"
                    task["error"] = str(result)
                    print(f"  ❌ Erro: {result}")
                    
                changed = True
                
        except Exception as e:
            print(f"Erro ao processar tarefa {task['id']}: {e}")
            task["status"] = "error"
            task["error"] = str(e)
            changed = True
            
    if changed:
        save_queue(queue)

if __name__ == "__main__":
    print(f"🤖 UazAPI Scheduler Worker iniciado!")
    print(f"Monitorando {DATA_FILE} a cada 60 segundos...")
    
    # Executa o worker em loop (útil se for rodar via PM2 ou nohup)
    # Se for rodar via cron real, remova o loop
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        process_queue()
        sys.exit(0)
        
    while True:
        try:
            process_queue()
        except Exception as e:
            print(f"Erro fatal no worker: {e}")
        
        # Dorme 1 minuto
        time.sleep(60)
