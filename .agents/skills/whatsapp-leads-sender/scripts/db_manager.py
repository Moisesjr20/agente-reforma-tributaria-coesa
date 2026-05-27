#!/usr/bin/env python3
"""
db_manager.py
Camada de acesso ao banco SQLite de leads.
Usado por todos os outros scripts desta skill (check_whatsapp, send_campaign, report, import_csv).

Schema:
    leads (
        id              INTEGER PK AUTOINCREMENT,
        title           TEXT,
        street          TEXT,
        city            TEXT,
        website         TEXT,
        phone           TEXT,
        whatsapp_number TEXT UNIQUE NOT NULL,
        has_whatsapp    INTEGER DEFAULT NULL,   -- NULL=não verificado, 1=sim, 0=não
        sent_at         TEXT DEFAULT NULL,      -- ISO datetime do envio, NULL=não enviado
        skip            INTEGER DEFAULT 0,      -- 1=ignorar este lead (ex: já enviado antes)
        created_at      TEXT DEFAULT CURRENT_TIMESTAMP
    )
"""
import os
import sqlite3
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR  = os.path.dirname(SCRIPT_DIR)
DB_PATH    = os.path.join(SKILL_DIR, "data", "leads.db")


def get_conn(db_path: str = DB_PATH) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path: str = DB_PATH):
    """Cria tabela se não existir. Seguro para chamar múltiplas vezes."""
    with get_conn(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                title           TEXT,
                street          TEXT,
                city            TEXT,
                website         TEXT,
                phone           TEXT,
                whatsapp_number TEXT UNIQUE NOT NULL,
                has_whatsapp    INTEGER DEFAULT NULL,
                sent_at         TEXT DEFAULT NULL,
                skip            INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Índices para as queries mais usadas
        conn.execute("CREATE INDEX IF NOT EXISTS idx_has_whatsapp ON leads(has_whatsapp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sent_at ON leads(sent_at)")
        conn.commit()


def upsert_lead(conn: sqlite3.Connection, *, title: str, street: str = "",
                city: str = "", website: str = "", phone: str = "",
                whatsapp_number: str) -> int:
    """Insere lead. Se whatsapp_number já existe, não altera nada. Retorna id."""
    cur = conn.execute("""
        INSERT INTO leads (title, street, city, website, phone, whatsapp_number)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(whatsapp_number) DO NOTHING
    """, (title, street, city, website, phone, whatsapp_number))
    if cur.lastrowid:
        return cur.lastrowid
    row = conn.execute("SELECT id FROM leads WHERE whatsapp_number = ?", (whatsapp_number,)).fetchone()
    return row["id"] if row else -1


def get_unchecked(conn: sqlite3.Connection, limit: int = 10) -> list[sqlite3.Row]:
    """Leads que ainda não tiveram WhatsApp verificado (has_whatsapp IS NULL)."""
    return conn.execute("""
        SELECT * FROM leads
        WHERE has_whatsapp IS NULL AND skip = 0
        ORDER BY id
        LIMIT ?
    """, (limit,)).fetchall()


def set_has_whatsapp(conn: sqlite3.Connection, whatsapp_number: str, value: bool):
    conn.execute(
        "UPDATE leads SET has_whatsapp = ? WHERE whatsapp_number = ?",
        (1 if value else 0, whatsapp_number)
    )


def get_next_to_send(conn: sqlite3.Connection) -> sqlite3.Row | None:
    """Próximo lead com WhatsApp confirmado e não enviado."""
    return conn.execute("""
        SELECT * FROM leads
        WHERE has_whatsapp = 1
          AND sent_at IS NULL
          AND skip = 0
        ORDER BY id
        LIMIT 1
    """).fetchone()


def mark_sent(conn: sqlite3.Connection, lead_id: int, sent_at: str | None = None):
    ts = sent_at or datetime.datetime.now().isoformat(timespec="seconds")
    conn.execute("UPDATE leads SET sent_at = ? WHERE id = ?", (ts, lead_id))


def mark_skip(conn: sqlite3.Connection, whatsapp_number: str):
    """Marca lead para ser ignorado (ex: já enviado manualmente antes do banco existir)."""
    conn.execute("UPDATE leads SET skip = 1 WHERE whatsapp_number = ?", (whatsapp_number,))


def get_stats(conn: sqlite3.Connection) -> dict:
    total       = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
    has_wpp     = conn.execute("SELECT COUNT(*) FROM leads WHERE has_whatsapp = 1").fetchone()[0]
    no_wpp      = conn.execute("SELECT COUNT(*) FROM leads WHERE has_whatsapp = 0").fetchone()[0]
    not_checked = conn.execute("SELECT COUNT(*) FROM leads WHERE has_whatsapp IS NULL").fetchone()[0]
    sent        = conn.execute("SELECT COUNT(*) FROM leads WHERE sent_at IS NOT NULL").fetchone()[0]
    pending     = conn.execute(
        "SELECT COUNT(*) FROM leads WHERE has_whatsapp = 1 AND sent_at IS NULL AND skip = 0"
    ).fetchone()[0]
    recent_rows = conn.execute("""
        SELECT title, city, whatsapp_number, sent_at
        FROM leads WHERE sent_at IS NOT NULL
        ORDER BY sent_at DESC LIMIT 10
    """).fetchall()
    next_rows = conn.execute("""
        SELECT title, city, whatsapp_number
        FROM leads WHERE has_whatsapp = 1 AND sent_at IS NULL AND skip = 0
        ORDER BY id LIMIT 3
    """).fetchall()
    return {
        "total": total,
        "has_wpp": has_wpp,
        "no_wpp": no_wpp,
        "not_checked": not_checked,
        "sent_total": sent,
        "pending": pending,
        "recent_sends": [dict(r) for r in recent_rows],
        "next_leads": [dict(r) for r in next_rows],
        "pct_sent": round(sent / has_wpp * 100, 1) if has_wpp else 0,
    }
