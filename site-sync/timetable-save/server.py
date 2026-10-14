#!/usr/bin/env python3
"""timetable-save — keeps Trinity's Timetable on the NAS.

Runs next to Caddy in the trinity-web compose project (no published port).
Caddy forwards GET/PUT /api/timetable here.

  GET  /api/timetable  -> {"data": <saved bundle or null>}
  PUT  /api/timetable  -> saves the JSON bundle in the body
  GET  /healthz        -> {"ok": true, ...}

Every API call needs the header X-Family-Pin matching the FAMILY_PIN
environment variable (pasted by Ray in the NAS compose only).
After 10 wrong PINs in 10 minutes every PIN is refused (429) for 10 minutes.

Files (DATA_DIR, default /data):
  timetable.json            current copy
  history/<time>.json       the last KEEP_HISTORY saved copies, for recovery

Python standard library only. Reference copy lives in the repo at
site-sync/timetable-save/server.py; the NAS copy is
/volume2/appdata/home-platform/trinity/timetable-save/server.py.
"""

import hmac
import json
import os
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATA_DIR = os.environ.get("DATA_DIR", "/data")
PIN = os.environ.get("FAMILY_PIN", "").strip()
PORT = int(os.environ.get("PORT", "8080"))
MAX_BODY = 1024 * 1024  # 1 MB (Caddy caps at the same size)
KEEP_HISTORY = 50
FAIL_LIMIT = 10
FAIL_WINDOW = 600  # seconds
LOCK_TIME = 600  # seconds

CURRENT = os.path.join(DATA_DIR, "timetable.json")
HISTORY = os.path.join(DATA_DIR, "history")
LIST_KEYS = ("templates", "placed", "skips")

_lock = threading.Lock()
_fails = []
_locked_until = 0.0


def log(msg):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)


def pin_check(given):
    """Returns 'ok', 'bad' or 'locked'."""
    global _locked_until
    now = time.time()
    with _lock:
        if now < _locked_until:
            return "locked"
        if given and hmac.compare_digest(given.encode(), PIN.encode()):
            return "ok"
        _fails[:] = [t for t in _fails if now - t < FAIL_WINDOW]
        _fails.append(now)
        if len(_fails) >= FAIL_LIMIT:
            _locked_until = now + LOCK_TIME
            _fails.clear()
            log("too many wrong PINs - locked for %d s" % LOCK_TIME)
            return "locked"
        return "bad"


def valid_bundle(data):
    if not isinstance(data, dict):
        return False
    for key in LIST_KEYS:
        if key in data and not isinstance(data[key], list):
            return False
    for key in ("themeId", "calendarName"):
        if key in data and not isinstance(data[key], str):
            return False
    photo = data.get("photo")
    if photo is not None and not (isinstance(photo, str) and photo.startswith("data:image/")):
        return False
    if "updatedAt" in data and not isinstance(data["updatedAt"], (int, float)):
        return False
    return True


def write_atomic(path, raw):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".tmp-")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(raw)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def save(raw):
    with _lock:
        os.makedirs(HISTORY, exist_ok=True)
        write_atomic(CURRENT, raw)
        stamp = time.strftime("%Y%m%dT%H%M%S") + "-%03d" % (int(time.time() * 1000) % 1000)
        write_atomic(os.path.join(HISTORY, stamp + ".json"), raw)
        old = sorted(n for n in os.listdir(HISTORY) if n.endswith(".json"))
        for name in old[:-KEEP_HISTORY]:
            try:
                os.unlink(os.path.join(HISTORY, name))
            except OSError:
                pass


def load():
    try:
        with open(CURRENT, "rb") as f:
            return json.loads(f.read())
    except FileNotFoundError:
        return None


class Handler(BaseHTTPRequestHandler):
    server_version = "timetable-save"
    sys_version = ""

    def log_message(self, fmt, *args):  # quieter, no client details
        pass

    def send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def auth(self):
        if not PIN:
            self.send_json(503, {"error": "FAMILY_PIN is not set"})
            return False
        result = pin_check(self.headers.get("X-Family-Pin", "").strip())
        if result == "ok":
            return True
        if result == "locked":
            self.send_json(429, {"error": "too many tries"})
        else:
            self.send_json(401, {"error": "wrong PIN"})
        return False

    def do_GET(self):
        if self.path == "/healthz":
            self.send_json(200, {"ok": True, "pin_set": bool(PIN), "writable": os.access(DATA_DIR, os.W_OK)})
            return
        if self.path != "/api/timetable":
            self.send_json(404, {"error": "not found"})
            return
        if not self.auth():
            return
        try:
            self.send_json(200, {"data": load()})
        except Exception as e:  # unreadable file
            log("load failed: %r" % e)
            self.send_json(500, {"error": "could not read"})

    def do_PUT(self):
        if self.path != "/api/timetable":
            self.send_json(404, {"error": "not found"})
            return
        if not self.auth():
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        if length <= 0 or length > MAX_BODY:
            self.send_json(413, {"error": "body missing or too big"})
            return
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except ValueError:
            self.send_json(400, {"error": "not JSON"})
            return
        if not valid_bundle(data):
            self.send_json(400, {"error": "not a timetable"})
            return
        try:
            save(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode())
        except Exception as e:
            log("save failed: %r" % e)
            self.send_json(500, {"error": "could not save"})
            return
        self.send_json(200, {"ok": True, "updatedAt": data.get("updatedAt")})

    def do_POST(self):
        self.send_json(405, {"error": "use GET or PUT"})

    do_DELETE = do_PATCH = do_POST


def main():
    try:
        os.makedirs(HISTORY, exist_ok=True)
    except OSError as e:
        log("WARNING: could not create %s: %r" % (HISTORY, e))
    log("timetable-save on :%d, data in %s, PIN %s" % (PORT, DATA_DIR, "set" if PIN else "NOT SET"))
    if not os.access(DATA_DIR, os.W_OK):
        log("WARNING: %s is not writable" % DATA_DIR)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
