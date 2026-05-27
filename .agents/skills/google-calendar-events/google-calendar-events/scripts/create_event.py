#!/usr/bin/env python3
"""
GueClaw - Create Google Calendar Event (Professional)
Creates an event in the professional calendar (contato@kyrius.info).

Usage:
  python3 create_event.py '<JSON>'

JSON fields:
  title        (required) - Event title
  start        (required) - ISO-8601 datetime, e.g. "2026-03-17T14:00:00"
  end          (required) - ISO-8601 datetime, e.g. "2026-03-17T15:00:00"
  description  (optional) - Event description
  location     (optional) - Event location

Example:
  python3 create_event.py '{"title":"Reuniao","start":"2026-03-17T14:00:00","end":"2026-03-17T15:00:00"}'
"""

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
TIMEZONE           = 'America/Sao_Paulo'


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


def create_event(title: str, start: str, end: str,
                 description: str = '', location: str = '') -> dict:
    access_token = get_access_token()

    body: dict = {
        'summary': title,
        'start': {'dateTime': start, 'timeZone': TIMEZONE},
        'end':   {'dateTime': end,   'timeZone': TIMEZONE},
    }
    if description:
        body['description'] = description
    if location:
        body['location'] = location

    calendar_encoded = urllib.parse.quote(WORK_CALENDAR_ID)
    url = f'https://www.googleapis.com/calendar/v3/calendars/{calendar_encoded}/events'

    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')

    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as exc:
        print(f'❌ JSON inválido: {exc}')
        sys.exit(1)

    required = ['title', 'start', 'end']
    missing = [f for f in required if not payload.get(f)]
    if missing:
        print(f'❌ Campos obrigatórios ausentes: {", ".join(missing)}')
        sys.exit(1)

    try:
        result = create_event(
            title=payload['title'],
            start=payload['start'],
            end=payload['end'],
            description=payload.get('description', ''),
            location=payload.get('location', ''),
        )
    except Exception as exc:
        print(f'❌ Erro ao criar evento: {exc}')
        sys.exit(1)

    print(f'✅ Evento criado com sucesso!')
    print(f'   Título:  {result.get("summary")}')
    print(f'   Início:  {result["start"].get("dateTime", result["start"].get("date"))}')
    print(f'   Fim:     {result["end"].get("dateTime", result["end"].get("date"))}')
    print(f'   ID:      {result.get("id")}')
    print(f'   🔗 Link: {result.get("htmlLink", "N/A")}')


if __name__ == '__main__':
    main()
