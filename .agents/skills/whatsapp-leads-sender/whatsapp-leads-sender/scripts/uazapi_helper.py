#!/usr/bin/env python3
"""Utilitários HTTP para UazAPI — usado pelos outros scripts desta skill."""
import os
import json
import urllib.request
import ssl

def _load_env():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # scripts/ → whatsapp-leads-sender/ → skills/ → .agents/ → project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_dir))))
    env_file = os.path.join(project_root, ".env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())

_load_env()

def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def get_token():
    token = os.getenv("UAIZAPI_TOKEN")
    if not token:
        raise RuntimeError("UAIZAPI_TOKEN não configurado no .env")
    return token

def get_base_url():
    return os.getenv("UAIZAPI_BASE_URL", "https://kyrius.uazapi.com").rstrip("/")


def check_numbers(numbers: list[str]) -> dict[str, bool]:
    """
    Verifica quais números possuem WhatsApp.
    Retorna dict {numero: True/False}
    """
    token = get_token()
    base_url = get_base_url()
    url = f"{base_url}/chat/check"

    payload = {"numbers": numbers}
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": token,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=90) as resp:
        raw = json.loads(resp.read().decode())

    # A UazAPI pode retornar diferentes formatos — normaliza tudo
    result = {}

    # Formato 1: { "5511999": true, ... }
    if isinstance(raw, dict):
        for num, val in raw.items():
            if isinstance(val, bool):
                result[num] = val
            elif isinstance(val, dict):
                # Formato 2: { "5511999": { "exists": true, ... } }
                result[num] = bool(val.get("exists") or val.get("onWhatsapp") or val.get("registered"))
            else:
                result[num] = bool(val)

    # Formato 3: [ { "number": "5511999", "exists": true }, ... ]
    elif isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                # Suporta: "number", "phone", "query", ou extrai do "jid"
                num = (
                    item.get("number")
                    or item.get("phone")
                    or item.get("query")
                    or item.get("jid", "").split("@")[0]
                )
                # Suporta: "exists", "onWhatsapp", "registered", "isInWhatsapp"
                val = (
                    item.get("isInWhatsapp")
                    if item.get("isInWhatsapp") is not None
                    else (item.get("exists") or item.get("onWhatsapp") or item.get("registered"))
                )
                if num:
                    result[num] = bool(val)

    return result


def send_text(number: str, text: str) -> tuple[bool, dict]:
    """Envia mensagem de texto. Retorna (success, response_dict)."""
    token = get_token()
    base_url = get_base_url()
    url = f"{base_url}/send/text"

    payload = {"number": number, "text": text}
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": token,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=90) as resp:
            result = json.loads(resp.read().decode())
            return True, result
    except urllib.error.HTTPError as e:
        return False, {"error": f"HTTP {e.code}: {e.read().decode()}"}
    except Exception as e:
        return False, {"error": str(e)}
