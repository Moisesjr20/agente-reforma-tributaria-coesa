#!/usr/bin/env python3
"""
GueClaw - Daily Calendar Digest
Fetches today's events from personal and professional Google Calendars
and sends a Telegram notification.

Usage:
  python3 fetch_daily.py              # Fetch and send to Telegram
  python3 fetch_daily.py --dry-run    # Print without sending (for tests)
"""

import html
import json
import os
import sys
import urllib.parse
import urllib.request
import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()  # loads /opt/gueclaw-agent/.env when cwd is the project root
except ImportError:
    pass  # env vars already set (e.g., running from cron with explicit env)


def _load_env():
    """Fallback: lê .env manualmente a partir da raiz do projeto."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # scripts/ -> google-calendar-daily/ -> skills/ -> .agents/ -> project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_dir))))
    env_file = os.path.join(project_root, '.env')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())


_load_env()

# São Paulo is always UTC-3 (Brazil abolished DST in 2019)
TZ = datetime.timezone(datetime.timedelta(hours=-3))

# ─── Configuration ───────────────────────────────────────────────────────────
PERSONAL_CLIENT_ID     = os.environ.get('GOOGLE_PERSONAL_CLIENT_ID', '')
PERSONAL_CLIENT_SECRET = os.environ.get('GOOGLE_PERSONAL_CLIENT_SECRET', '')
PERSONAL_REFRESH_TOKEN = os.environ.get('GOOGLE_PERSONAL_REFRESH_TOKEN', '')
PERSONAL_CALENDAR_ID   = os.environ.get(
    'GOOGLE_PERSONAL_CALENDAR_ID',
    '146f387bf76f79cf488344d20b92a8c21927c1c38db0b01bdab8402e86e1de20@group.calendar.google.com',
)

WORK_CLIENT_ID         = os.environ.get('GOOGLE_WORK_CLIENT_ID', '')
WORK_CLIENT_SECRET     = os.environ.get('GOOGLE_WORK_CLIENT_SECRET', '')
WORK_REFRESH_TOKEN     = os.environ.get('GOOGLE_WORK_REFRESH_TOKEN', '')
WORK_CALENDAR_ID       = os.environ.get('GOOGLE_WORK_CALENDAR_ID', 'contato@kyrius.info')

TELEGRAM_BOT_TOKEN     = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID       = os.environ.get('TELEGRAM_USER_CHAT_ID', '')

DAYS_PT   = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
             'Sexta-feira', 'Sábado', 'Domingo']
MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
             'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
    }).encode()
    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token', data=data, method='POST'
    )
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    if 'access_token' not in result:
        raise RuntimeError(f"Token refresh failed: {result.get('error_description', result)}")
    return result['access_token']


def get_today_events(access_token: str, calendar_id: str) -> list:
    now = datetime.datetime.now(tz=TZ)
    time_min = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    time_max = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
    params = urllib.parse.urlencode({
        'timeMin': time_min,
        'timeMax': time_max,
        'singleEvents': 'true',
        'orderBy': 'startTime',
        'maxResults': '25',
    })
    url = (
        f'https://www.googleapis.com/calendar/v3/calendars/'
        f'{urllib.parse.quote(calendar_id)}/events?{params}'
    )
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {access_token}')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read()).get('items', [])


def format_event(event: dict) -> str:
    summary = html.escape(event.get('summary', 'Sem título'))
    start = event.get('start', {})
    if 'dateTime' in start:
        dt = datetime.datetime.fromisoformat(start['dateTime']).astimezone(TZ)
        end_dt = datetime.datetime.fromisoformat(event['end']['dateTime']).astimezone(TZ)
        time_str = f'{dt.strftime("%H:%M")} → {end_dt.strftime("%H:%M")}'
    else:
        time_str = 'Dia inteiro'
    location = html.escape(event.get('location', ''))
    loc_part = f'\n    📍 {location}' if location else ''
    return f'  • {time_str} — {summary}{loc_part}'


def send_telegram(text: str) -> dict:
    data = json.dumps({
        'chat_id': TELEGRAM_CHAT_ID,
        'text': text,
        'parse_mode': 'HTML',
    }).encode()
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ─── Message builder ─────────────────────────────────────────────────────────

def build_message() -> str:
    now = datetime.datetime.now(tz=TZ)
    date_str = (
        f'{DAYS_PT[now.weekday()]}, {now.day} de '
        f'{MONTHS_PT[now.month - 1]} de {now.year}'
    )
    lines = [f'📅 <b>Agenda do dia — {date_str}</b>\n']

    # Personal calendar
    lines.append('👤 <b>Pessoal</b>')
    if PERSONAL_REFRESH_TOKEN and PERSONAL_CLIENT_ID:
        try:
            token = get_access_token(PERSONAL_CLIENT_ID, PERSONAL_CLIENT_SECRET, PERSONAL_REFRESH_TOKEN)
            events = get_today_events(token, PERSONAL_CALENDAR_ID)
            if events:
                for ev in events:
                    lines.append(format_event(ev))
            else:
                lines.append('  Nenhum evento hoje.')
        except Exception as exc:
            lines.append(f'  ⚠️ Erro ao carregar: {html.escape(str(exc))}')
    else:
        lines.append('  ⚠️ GOOGLE_PERSONAL_REFRESH_TOKEN não configurado.')

    lines.append('')

    # Work calendar
    lines.append('💼 <b>Profissional</b>')
    if WORK_REFRESH_TOKEN and WORK_CLIENT_ID:
        try:
            token = get_access_token(WORK_CLIENT_ID, WORK_CLIENT_SECRET, WORK_REFRESH_TOKEN)
            events = get_today_events(token, WORK_CALENDAR_ID)
            if events:
                for ev in events:
                    lines.append(format_event(ev))
            else:
                lines.append('  Nenhum evento hoje.')
        except Exception as exc:
            lines.append(f'  ⚠️ Erro ao carregar: {html.escape(str(exc))}')
    else:
        lines.append('  ⚠️ GOOGLE_WORK_REFRESH_TOKEN não configurado.')

    lines.append('\n🤖 <i>GueClaw — Notificação automática</i>')
    return '\n'.join(lines)


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    dry_run = '--dry-run' in sys.argv
    message = build_message()

    if dry_run:
        print('─── DRY RUN (não enviado ao Telegram) ───')
        print(message)
        return

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print('❌ TELEGRAM_BOT_TOKEN ou TELEGRAM_USER_CHAT_ID não configurados.')
        sys.exit(1)

    result = send_telegram(message)
    if result.get('ok'):
        print('✅ Mensagem enviada com sucesso ao Telegram.')
    else:
        print(f'❌ Falha no envio: {result}')
        sys.exit(1)


if __name__ == '__main__':
    main()
