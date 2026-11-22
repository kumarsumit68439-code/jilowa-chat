"""
Jilowa Chat bot — Python (same workflow as python-telegram-bot / discord.py)
Host on VPS: systemd, screen, or Docker.
"""
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
API = (os.getenv("API_BASE") or "").rstrip("/")
CHAT_ID = os.getenv("CHAT_ID")

if not TOKEN or not API:
    raise SystemExit("Set BOT_TOKEN and API_BASE in .env")


def api(method: str, body: dict | None = None):
    url = f"{API}/api/bot/{TOKEN}/{method}"
    if body is None:
        r = requests.get(url, timeout=30)
    else:
        r = requests.post(url, json=body, timeout=30)
    data = r.json()
    if r.status_code >= 400 or data.get("ok") is False:
        raise RuntimeError(data.get("error") or r.text)
    return data.get("result", data)


def main():
    me = api("getMe")
    print("Bot online:", me.get("name"), "@" + str(me.get("username")))

    if CHAT_ID:
        api(
            "sendMessage",
            {"chat_id": CHAT_ID, "text": f"✅ Python bot host online as {me.get('name')}"},
        )
        print("Sent hello to", CHAT_ID)
    else:
        print("No CHAT_ID — set it to post into a channel.")

    while True:
        print("[heartbeat]", time.strftime("%Y-%m-%d %H:%M:%S"))
        time.sleep(60)


if __name__ == "__main__":
    main()
