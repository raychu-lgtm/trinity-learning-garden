// Saving for Trinity's Timetable.
//
// The timetable is one JSON bundle. It is kept in two places:
//   1. this device's localStorage (instant, works offline), and
//   2. the NAS, through PUT/GET /api/timetable on learn.raychufamily.com.
// The NAS checks a family PIN sent in the X-Family-Pin header. The PIN is
// typed once per device and remembered here; it is never in the source.

const LOCAL_KEY = "trinity-timetable-v1";
const PIN_KEY = "trinity-timetable-pin";
const API = "../../api/timetable"; // page lives at /my-day/timetable/

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked or full – the NAS copy still works */
  }
}

export function getPin() {
  return safeGet(PIN_KEY) || "";
}

export function setPin(pin) {
  safeSet(PIN_KEY, pin || null);
}

export function loadLocal() {
  try {
    const raw = safeGet(LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function saveLocal(data, pendingUpload) {
  safeSet(LOCAL_KEY, JSON.stringify({ ...data, pendingUpload: !!pendingUpload }));
}

export class PinError extends Error {}
export class LockedError extends Error {}

async function call(method, pin, body, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API, {
      method,
      cache: "no-store",
      headers: {
        "X-Family-Pin": pin,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (res.status === 401) throw new PinError("Wrong PIN");
    if (res.status === 429) throw new LockedError("Too many tries");
    if (!res.ok) throw new Error("Server said " + res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the saved timetable from the NAS, or null if nothing is saved yet. */
export async function fetchRemote(pin, timeoutMs) {
  const out = await call("GET", pin, null, timeoutMs);
  return out && out.data ? out.data : null;
}

/** Saves the timetable to the NAS. */
export async function putRemote(pin, data) {
  const { pendingUpload, ...clean } = data;
  return call("PUT", pin, clean);
}
