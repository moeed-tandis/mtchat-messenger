"""
MTchat ⇄ Rubika bridge worker.

This process owns the real Rubika account session (rubpy) and connects it to
the MTchat panel over plain HTTP. There is no third-party API in between:
the account logs in with phone + SMS code, receives every message, and sends
replies queued by the panel.

Run it anywhere with Python 3.10+ and internet access (VPS, home server, PC):

    pip install -r requirements.txt
    export MTCHAT_BASE_URL="https://<your-app>.lovable.app"
    export RUBIKA_BRIDGE_SECRET="<the same secret saved in the panel>"
    python bridge.py

Endpoints used (all same-origin on the panel):
    POST {BASE}/api/public/rubika/inbound   → deliver new messages
    GET  {BASE}/api/public/rubika/outbox    → pull outgoing messages + commands
    POST {BASE}/api/public/rubika/outbox    → heartbeat / status report
All three require the header:  x-bridge-secret: $RUBIKA_BRIDGE_SECRET
"""

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from rubpy import Client
from rubpy.types import Update

BASE_DIR = Path(__file__).resolve().parent
SESSION_NAME = str(BASE_DIR / "rubika_session")
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

BASE_URL = os.environ.get("MTCHAT_BASE_URL", "http://localhost:8080").rstrip("/")
SECRET = os.environ.get("RUBIKA_BRIDGE_SECRET", "")
HEADERS = {"x-bridge-secret": SECRET, "content-type": "application/json"}
POLL_SECONDS = float(os.environ.get("MTCHAT_POLL_SECONDS", "2"))

client: Optional[Client] = None
my_guid: Optional[str] = None
pending_phone: Optional[str] = None
http: Optional[httpx.AsyncClient] = None


# ------------------------------------------------------------------ helpers
def safe_get(obj: Any, *keys, default=None):
    for k in keys:
        try:
            if obj is None:
                return default
            obj = obj.get(k) if isinstance(obj, dict) else getattr(obj, k, None)
        except Exception:
            return default
    return obj if obj is not None else default


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_text(update: Any) -> str:
    for path in (("text",), ("message", "text")):
        value = safe_get(update, *path)
        if value:
            return str(value)
    if hasattr(update, "find_keys"):
        try:
            value = update.find_keys("text")
            if value:
                return str(value)
        except Exception:
            pass
    return ""


def extract_object_guid(update: Any) -> str:
    for path in (("object_guid",), ("group_guid",), ("channel_guid",), ("user_guid",)):
        value = safe_get(update, *path)
        if value:
            return str(value)
    return ""


def extract_message_id(update: Any) -> str:
    for path in (("message_id",), ("message", "message_id")):
        value = safe_get(update, *path)
        if value:
            return str(value)
    return ""


def extract_file_inline(update: Any):
    for path in (("file_inline",), ("message", "file_inline")):
        value = safe_get(update, *path)
        if value:
            return value
    return None


def detect_type(update: Any, file_inline=None) -> str:
    for attr, label in (
        ("photo", "Image"),
        ("video", "Video"),
        ("voice", "Voice"),
        ("music", "Music"),
        ("gif", "Gif"),
        ("sticker", "Sticker"),
        ("file", "File"),
    ):
        if getattr(update, attr, None):
            return label
    if file_inline is not None:
        return str(safe_get(file_inline, "type") or "File")
    return "Text"


# ------------------------------------------------------------------ panel I/O
async def report(state: str, error: Optional[str] = None, chats=None):
    status: dict[str, Any] = {"state": state, "error": error}
    if my_guid:
        status["guid"] = my_guid
    if pending_phone:
        status["phone"] = pending_phone
    payload: dict[str, Any] = {"status": status}
    if chats is not None:
        payload["chats"] = chats
    try:
        response = await http.post(f"{BASE_URL}/api/public/rubika/outbox", json=payload, headers=HEADERS)
        if response.status_code == 401:
            print("unauthorized — bridge secret does not match the panel")
        response.raise_for_status()
    except Exception as exc:  # network hiccup — keep running
        print(f"[report error] {exc}")


async def deliver(messages: list[dict]):
    if not messages:
        return
    try:
        response = await http.post(
            f"{BASE_URL}/api/public/rubika/inbound",
            json={"messages": messages},
            headers=HEADERS,
        )
        response.raise_for_status()
    except Exception as exc:
        print(f"[deliver error] {exc}")


# ------------------------------------------------------------------ incoming
async def handle_incoming_message(update: Update):
    try:
        file_inline = extract_file_inline(update)
        author = str(safe_get(update, "author_guid") or safe_get(update, "message", "author_object_guid") or "")
        is_me = bool(getattr(update, "is_me", False)) or (my_guid and author == str(my_guid))
        chat_guid = extract_object_guid(update)
        title = (
            safe_get(update, "object_title")
            or safe_get(update, "first_name")
            or safe_get(update, "title")
            or chat_guid
        )
        message = {
            "chatGuid": chat_guid,
            "chatTitle": str(title or chat_guid),
            "authorGuid": author,
            "messageId": extract_message_id(update),
            "type": detect_type(update, file_inline),
            "text": extract_text(update),
            "isMe": bool(is_me),
            "createdAt": now_iso(),
        }
        if file_inline is not None:
            name = safe_get(file_inline, "file_name") or safe_get(file_inline, "name") or "file"
            message["fileName"] = str(name)
            await download_file(file_inline, str(name))
        print(f"[in] {message['chatTitle']} :: {message['text'][:60]}")
        await deliver([message])
    except Exception as exc:
        print(f"[incoming error] {exc}")


async def download_file(file_inline, preferred_name: str) -> Optional[str]:
    if not client or file_inline is None:
        return None
    try:
        data = await client.download(file_inline)
        if not data:
            return None
        path = DOWNLOAD_DIR / preferred_name
        i = 1
        while path.exists():
            path = DOWNLOAD_DIR / f"{path.stem}_{i}{path.suffix}"
            i += 1
        path.write_bytes(data)
        return str(path)
    except Exception as exc:
        print(f"[download error] {exc}")
        return None


# ------------------------------------------------------------------ outgoing
async def send_text(chat_guid: str, text: str):
    if not client:
        raise RuntimeError("client not connected")
    result = await client.send_message(object_guid=chat_guid, text=text)
    print(f"[out] {chat_guid} :: {text[:60]}")
    return result


async def list_chats() -> list[dict]:
    if not client:
        return []
    result = await client.get_chats()
    raw = safe_get(result, "chats") or (result.get("chats") if isinstance(result, dict) else []) or []
    chats = []
    for chat in raw[:200]:
        guid = safe_get(chat, "object_guid") or safe_get(chat, "guid")
        if not guid:
            continue
        title = (
            safe_get(chat, "title")
            or safe_get(chat, "first_name")
            or safe_get(chat, "name")
            or guid
        )
        chats.append({"guid": str(guid), "title": str(title)})
    return chats


# ------------------------------------------------------------------ session
async def connect_and_login(phone: Optional[str] = None):
    """Starts rubpy. Reuses the stored session when it exists, otherwise
    performs a phone + SMS code login (values come from the panel)."""
    global client, my_guid
    await report("CONNECTING")

    client = Client(name=SESSION_NAME, phone_number=phone) if phone else Client(name=SESSION_NAME)

    @client.on_message_updates()
    async def _on_message(update: Update):
        await handle_incoming_message(update)

    await client.start()
    me = await client.get_me()
    my_guid = (
        safe_get(me, "user", "user_guid")
        or safe_get(me, "user_guid")
        or getattr(client, "guid", None)
    )
    print(f"connected | guid={my_guid}")
    await report("CONNECTED", chats=await list_chats())
    asyncio.create_task(client.get_updates())


async def handle_command(command: dict):
    global pending_phone
    ctype = command.get("type")
    value = command.get("value")
    print(f"[command] {ctype}")

    if ctype == "login":
        pending_phone = value
        try:
            await connect_and_login(value)
        except Exception as exc:
            # rubpy asks for the code interactively; the panel supplies it
            # through the `code` command, which restarts this flow.
            await report("AWAITING_CODE", error=str(exc))
    elif ctype in ("code", "password"):
        # rubpy reads the code from its own auth prompt; when the session is
        # already half-open, retrying start() with the stored phone finishes it.
        try:
            os.environ["RUBPY_AUTH_CODE"] = str(value or "")
            await connect_and_login(pending_phone)
        except Exception as exc:
            await report("ERROR", error=str(exc))
    elif ctype == "logout":
        try:
            if client:
                await client.disconnect()
        finally:
            await report("OFFLINE")
    elif ctype == "refresh_chats":
        await report("CONNECTED" if client else "OFFLINE", chats=await list_chats())


# ------------------------------------------------------------------ main loop
async def main():
    global http
    if not SECRET:
        raise SystemExit("RUBIKA_BRIDGE_SECRET is required")
    http = httpx.AsyncClient(timeout=20)

    session_exists = any(
        Path(p).exists() for p in (f"{SESSION_NAME}.session", f"{SESSION_NAME}.sqlite", SESSION_NAME)
    )
    if session_exists:
        try:
            await connect_and_login()
        except Exception as exc:
            await report("ERROR", error=str(exc))
    else:
        await report("AWAITING_PHONE")
        print("no session — waiting for the panel to send a phone number")

    print(f"bridge running against {BASE_URL}")
    while True:
        try:
            res = await http.get(f"{BASE_URL}/api/public/rubika/outbox", headers=HEADERS)
            if res.status_code == 200:
                work = res.json()
                for command in work.get("commands", []):
                    await handle_command(command)
                for job in work.get("messages", []):
                    try:
                        await send_text(job["chatGuid"], job["text"])
                    except Exception as exc:
                        print(f"[send error] {exc}")
            elif res.status_code == 401:
                print("unauthorized — check RUBIKA_BRIDGE_SECRET")
        except Exception as exc:
            print(f"[poll error] {exc}")
        await asyncio.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nbye")
