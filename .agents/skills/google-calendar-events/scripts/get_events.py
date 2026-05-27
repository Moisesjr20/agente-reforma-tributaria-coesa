#!/usr/bin/env python3
"""
GueClaw - List Upcoming Events (Professional Calendar)
Lists events from contato@kyrius.info for the next N days.

Usage:
  python3 get_events.py [days]

Examples:
  python3 get_events.py        # next 7 days (default)
  python3 get_events.py 30     # next 30 days
  python3 get_events.py 1      # today only
"""

import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _load_env():
    """Fallback: lê .env manualmente a partir da raiz do projeto."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # scripts/ -> google-calendar-events/ -> skills/ -> .agents/ -> project root
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

WORK_CLIENT_ID     = os.environ.get('GOOGLE_WORK_CLIENT_ID', '')
WORK_CLIENT_SECRET = os.environ.get('GOOGLE_WORK_CLIENT_SECRET', '')
WORK_REFRESH_TOKEN = os.environ.get('GOOGLE_WORK_REFRESH_TOKEN', '')
WORK_CALENDAR_ID   = os.environ.get('GOOGLE_WORK_CALENDAR_ID', 'contato@kyrius.info')

# São Paulo: always UTC-3
TZ = datetime.timezone(datetime.timedelta(hours=-3))


def get_access_token() -> str:
    if not WORK_REFRESH_TOKEN:
        raise RuntimeError(
            'GOOGLE_WORK_REFRESH_TOKEN não configurado. '
            'Execute scripts/generate-google-token.py para gerar o token.'
        )
    data = urllib.parse.urlencode({
        'client_id': WORK_CLIENT_ID,
        'client_secret': WORK_CLIENT_SECRET,
        'refresh_token': WORK_REFRESH_TOKEN,
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


def get_events(days: int = 7) -> list:
    access_token = get_access_token()
    now = datetime.datetime.now(tz=TZ)
    time_min = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    time_max = (now + datetime.timedelta(days=days)).replace(
        hour=23, minute=59, second=59, microsecond=0
    ).isoformat()
    params = urllib.parse.urlencode({
        'timeMin': time_min,
        'timeMax': time_max,
        'singleEvents': 'true',
        'orderBy': 'startTime',
        'maxResults': '50',
    })
    calendar_encoded = urllib.parse.quote(WORK_CALENDAR_ID)
    url = (
        f'https://www.googleapis.com/calendar/v3/calendars/'
        f'{calendar_encoded}/events?{params}'
    )
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {access_token}')
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read()).get('items', [])


def format_event(event: dict) -> str:
    summary = event.get('summary', 'Sem título')
    start = event.get('start', {})
    if 'dateTime' in start:
        dt = datetime.datetime.fromisoformat(start['dateTime']).astimezone(TZ)
        end_dt = datetime.datetime.fromisoformat(event['end']['dateTime']).astimezone(TZ)
        date_str = dt.strftime('%d/%m')
        time_str = f'{dt.strftime("%H:%M")} → {end_dt.strftime("%H:%M")}'
        line = f'📅 {date_str}  {time_str}  —  {summary}'
    else:
        dt = datetime.date.fromisoformat(start['date'])
        line = f'📅 {dt.strftime("%d/%m")}  Dia inteiro  —  {summary}'
    location = event.get('location', '')
    if location:
        line += f'\n   📍 {location}'
    return line


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7

    try:
        events = get_events(days)
    except Exception as exc:
        print(f'❌ Erro ao buscar eventos: {exc}')
        sys.exit(1)

    label = 'próximos dias' if days > 1 else 'hoje'
    print(f'📋 Agenda Profissional — {label} ({days} dia(s)):')
    print(f'   Calendário: {WORK_CALENDAR_ID}\n')

    if not events:
        print('Nenhum evento encontrado.')
    else:
        for ev in events:
            print(format_event(ev))
        print(f'\nTotal: {len(events)} evento(s)')


if __name__ == '__main__':
    main()
