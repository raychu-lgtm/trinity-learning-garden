import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getPin,
  setPin,
  loadLocal,
  saveLocal,
  fetchRemote,
  putRemote,
  PinError,
  LockedError,
} from "./storage";

/* ---------- constants ---------- */

const COLORS = [
  { name: "Coral", bg: "#FF6B6B", edge: "#D6473F", ink: "#5B1E1B" },
  { name: "Sunshine", bg: "#FFD93D", edge: "#E3AE0E", ink: "#5C4600" },
  { name: "Sky", bg: "#4ECDC4", edge: "#219E93", ink: "#0B4B45" },
  { name: "Mint", bg: "#8CE99A", edge: "#4CAE58", ink: "#1E4E24" },
  { name: "Lavender", bg: "#C9A7EB", edge: "#9B6FCB", ink: "#3D2159" },
  { name: "Bubblegum", bg: "#FF9FE5", edge: "#E058B8", ink: "#5C1245" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 7;
const END_HOUR = 24;
const SLOT_MIN = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const SLOT_HEIGHT = 16;
const DURATIONS = [
  { label: "15 min", slots: 1 },
  { label: "30 min", slots: 2 },
  { label: "45 min", slots: 3 },
  { label: "1 hour", slots: 4 },
  { label: "1.5 hours", slots: 6 },
  { label: "2 hours", slots: 8 },
  { label: "3 hours", slots: 12 },
];

const STARTER_TEMPLATES = [
  { id: "t1", title: "School", description: "Learning time!", color: 2, durationSlots: 12 },
  { id: "t2", title: "Homework", description: "Books out, brain on.", color: 1, durationSlots: 4 },
  { id: "t3", title: "Play Time", description: "Go have fun!", color: 3, durationSlots: 4 },
  { id: "t4", title: "Piano Practice", description: "Fingers ready, music on.", color: 4, durationSlots: 2 },
  { id: "t5", title: "Bedtime", description: "Brush teeth, read a story.", color: 5, durationSlots: 2 },
];

const THEMES = [
  {
    id: "sunshine",
    name: "Sunshine",
    emoji: "☀️",
    bg: "#FBF6EC",
    dot: "#E4D9C2",
    accent: "#FF8C42",
    accentDark: "#C6642A",
    accentText: "#FF6B4A",
    panelBorder: "#EFE3CC",
    trayBorder: "#C9AE83",
    trayBg1: "#E9DCC3",
    trayBg2: "#E3D4B7",
    accentSoft: "#FFEFE2",
    hoverBg: "rgba(255,140,66,0.18)",
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
    emoji: "🎀",
    bg: "#FDF1F8",
    dot: "#F2D6E8",
    accent: "#E0559B",
    accentDark: "#B03D79",
    accentText: "#D6488F",
    panelBorder: "#F3DDE9",
    trayBorder: "#E3B8D2",
    trayBg1: "#F6DCEB",
    trayBg2: "#F0CBE1",
    accentSoft: "#FCE4F1",
    hoverBg: "rgba(224,85,155,0.18)",
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    bg: "#EFF7F7",
    dot: "#CFE7E6",
    accent: "#2FA6A0",
    accentDark: "#1F7C77",
    accentText: "#1F8F87",
    panelBorder: "#D9EEEC",
    trayBorder: "#9ED0CD",
    trayBg1: "#D3ECEA",
    trayBg2: "#C1E1DE",
    accentSoft: "#DFF3F1",
    hoverBg: "rgba(47,166,160,0.18)",
  },
  {
    id: "jungle",
    name: "Jungle",
    emoji: "🌿",
    bg: "#F3F8EE",
    dot: "#D8E8C7",
    accent: "#5FA83A",
    accentDark: "#437A2A",
    accentText: "#4C8A2E",
    panelBorder: "#E1EED2",
    trayBorder: "#B7D89C",
    trayBg1: "#E2EFD3",
    trayBg2: "#D4E6BE",
    accentSoft: "#E7F3DB",
    hoverBg: "rgba(95,168,58,0.18)",
  },
];

const QUICK_EMOJIS = [
  "⭐", "☀️", "🌙", "🎨", "⚽", "📚", "🎹", "🛁", "🍎", "🚗",
  "🎮", "🐶", "🎉", "📖", "✏️", "🧸", "🎵", "🦄", "🌈", "🍕",
  "😴", "🚿", "🏃", "🧩", "🎧", "🚲", "🐱", "🍔", "🧁", "🎈",
];

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function resizeImageToDataURL(file, size = 260) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function timeLabel(slotIndex) {
  const totalMin = START_HOUR * 60 + slotIndex * SLOT_MIN;
  let h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
}

function mondayIndex(jsDay) {
  // jsDay: 0=Sun..6=Sat -> 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - mondayIndex(d.getDay()));
  return d;
}

function getWeekDates(weekOffset) {
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISODate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(d) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric" });
}

function weekRangeLabel(weekDates) {
  const start = weekDates[0];
  const end = weekDates[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

/* ---------- main component ---------- */

function TrinitysTimetable({ pin, onPinRejected }) {
  const [templates, setTemplates] = useState([]);
  const [placed, setPlaced] = useState([]);
  const [skips, setSkips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("week");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [drag, setDrag] = useState(null); // active pointer drag
  const [editingTemplate, setEditingTemplate] = useState(null); // {..., isNew}
  const [editingPlaced, setEditingPlaced] = useState(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);

  const [themeId, setThemeId] = useState("sunshine");
  const [calendarName, setCalendarName] = useState("Trinity's Timetable");
  const [editingName, setEditingName] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [resizing, setResizing] = useState(null);
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  const trayRef = useRef(null);

  /* ----- load / save (this device + the NAS) ----- */
  // syncState: "loading" | "saved" | "saving" | "offline"
  const [syncState, setSyncState] = useState("loading");
  const lastContent = useRef(null); // JSON of the content last loaded/saved
  const latest = useRef(null); // newest bundle waiting to go to the NAS
  const uploading = useRef(false);

  function applyData(data) {
    setTemplates(data && data.templates && data.templates.length ? data.templates : STARTER_TEMPLATES);
    setPlaced((data && data.placed) || []);
    setSkips((data && data.skips) || []);
    if (data && data.themeId) setThemeId(data.themeId);
    if (data && data.calendarName) setCalendarName(data.calendarName);
    setPhoto((data && data.photo) || null);
  }

  const upload = useCallback(async () => {
    if (uploading.current || !latest.current) return;
    uploading.current = true;
    const bundle = latest.current;
    setSyncState("saving");
    try {
      await putRemote(pin, bundle);
      if (latest.current === bundle) {
        latest.current = null;
        saveLocal(bundle, false);
        setSyncState("saved");
      }
    } catch (e) {
      if (e instanceof PinError) {
        onPinRejected();
      } else {
        setSyncState("offline");
      }
    } finally {
      uploading.current = false;
    }
    // Something changed while we were uploading → send that too.
    if (latest.current && latest.current !== bundle) upload();
  }, [pin, onPinRejected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadLocal();
      let chosen = local;
      let pushLocal = false;
      try {
        const remote = await fetchRemote(pin, 6000);
        if (cancelled) return;
        if (remote && (!local || (remote.updatedAt || 0) >= (local.updatedAt || 0))) {
          chosen = remote;
        } else if (local && local.pendingUpload) {
          pushLocal = true; // made offline, newer than the NAS copy
        }
        setSyncState("saved");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof PinError) {
          onPinRejected();
          return;
        }
        setSyncState("offline");
        pushLocal = !!(local && local.pendingUpload);
      }
      applyData(chosen);
      if (chosen) {
        const { updatedAt, pendingUpload, ...content } = chosen;
        lastContent.current = JSON.stringify(content);
        saveLocal(chosen, pushLocal);
        if (pushLocal) {
          latest.current = { ...content, updatedAt };
        }
      }
      setLoaded(true);
      if (pushLocal) upload();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    if (!loaded) return;
    const content = JSON.parse(JSON.stringify({ templates, placed, skips, themeId, calendarName, photo }));
    const json = JSON.stringify(content);
    if (json === lastContent.current) return; // nothing really changed
    lastContent.current = json;
    const bundle = { ...content, updatedAt: Date.now() };
    saveLocal(bundle, true);
    latest.current = bundle;
    const t = setTimeout(upload, 800);
    return () => clearTimeout(t);
  }, [templates, placed, skips, loaded, themeId, calendarName, photo, upload]);

  // Retry when the device comes back online, and every 30 s while offline.
  useEffect(() => {
    if (syncState !== "offline") return;
    const retry = () => upload();
    window.addEventListener("online", retry);
    const t = setInterval(retry, 30000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(t);
    };
  }, [syncState, upload]);

  /* ----- drag lifecycle ----- */

  const startDrag = useCallback((e, payload) => {
    e.preventDefault();
    setDrag({
      ...payload,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      hover: null,
      overTray: false,
    });
  }, []);

  useEffect(() => {
    if (!drag) return;

    function onMove(e) {
      const x = e.clientX;
      const y = e.clientY;
      setDrag((d) => {
        if (!d) return d;
        const dist = Math.hypot(x - d.startX, y - d.startY);
        const moved = d.moved || dist > 6;
        let hover = null;
        let overTray = false;
        const el = document.elementFromPoint(x, y);
        if (el) {
          const col = el.closest("[data-day-col]");
          if (col) {
            const rect = col.getBoundingClientRect();
            const day = parseInt(col.dataset.dayCol, 10);
            const rawSlot = Math.floor((y - rect.top) / SLOT_HEIGHT);
            hover = { day, slot: Math.max(0, Math.min(rawSlot, TOTAL_SLOTS - 1)) };
          }
          overTray = !!el.closest("[data-tray-zone]");
        }
        return { ...d, x, y, moved, hover, overTray };
      });
    }

    function onUp() {
      setDrag((d) => {
        if (!d) return null;
        if (!d.moved) {
          // treat as a tap -> open editor
          if (d.kind === "template") openTemplateEditor(d.template, false);
          else if (d.kind === "placed") setEditingPlaced({ ...d.block, _viewDate: d.viewDate });
        } else if (d.hover) {
          commitDrop(d, d.hover.day, d.hover.slot);
        } else if (d.kind === "placed" && d.overTray) {
          removeOrSkipDrag(d.block);
        }
        return null;
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  /* ----- resize (top/bottom handles) lifecycle ----- */

  const startResize = useCallback((e, block, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      blockId: block.id,
      edge,
      startY: e.clientY,
      origStartSlot: block.startSlot,
      origDuration: block.durationSlots,
      previewStartSlot: block.startSlot,
      previewDuration: block.durationSlots,
    });
  }, []);

  useEffect(() => {
    if (!resizing) return;

    function onMove(e) {
      setResizing((r) => {
        if (!r) return r;
        const deltaSlots = Math.round((e.clientY - r.startY) / SLOT_HEIGHT);
        if (r.edge === "start") {
          let newStart = r.origStartSlot + deltaSlots;
          newStart = Math.max(0, Math.min(newStart, r.origStartSlot + r.origDuration - 1));
          const newDuration = r.origStartSlot + r.origDuration - newStart;
          return { ...r, previewStartSlot: newStart, previewDuration: newDuration };
        }
        let newDuration = r.origDuration + deltaSlots;
        newDuration = Math.max(1, Math.min(newDuration, TOTAL_SLOTS - r.origStartSlot));
        return { ...r, previewDuration: newDuration };
      });
    }

    function onUp() {
      setResizing((r) => {
        if (r) {
          setPlaced((list) =>
            list.map((b) =>
              b.id === r.blockId ? { ...b, startSlot: r.previewStartSlot, durationSlots: r.previewDuration } : b
            )
          );
        }
        return null;
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizing]);

  function commitDrop(d, day, slot) {
    const duration = d.kind === "template" ? d.template.durationSlots : d.block.durationSlots;
    const start = Math.max(0, Math.min(slot, TOTAL_SLOTS - duration));
    const dateStr = toISODate(weekDates[day]);
    const isHomeWeek = weekOffset === 0;

    if (d.kind === "template") {
      const t = d.template;
      setPlaced((p) => [
        ...p,
        {
          id: genId("p"),
          templateId: t.id,
          day,
          startSlot: start,
          durationSlots: t.durationSlots,
          title: t.title,
          description: t.description,
          color: t.color,
          date: isHomeWeek ? null : dateStr,
        },
      ]);
      return;
    }

    const block = d.block;
    if (block.date) {
      // already a one-time event: just move it, re-anchored to the new day in this same week
      setPlaced((p) => p.map((b) => (b.id === block.id ? { ...b, day, startSlot: start, date: dateStr } : b)));
    } else if (isHomeWeek) {
      // editing the master recurring pattern directly
      setPlaced((p) => p.map((b) => (b.id === block.id ? { ...b, day, startSlot: start } : b)));
    } else {
      // recurring block moved while viewing another week: skip the original occurrence
      // just for that date, and create a one-time replacement at the new spot
      const originalDateStr = toISODate(weekDates[block.day]);
      setSkips((s) => [...s, { id: genId("s"), blockId: block.id, date: originalDateStr }]);
      setPlaced((p) => [
        ...p,
        {
          id: genId("p"),
          templateId: block.templateId,
          day,
          startSlot: start,
          durationSlots: block.durationSlots,
          title: block.title,
          description: block.description,
          color: block.color,
          date: dateStr,
        },
      ]);
    }
  }

  function removeOrSkipDrag(block) {
    if (block.date || weekOffset === 0) {
      // one-time event, or editing the master pattern directly: remove for good
      setPlaced((p) => p.filter((b) => b.id !== block.id));
      setSkips((list) => list.filter((s) => s.blockId !== block.id));
    } else {
      // recurring block, viewed on another week: skip just this one occurrence
      const dateStr = toISODate(weekDates[block.day]);
      setSkips((s) => [...s, { id: genId("s"), blockId: block.id, date: dateStr }]);
    }
  }

  function openTemplateEditor(template, isNew) {
    setEditingTemplate({ ...template, isNew });
  }

  function saveTemplate(t) {
    const prevTemplate = templates.find((x) => x.id === t.id);
    const prevDays = new Set(prevTemplate?.repeatDays || []);
    const nextDays = new Set(t.repeatDays || []);
    const clampedStart = Math.max(0, Math.min(t.startSlot ?? 0, TOTAL_SLOTS - t.durationSlots));

    setTemplates((list) => {
      const exists = list.some((x) => x.id === t.id);
      if (exists) return list.map((x) => (x.id === t.id ? t : x));
      return [...list, t];
    });

    if (prevDays.size || nextDays.size) {
      setPlaced((list) => {
        let next = list;
        for (const d of prevDays) {
          if (!nextDays.has(d)) {
            next = next.filter((b) => !(b.templateId === t.id && b.day === d && !b.date));
          }
        }
        for (const d of nextDays) {
          const idx = next.findIndex((b) => b.templateId === t.id && b.day === d && !b.date);
          const fields = {
            templateId: t.id,
            day: d,
            startSlot: clampedStart,
            durationSlots: t.durationSlots,
            title: t.title,
            description: t.description,
            color: t.color,
            date: null,
          };
          next = idx >= 0
            ? next.map((b, i) => (i === idx ? { ...b, ...fields } : b))
            : [...next, { id: genId("p"), ...fields }];
        }
        return next;
      });
    }

    setEditingTemplate(null);
  }

  function deleteTemplate(id) {
    setTemplates((list) => list.filter((t) => t.id !== id));
    setPendingDeleteTemplate(null);
    setEditingTemplate(null);
  }

  function savePlaced(b) {
    const { _viewDate, repeatDays, ...clean } = b;
    setPlaced((list) => {
      let next = list.map((x) => (x.id === clean.id ? { ...x, ...clean } : x));
      if (!clean.date && repeatDays) {
        const groupDays = new Set(
          list.filter((x) => x.templateId === clean.templateId && !x.date).map((x) => x.day)
        );
        const nextDays = new Set(repeatDays);
        for (const d of groupDays) {
          if (!nextDays.has(d)) {
            next = next.filter((x) => !(x.templateId === clean.templateId && x.day === d && !x.date));
          }
        }
        for (const d of nextDays) {
          if (!groupDays.has(d)) {
            next = [
              ...next,
              {
                id: genId("p"),
                templateId: clean.templateId,
                day: d,
                startSlot: clean.startSlot,
                durationSlots: clean.durationSlots,
                title: clean.title,
                description: clean.description,
                color: clean.color,
                date: null,
              },
            ];
          }
        }
      }
      return next;
    });
    setEditingPlaced(null);
  }

  function skipRecurringForDate(blockId, dateStr) {
    setSkips((list) => [...list, { id: genId("s"), blockId, date: dateStr }]);
    setEditingPlaced(null);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file);
      setPhoto(dataUrl);
    } catch (err) {
      console.error("Could not process photo", err);
    }
  }

  function removePlacedBlock(id) {
    setPlaced((list) => list.filter((b) => b.id !== id));
    setSkips((list) => list.filter((s) => s.blockId !== id));
    setEditingPlaced(null);
  }

  const dragGhost = drag && drag.moved ? (drag.kind === "template" ? drag.template : drag.block) : null;

  return (
    <div className="app-root" style={themeVars(theme)}>
      <GlobalStyle />
      <div className="no-print">
      <header className="app-header">
        <div className="header-left">
          <a className="home-link" href="../../" title="Back to the Learning Garden" aria-label="Back to the Learning Garden">
            🏡
          </a>
          <PhotoFrame photo={photo} onPick={handlePhotoChange} onRemove={() => setPhoto(null)} />
          <div className="title-wrap">
            <span className="pin">📌</span>
            {editingName ? (
              <input
                className="name-input"
                value={calendarName}
                autoFocus
                maxLength={40}
                onChange={(e) => setCalendarName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingName(false);
                }}
              />
            ) : (
              <h1 onClick={() => setEditingName(true)} title="Tap to rename">
                {calendarName}
              </h1>
            )}
          </div>
        </div>
        <div className="header-right">
          <button className="theme-btn" onClick={() => setShowThemePicker(true)}>
            {theme.emoji} <span>Theme</span>
          </button>
          <button className="print-btn" onClick={() => window.print()} title="Print or save as PDF">
            🖨️ <span>Print</span>
          </button>
          <div className="view-tabs">
            <button className={view === "week" ? "tab active" : "tab"} onClick={() => setView("week")}>
              Week
            </button>
            <button className={view === "month" ? "tab active" : "tab"} onClick={() => setView("month")}>
              Month
            </button>
          </div>
          <span className={"sync-pill sync-" + syncState} title="Where your timetable is saved">
            {syncState === "loading"
              ? "Loading…"
              : syncState === "saving"
              ? "Saving…"
              : syncState === "saved"
              ? "✓ Saved"
              : "Offline – saved on this iPad"}
          </span>
        </div>
      </header>

      <div className="tray-wrap" data-tray-zone ref={trayRef}>
        <div className="tray-head">
          <span>Your Blocks</span>
          <button
            className="new-block-btn"
            onClick={() =>
              openTemplateEditor(
                { id: genId("t"), title: "", description: "", color: 0, durationSlots: 2 },
                true
              )
            }
          >
            + New Block
          </button>
        </div>
        <div className="tray-scroll">
          {templates.length === 0 && <div className="tray-empty">Make your first block!</div>}
          {templates.map((t) => (
            <div
              key={t.id}
              className="sticky template-sticky"
              style={stickyStyle(t.color)}
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                startDrag(e, {
                  kind: "template",
                  template: t,
                  grabX: e.clientX - rect.left,
                  grabY: e.clientY - rect.top,
                  w: rect.width,
                });
              }}
            >
              <div className="sticky-title">{t.title || "Untitled"}</div>
              <div className="sticky-desc">{t.description}</div>
              <div className="sticky-duration">{durationLabel(t.durationSlots)}</div>
            </div>
          ))}
        </div>
        {drag && drag.overTray && drag.kind === "placed" && (
          <div className="tray-drop-hint">Drop here to remove from calendar</div>
        )}
      </div>

      {view === "week" ? (
        <WeekView
          placed={placed}
          skips={skips}
          weekDates={weekDates}
          weekOffset={weekOffset}
          onPrevWeek={() => setWeekOffset((o) => o - 1)}
          onNextWeek={() => setWeekOffset((o) => o + 1)}
          onToday={() => setWeekOffset(0)}
          onStartDrag={startDrag}
          dragBlockId={drag && drag.moved && drag.kind === "placed" ? drag.block.id : null}
          hover={drag && drag.moved ? drag.hover : null}
          resizing={resizing}
          onStartResize={startResize}
        />
      ) : (
        <MonthView
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          placed={placed}
          skips={skips}
          onPickDay={(date) => {
            const offset = Math.round((startOfWeek(date) - startOfWeek(new Date())) / (7 * 86400000));
            setWeekOffset(offset);
            setView("week");
          }}
        />
      )}

      {dragGhost && (
        <div
          className="sticky ghost"
          style={{
            ...stickyStyle(dragGhost.color),
            left: drag.x - drag.grabX,
            top: drag.y - drag.grabY,
            width: drag.w,
          }}
        >
          <div className="sticky-title">{dragGhost.title || "Untitled"}</div>
          <div className="sticky-desc">{dragGhost.description}</div>
        </div>
      )}

      {showThemePicker && (
        <ThemePicker
          themes={THEMES}
          current={themeId}
          onPick={(id) => {
            setThemeId(id);
            setShowThemePicker(false);
          }}
          onClose={() => setShowThemePicker(false)}
        />
      )}

      {editingTemplate && (
        <TemplateModal
          template={editingTemplate}
          onCancel={() => setEditingTemplate(null)}
          onSave={saveTemplate}
          onRequestDelete={(id) => setPendingDeleteTemplate(id)}
          pendingDelete={pendingDeleteTemplate === editingTemplate.id}
          onConfirmDelete={deleteTemplate}
        />
      )}

      {editingPlaced && (
        <PlacedModal
          block={editingPlaced}
          placed={placed}
          onCancel={() => setEditingPlaced(null)}
          onSave={savePlaced}
          onRemove={removePlacedBlock}
          onSkip={skipRecurringForDate}
        />
      )}
      </div>

      <PrintSchedule calendarName={calendarName} weekDates={weekDates} placed={placed} skips={skips} />
    </div>
  );
}

/* ---------- helpers for drag grab offset ---------- */
// we patch startDrag calls to include grabX/grabY via wrapper below

function durationLabel(slots) {
  const found = DURATIONS.find((d) => d.slots === slots);
  return found ? found.label : `${(slots * SLOT_MIN) / 60}h`;
}

function stickyStyle(colorIdx) {
  const c = COLORS[colorIdx] || COLORS[0];
  return {
    background: c.bg,
    borderColor: c.edge,
    color: c.ink,
  };
}

function themeVars(theme) {
  return {
    "--bg": theme.bg,
    "--dot": theme.dot,
    "--accent": theme.accent,
    "--accent-dark": theme.accentDark,
    "--accent-text": theme.accentText,
    "--panel-border": theme.panelBorder,
    "--tray-border": theme.trayBorder,
    "--tray-bg1": theme.trayBg1,
    "--tray-bg2": theme.trayBg2,
    "--accent-soft": theme.accentSoft,
    "--hover-bg": theme.hoverBg,
  };
}

function PhotoFrame({ photo, onPick, onRemove }) {
  return (
    <label className="photo-frame" htmlFor="calendar-photo-input">
      {photo ? (
        <>
          <img src={photo} alt="Calendar" />
          <button
            type="button"
            className="photo-remove"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove photo"
          >
            ×
          </button>
        </>
      ) : (
        <span className="photo-placeholder">📷</span>
      )}
      <input id="calendar-photo-input" type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </label>
  );
}

function ThemePicker({ themes, current, onPick, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Pick a Theme</h2>
        <div className="theme-grid">
          {themes.map((t) => (
            <button
              key={t.id}
              className={"theme-swatch" + (t.id === current ? " selected" : "")}
              style={{ background: t.bg, borderColor: t.accent }}
              onClick={() => onPick(t.id)}
            >
              <span className="theme-swatch-emoji">{t.emoji}</span>
              <span className="theme-swatch-name" style={{ color: t.accentText }}>
                {t.name}
              </span>
              <span className="theme-swatch-dot" style={{ background: t.accent }} />
            </button>
          ))}
        </div>
        <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
          <button className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EmojiPicker({ onPick }) {
  return (
    <div className="emoji-popover">
      {QUICK_EMOJIS.map((e) => (
        <button type="button" key={e} className="emoji-btn" onClick={() => onPick(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

/* ---------- Week View ---------- */

function WeekView({
  placed,
  skips,
  weekDates,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onToday,
  onStartDrag,
  dragBlockId,
  hover,
  resizing,
  onStartResize,
}) {
  const hours = [];
  for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);
  const todayISO = toISODate(new Date());

  return (
    <div className="week-panel">
      <div className="week-nav-bar">
        <button className="week-nav-btn" onClick={onPrevWeek} aria-label="Previous week">
          ‹
        </button>
        <div className="week-range-label">{weekRangeLabel(weekDates)}</div>
        <button className="week-nav-btn" onClick={onNextWeek} aria-label="Next week">
          ›
        </button>
        {weekOffset !== 0 && (
          <button className="week-today-btn" onClick={onToday}>
            Today
          </button>
        )}
      </div>
      <div className="week-note">
        {weekOffset === 0
          ? "🔁 This is your regular schedule — it repeats every week"
          : "📌 You're editing just this week — great for holidays or special days!"}
      </div>
      <div className="week-scroll">
        <div className="week-grid">
          <div className="gutter">
            <div className="gutter-corner" />
            {hours.map((h) => (
              <div className="gutter-hour" key={h} style={{ height: SLOT_HEIGHT * SLOTS_PER_HOUR }}>
                {timeLabel((h - START_HOUR) * SLOTS_PER_HOUR).replace(":00", "")}
              </div>
            ))}
          </div>
          {DAYS.map((day, dayIdx) => {
            const date = weekDates[dayIdx];
            const dateStr = toISODate(date);
            const isToday = dateStr === todayISO;
            const dayBlocks = placed.filter((b) =>
              b.date
                ? b.date === dateStr
                : b.day === dayIdx && !skips.some((s) => s.blockId === b.id && s.date === dateStr)
            );
            return (
              <div className="day-col-wrap" key={day}>
                <div className={"day-col-head" + (isToday ? " is-today" : "")}>
                  <span>{day}</span>
                  <span className="day-date">{shortDate(date)}</span>
                </div>
                <div className="day-col" data-day-col={dayIdx} style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}>
                  {hours.map((h, i) => (
                    <div className="hour-line" key={h} style={{ top: i * SLOT_HEIGHT * SLOTS_PER_HOUR }} />
                  ))}
                  {hover && hover.day === dayIdx && (
                    <div className="hover-cell" style={{ top: hover.slot * SLOT_HEIGHT, height: SLOT_HEIGHT }} />
                  )}
                  {dayBlocks.map((b) => {
                    const isDragSource = b.id === dragBlockId;
                    const isResizing = resizing && resizing.blockId === b.id;
                    const startSlot = isResizing ? resizing.previewStartSlot : b.startSlot;
                    const durationSlots = isResizing ? resizing.previewDuration : b.durationSlots;
                    return (
                      <div
                        key={b.id}
                        className={"sticky placed-sticky" + (b.date ? " one-time" : "") + (isResizing ? " resizing" : "")}
                        style={{
                          ...stickyStyle(b.color),
                          top: startSlot * SLOT_HEIGHT,
                          height: durationSlots * SLOT_HEIGHT - 4,
                          opacity: isDragSource ? 0 : 1,
                          pointerEvents: isDragSource ? "none" : "auto",
                        }}
                        onPointerDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          onStartDrag(e, {
                            kind: "placed",
                            block: b,
                            viewDate: dateStr,
                            grabX: e.clientX - rect.left,
                            grabY: e.clientY - rect.top,
                            w: rect.width,
                          });
                        }}
                      >
                        <div
                          className="resize-handle top"
                          onPointerDown={(e) => onStartResize(e, b, "start")}
                        />
                        {b.date && <span className="one-time-pin">📌</span>}
                        <div className="sticky-title small">{b.title}</div>
                        {durationSlots > 1 && (
                          <div className="sticky-time">
                            {timeLabel(startSlot)} – {timeLabel(startSlot + durationSlots)}
                          </div>
                        )}
                        {durationSlots >= 4 && (
                          <div className="sticky-duration-inline">{durationLabel(durationSlots)}</div>
                        )}
                        <div
                          className="resize-handle bottom"
                          onPointerDown={(e) => onStartResize(e, b, "end")}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Month View ---------- */

function MonthView({ monthCursor, setMonthCursor, placed, skips, onPickDay }) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = mondayIndex(firstOfMonth.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ dateNum: daysInPrevMonth - startOffset + i + 1, inMonth: false, weekday: (i) % 7 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const weekday = mondayIndex(date.getDay());
    cells.push({ dateNum: d, inMonth: true, weekday, date, isToday: isSameDate(date, new Date()) });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const idxFromEnd = cells.length - (startOffset + daysInMonth);
    cells.push({ dateNum: idxFromEnd + 1, inMonth: false, weekday: cells.length % 7 });
  }

  const monthName = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="month-panel">
      <div className="month-header">
        <button className="month-nav" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>
          ‹
        </button>
        <div className="month-title">{monthName}</div>
        <button className="month-nav" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>
      <div className="month-weekday-row">
        {DAYS.map((d) => (
          <div key={d} className="month-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((c, i) => {
          const dateStr = c.inMonth ? toISODate(c.date) : null;
          const dayBlocks = c.inMonth
            ? placed
                .filter((b) =>
                  b.date
                    ? b.date === dateStr
                    : b.day === c.weekday && !skips.some((s) => s.blockId === b.id && s.date === dateStr)
                )
                .sort((a, b) => a.startSlot - b.startSlot)
            : [];
          return (
            <div
              key={i}
              className={"month-cell" + (c.inMonth ? "" : " dim") + (c.isToday ? " is-today" : "")}
              onClick={() => c.inMonth && onPickDay(c.date)}
            >
              <div className="month-cell-num">{c.dateNum}</div>
              <div className="month-cell-chips">
                {dayBlocks.slice(0, 4).map((b) => (
                  <div key={b.id} className="month-chip" style={{ background: COLORS[b.color].bg, color: COLORS[b.color].ink }}>
                    {b.date ? "📌 " : ""}
                    {b.title}
                  </div>
                ))}
                {dayBlocks.length > 4 && <div className="month-chip-more">+{dayBlocks.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ---------- Print / PDF View ---------- */

function PrintSchedule({ calendarName, weekDates, placed, skips }) {
  return (
    <div className="print-only">
      <div className="print-header">
        <h1>{calendarName}</h1>
        <div className="print-range">{weekRangeLabel(weekDates)}</div>
      </div>
      <div className="print-days">
        {DAYS_FULL.map((dayName, dayIdx) => {
          const date = weekDates[dayIdx];
          const dateStr = toISODate(date);
          const dayBlocks = placed
            .filter((b) =>
              b.date
                ? b.date === dateStr
                : b.day === dayIdx && !skips.some((s) => s.blockId === b.id && s.date === dateStr)
            )
            .sort((a, b) => a.startSlot - b.startSlot);
          return (
            <div className="print-day" key={dayName}>
              <div className="print-day-head">
                {dayName} <span>{shortDate(date)}</span>
              </div>
              {dayBlocks.length === 0 ? (
                <div className="print-empty">Nothing scheduled</div>
              ) : (
                dayBlocks.map((b) => (
                  <div className="print-block" key={b.id} style={{ borderLeftColor: COLORS[b.color].edge }}>
                    <div className="print-time">
                      {timeLabel(b.startSlot)} – {timeLabel(b.startSlot + b.durationSlots)}
                    </div>
                    <div className="print-title">
                      {b.date ? "📌 " : ""}
                      {b.title}
                    </div>
                    {b.description && <div className="print-desc">{b.description}</div>}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Modals ---------- */

function DayToggle({ selected, onToggle }) {
  return (
    <div className="day-toggle-row">
      {DAYS.map((d, i) => (
        <button
          key={d}
          type="button"
          className={"day-toggle-btn" + (selected.includes(i) ? " selected" : "")}
          onClick={() => onToggle(i)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function TemplateModal({ template, onCancel, onSave, onRequestDelete, pendingDelete, onConfirmDelete }) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description);
  const [color, setColor] = useState(template.color);
  const [durationSlots, setDurationSlots] = useState(template.durationSlots);
  const [customHours, setCustomHours] = useState(String((template.durationSlots * SLOT_MIN) / 60));
  const [repeatDays, setRepeatDays] = useState(template.repeatDays || []);
  const [startSlot, setStartSlot] = useState(template.startSlot ?? 0);
  const [showEmoji, setShowEmoji] = useState(false);

  function toggleDay(i) {
    setRepeatDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b)));
  }

  function pickPresetDuration(slots) {
    setDurationSlots(slots);
    setCustomHours(String((slots * SLOT_MIN) / 60));
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{template.isNew ? "New Block" : "Edit Block"}</h2>

        <label className="field-label">What is it?</label>
        <div className="title-input-row">
          <input
            className="field-input"
            maxLength={28}
            placeholder="e.g. Soccer Practice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="emoji-toggle"
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Add emoji"
          >
            😀
          </button>
        </div>
        {showEmoji && (
          <EmojiPicker
            onPick={(e) => {
              setTitle((t) => (t && !t.endsWith(" ") ? t + " " : t) + e);
            }}
          />
        )}

        <label className="field-label">Tell me more (optional)</label>
        <textarea
          className="field-textarea"
          maxLength={90}
          placeholder="e.g. Wear cleats, bring water bottle"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="field-label">Pick a color</label>
        <div className="color-row">
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              className={"color-dot" + (color === i ? " selected" : "")}
              style={{ background: c.bg, borderColor: c.edge }}
              onClick={() => setColor(i)}
              aria-label={c.name}
            />
          ))}
        </div>

        <label className="field-label">How long?</label>
        <div className="duration-row">
          {DURATIONS.map((d) => (
            <button
              key={d.slots}
              className={"duration-btn" + (durationSlots === d.slots ? " selected" : "")}
              onClick={() => pickPresetDuration(d.slots)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="duration-custom-row">
          <span>Custom:</span>
          <input
            type="number"
            className="field-input duration-custom-input"
            min={SLOT_MIN / 60}
            step={0.25}
            max={(TOTAL_SLOTS * SLOT_MIN) / 60}
            value={customHours}
            onChange={(e) => {
              const val = e.target.value;
              setCustomHours(val);
              const hrs = parseFloat(val);
              if (!isNaN(hrs) && hrs > 0) {
                const slots = Math.max(1, Math.min(TOTAL_SLOTS, Math.round((hrs * 60) / SLOT_MIN)));
                setDurationSlots(slots);
              }
            }}
          />
          <span>hours</span>
        </div>

        <label className="field-label">Repeat on days (optional)</label>
        <DayToggle selected={repeatDays} onToggle={toggleDay} />
        {repeatDays.length > 0 && (
          <>
            <label className="field-label">Start time</label>
            <select
              className="field-input"
              value={startSlot}
              onChange={(e) => setStartSlot(Number(e.target.value))}
            >
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
                <option key={i} value={i}>
                  {timeLabel(i)}
                </option>
              ))}
            </select>
            <div className="field-sub" style={{ marginTop: 6 }}>
              This will place it on the calendar every {repeatDays.map((d) => DAYS[d]).join(", ")} at{" "}
              {timeLabel(startSlot)}.
            </div>
          </>
        )}

        <div className="modal-actions">
          {!template.isNew && (
            <button
              className={"danger-btn" + (pendingDelete ? " confirm" : "")}
              onClick={() => (pendingDelete ? onConfirmDelete(template.id) : onRequestDelete(template.id))}
            >
              {pendingDelete ? "Tap again to delete" : "Delete Block"}
            </button>
          )}
          <div className="modal-actions-right">
            <button className="ghost-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="primary-btn"
              disabled={!title.trim()}
              onClick={() =>
                onSave({
                  ...template,
                  title: title.trim(),
                  description,
                  color,
                  durationSlots,
                  repeatDays,
                  startSlot: Math.max(0, Math.min(startSlot, TOTAL_SLOTS - durationSlots)),
                })
              }
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlacedModal({ block, placed, onCancel, onSave, onRemove, onSkip }) {
  const [title, setTitle] = useState(block.title);
  const [description, setDescription] = useState(block.description);
  const [color, setColor] = useState(block.color);
  const [showEmoji, setShowEmoji] = useState(false);

  const isOneTime = !!block.date;

  const [repeatDays, setRepeatDays] = useState(() =>
    isOneTime ? [] : placed.filter((b) => b.templateId === block.templateId && !b.date).map((b) => b.day)
  );

  function toggleDay(i) {
    setRepeatDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b)));
  }

  const displayDateStr = block.date || block._viewDate;
  const displayDate = displayDateStr ? parseISODate(displayDateStr) : null;
  const dateLabel = displayDate
    ? displayDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    : DAYS_FULL[block.day];

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{dateLabel}</h2>
        <div className="field-sub">
          {timeLabel(block.startSlot)} · {durationLabel(block.durationSlots)}
          {isOneTime ? " · 📌 One-time event" : " · 🔁 Repeats every week"}
        </div>

        <label className="field-label">What is it?</label>
        <div className="title-input-row">
          <input className="field-input" maxLength={28} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button
            type="button"
            className="emoji-toggle"
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Add emoji"
          >
            😀
          </button>
        </div>
        {showEmoji && (
          <EmojiPicker
            onPick={(e) => {
              setTitle((t) => (t && !t.endsWith(" ") ? t + " " : t) + e);
            }}
          />
        )}

        <label className="field-label">Tell me more (optional)</label>
        <textarea
          className="field-textarea"
          maxLength={90}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="field-label">Pick a color</label>
        <div className="color-row">
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              className={"color-dot" + (color === i ? " selected" : "")}
              style={{ background: c.bg, borderColor: c.edge }}
              onClick={() => setColor(i)}
              aria-label={c.name}
            />
          ))}
        </div>

        {!isOneTime && (
          <>
            <label className="field-label">Repeat on days</label>
            <DayToggle selected={repeatDays} onToggle={toggleDay} />
          </>
        )}

        <div className="modal-actions">
          {isOneTime ? (
            <button className="danger-btn" onClick={() => onRemove(block.id)}>
              Delete this event
            </button>
          ) : (
            <div className="modal-actions-left">
              <button className="danger-btn" onClick={() => onSkip(block.id, displayDateStr)}>
                Skip just {shortDate(displayDate)}
              </button>
              <button className="danger-btn subtle" onClick={() => onRemove(block.id)}>
                Remove every week
              </button>
            </div>
          )}
          <div className="modal-actions-right">
            <button className="ghost-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="primary-btn"
              disabled={!title.trim()}
              onClick={() =>
                onSave({ ...block, title: title.trim(), description, color, repeatDays: isOneTime ? undefined : repeatDays })
              }
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- global style ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap');

      .app-root {
        font-family: 'Nunito', sans-serif;
        background-color: var(--bg, #FBF6EC);
        background-image: radial-gradient(var(--dot, #E4D9C2) 1.4px, transparent 1.4px);
        background-size: 22px 22px;
        min-height: 100vh;
        box-sizing: border-box;
        padding: 18px 16px 60px;
        color: #2B2D42;
        transition: background-color .2s ease;
      }
      .app-root *, .app-root *::before, .app-root *::after { box-sizing: border-box; }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .sync-pill {
        font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px; color: #8A7A55;
        background: rgba(255,255,255,0.7); border-radius: 999px; padding: 4px 10px; white-space: nowrap;
      }
      .sync-saved { color: #4C8A2E; }
      .sync-offline { color: #B36A1E; }
      .home-link {
        font-size: 24px; text-decoration: none; flex-shrink: 0; line-height: 1;
        width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px;
        background: rgba(255,255,255,0.7);
      }
      .title-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .title-wrap .pin { font-size: 22px; transform: rotate(-18deg); display:inline-block; flex-shrink: 0; }
      .app-header h1 {
        font-family: 'Baloo 2', sans-serif;
        font-weight: 700;
        font-size: 28px;
        margin: 0;
        color: var(--accent-text, #FF6B4A);
        letter-spacing: 0.2px;
        cursor: pointer;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-bottom: 2px dashed transparent;
      }
      .app-header h1:hover { border-bottom: 2px dashed var(--accent, #FF8C42); }
      .name-input {
        font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 24px; color: var(--accent-text, #FF6B4A);
        border: none; border-bottom: 2px solid var(--accent, #FF8C42); background: transparent; outline: none;
        max-width: 60vw; padding: 2px 0;
      }

      .photo-frame {
        width: 104px; height: 104px; border-radius: 16px; border: 3px solid white; flex-shrink: 0;
        box-shadow: 3px 4px 0 rgba(0,0,0,0.15); background: #FFFDF8; cursor: pointer; position: relative;
        overflow: hidden; transform: rotate(-3deg); display: flex; align-items: center; justify-content: center;
      }
      .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
      .photo-placeholder { font-size: 34px; opacity: 0.5; }
      .photo-remove {
        position: absolute; top: -2px; right: -2px; width: 22px; height: 22px; border-radius: 50%;
        background: #B34A3A; color: white; border: none; font-size: 14px; line-height: 1; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }

      .theme-btn {
        font-family: 'Baloo 2', sans-serif; font-weight: 600; border: 2px solid var(--accent, #FF8C42);
        background: var(--accent-soft, #FFEFE2); color: var(--accent-text, #FF6B4A); padding: 7px 14px;
        border-radius: 999px; cursor: pointer; font-size: 13.5px;
      }
      .print-btn {
        font-family: 'Baloo 2', sans-serif; font-weight: 600; border: 2px solid #C9AE83;
        background: white; color: #6B5A3E; padding: 7px 14px;
        border-radius: 999px; cursor: pointer; font-size: 13.5px;
      }

      .view-tabs { display: flex; background: #EFE6D4; border-radius: 999px; padding: 4px; gap: 4px; }
      .tab {
        border: none; background: transparent; font-family: 'Baloo 2', sans-serif; font-weight: 600;
        font-size: 15px; padding: 8px 18px; border-radius: 999px; cursor: pointer; color: #7A6E58;
        transition: all .15s ease;
      }
      .tab.active { background: var(--accent, #FF8C42); color: white; box-shadow: 0 2px 0 rgba(0,0,0,0.15); }

      .tray-wrap {
        background: repeating-linear-gradient(135deg, var(--tray-bg1, #E9DCC3), var(--tray-bg1, #E9DCC3) 2px, var(--tray-bg2, #E3D4B7) 2px, var(--tray-bg2, #E3D4B7) 4px);
        border: 3px solid var(--tray-border, #C9AE83);
        border-radius: 16px;
        padding: 12px 14px 16px;
        margin-bottom: 18px;
      }
      .tray-head {
        display: flex; align-items: center; justify-content: space-between;
        font-family: 'Baloo 2', sans-serif; font-weight: 600; font-size: 15px; color: #6B5A3E; margin-bottom: 10px;
      }
      .new-block-btn {
        font-family: 'Baloo 2', sans-serif; font-weight: 600; border: none; background: var(--accent, #FF8C42); color: white;
        padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 14px;
        box-shadow: 0 2px 0 var(--accent-dark, #C6642A);
      }
      .new-block-btn:active { transform: translateY(2px); box-shadow: none; }
      .tray-scroll {
        display: flex; flex-wrap: wrap; gap: 12px; align-content: flex-start;
        max-height: 340px; overflow-y: auto; padding: 2px 16px 6px 2px;
        -webkit-overflow-scrolling: touch;
      }
      .tray-empty { font-style: italic; color: #9A8B6C; padding: 20px 0; }
      .tray-drop-hint {
        margin-top: 8px; text-align: center; font-weight: 700; color: #B34A3A;
        font-family: 'Baloo 2', sans-serif; font-size: 14px;
      }

      .sticky {
        border: 3px solid; border-radius: 10px; padding: 8px 10px; cursor: grab; user-select: none;
        touch-action: none; box-shadow: 2px 3px 0 rgba(0,0,0,0.18);
        transition: transform .1s ease;
      }
      .sticky:active { cursor: grabbing; }
      .template-sticky { flex: 0 0 140px; width: 140px; min-height: 78px; transform: rotate(-1.2deg); }
      .template-sticky:nth-child(even) { transform: rotate(1.4deg); }
      .sticky-title { font-family: 'Baloo 2', sans-serif; font-weight: 600; font-size: 14.5px; line-height: 1.15; word-break: break-word; }
      .sticky-title.small { font-size: 12.5px; }
      .sticky-desc { font-size: 11.5px; margin-top: 3px; opacity: 0.85; line-height: 1.2; }
      .sticky-duration { font-size: 10.5px; margin-top: 6px; font-weight: 700; opacity: 0.7; }
      .sticky-time { font-size: 10px; opacity: 0.75; margin-top: 2px; font-weight: 700; }
      .sticky-duration-inline { font-size: 9.5px; opacity: 0.65; margin-top: 1px; font-weight: 700; }

      .ghost { position: fixed; z-index: 500; pointer-events: none; opacity: 0.92; transform: rotate(4deg) scale(1.04); }

      .week-panel { background: white; border-radius: 16px; padding: 14px; border: 3px solid var(--panel-border, #EFE3CC); }
      .week-nav-bar { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px; }
      .week-nav-btn {
        border: none; background: var(--accent-soft, #FFEFE2); color: var(--accent-text, #FF6B4A); font-size: 18px;
        width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-weight: 700; flex-shrink: 0;
      }
      .week-range-label { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 14.5px; color: #6B5A3E; min-width: 150px; text-align: center; }
      .week-today-btn {
        border: 2px solid var(--accent, #FF8C42); background: white; color: var(--accent-text, #FF6B4A);
        font-family: 'Baloo 2', sans-serif; font-weight: 600; font-size: 12px; border-radius: 999px; padding: 4px 12px; cursor: pointer;
      }
      .week-note { font-family: 'Baloo 2', sans-serif; font-size: 13px; color: #8A7A55; margin-bottom: 8px; text-align: center; }
      .week-scroll { overflow-x: auto; }
      .week-grid { display: flex; min-width: 620px; }
      .gutter { width: 52px; flex: 0 0 52px; }
      .gutter-corner { height: 34px; }
      .gutter-hour { font-size: 10.5px; color: #A79B80; text-align: right; padding-right: 6px; position: relative; top: -6px; }
      .day-col-wrap { flex: 1; min-width: 76px; border-left: 1px solid #F1E8D6; }
      .day-col-head {
        height: 34px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
        font-family: 'Baloo 2', sans-serif; font-weight: 600; font-size: 13px; color: #8A7A55;
      }
      .day-col-head .day-date { font-size: 10px; font-weight: 700; opacity: 0.75; }
      .day-col-head.is-today { color: white; background: var(--accent, #FF8C42); border-radius: 8px; }
      .day-col { position: relative; background: #FFFDF8; }
      .hour-line { position: absolute; left: 0; right: 0; border-top: 1px solid #F1E8D6; }
      .hover-cell { position: absolute; left: 2px; right: 2px; background: var(--hover-bg, rgba(255,140,66,0.18)); border: 2px dashed var(--accent, #FF8C42); border-radius: 6px; pointer-events: none; }
      .placed-sticky { position: absolute; left: 3px; right: 3px; overflow: hidden; z-index: 2; }
      .placed-sticky.one-time { border-style: dashed; }
      .placed-sticky.resizing { z-index: 6; box-shadow: 0 0 0 2px rgba(43,45,66,0.4); }
      .one-time-pin { position: absolute; top: 1px; right: 3px; font-size: 9px; }
      .resize-handle {
        position: absolute; left: 0; right: 0; height: 9px; cursor: ns-resize; touch-action: none;
        z-index: 5; display: flex; align-items: center; justify-content: center;
      }
      .resize-handle.top { top: 0; }
      .resize-handle.bottom { bottom: 0; }
      .resize-handle::after {
        content: ''; width: 20px; height: 3px; border-radius: 3px; background: rgba(0,0,0,0.22);
      }
      .resize-handle:hover::after, .resize-handle:active::after { background: rgba(0,0,0,0.45); }

      .month-panel { background: white; border-radius: 16px; padding: 14px; border: 3px solid var(--panel-border, #EFE3CC); }
      .month-header { display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 10px; }
      .month-title { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 18px; color: var(--accent-text, #FF6B4A); min-width: 180px; text-align: center; }
      .month-nav { border: none; background: var(--accent-soft, #FFEFE2); color: var(--accent-text, #FF6B4A); font-size: 18px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: 700; }
      .month-weekday-row { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
      .month-weekday { text-align: center; font-family: 'Baloo 2', sans-serif; font-size: 12px; color: #A79B80; padding: 4px; }
      .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(78px, auto); gap: 4px; }
      .month-cell { border: 1.5px solid #F1E8D6; border-radius: 8px; padding: 5px; cursor: pointer; background: #FFFDF8; overflow: hidden; }
      .month-cell.dim { opacity: 0.35; cursor: default; }
      .month-cell.is-today { border-color: var(--accent, #FF8C42); border-width: 2px; }
      .month-cell-num { font-size: 11px; font-weight: 700; color: #8A7A55; margin-bottom: 3px; }
      .month-cell-chips { display: flex; flex-direction: column; gap: 2px; }
      .month-chip { font-size: 9.5px; font-weight: 700; padding: 1.5px 5px; border-radius: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .month-chip-more { font-size: 9px; color: #A79B80; font-weight: 700; }

      .modal-backdrop {
        position: fixed; inset: 0; background: rgba(43,45,66,0.45); display: flex; align-items: center; justify-content: center;
        z-index: 1000; padding: 16px;
      }
      .modal-card {
        background: #FFFBF2; border-radius: 18px; padding: 22px 22px 18px; max-width: 380px; width: 100%;
        box-shadow: 0 10px 0 rgba(0,0,0,0.1); border: 3px solid var(--panel-border, #F1E0BE); max-height: 90vh; overflow-y: auto;
      }
      .modal-card h2 { font-family: 'Baloo 2', sans-serif; margin: 0 0 4px; color: var(--accent-text, #FF6B4A); font-size: 20px; }
      .field-sub { font-size: 12px; color: #9A8B6C; font-weight: 700; margin-bottom: 12px; }
      .field-label { display: block; font-family: 'Baloo 2', sans-serif; font-size: 12.5px; font-weight: 600; color: #6B5A3E; margin: 12px 0 5px; }
      .field-input, .field-textarea {
        width: 100%; border: 2px solid #E7D9B8; border-radius: 10px; padding: 9px 11px; font-family: 'Nunito', sans-serif;
        font-size: 14px; background: white; color: #2B2D42;
      }
      .title-input-row { display: flex; gap: 6px; align-items: center; }
      .title-input-row .field-input { flex: 1; }
      .emoji-toggle {
        flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px; border: 2px solid #E7D9B8;
        background: white; font-size: 17px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .emoji-popover {
        display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; padding: 8px;
        background: #FBF6EC; border: 2px solid #E7D9B8; border-radius: 10px; max-height: 120px; overflow-y: auto;
      }
      .emoji-btn {
        border: none; background: white; border-radius: 7px; font-size: 17px; width: 32px; height: 32px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .emoji-btn:active { transform: scale(0.9); }
      .field-textarea { resize: none; min-height: 56px; }
      .field-input:focus, .field-textarea:focus { outline: none; border-color: var(--accent, #FF8C42); }
      .color-row { display: flex; gap: 9px; flex-wrap: wrap; }
      .color-dot { width: 30px; height: 30px; border-radius: 50%; border: 3px solid; cursor: pointer; }
      .color-dot.selected { box-shadow: 0 0 0 3px #2B2D42; }
      .duration-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .duration-btn {
        border: 2px solid #E7D9B8; background: white; border-radius: 999px; padding: 6px 12px; font-size: 12.5px;
        font-weight: 700; cursor: pointer; color: #6B5A3E; font-family: 'Nunito', sans-serif;
      }
      .duration-btn.selected { background: var(--accent, #FF8C42); border-color: var(--accent, #FF8C42); color: white; }
      .duration-custom-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; color: #6B5A3E; font-weight: 700; }
      .duration-custom-input { width: 76px; flex: none; padding: 7px 9px; }
      .day-toggle-row { display: flex; gap: 5px; flex-wrap: wrap; }
      .day-toggle-btn {
        border: 2px solid #E7D9B8; background: white; border-radius: 999px; padding: 6px 10px; font-size: 12px;
        font-weight: 700; cursor: pointer; color: #6B5A3E; font-family: 'Nunito', sans-serif;
      }
      .day-toggle-btn.selected { background: var(--accent, #FF8C42); border-color: var(--accent, #FF8C42); color: white; }
      .modal-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; flex-wrap: wrap; gap: 10px; }
      .modal-actions-left { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
      .modal-actions-right { display: flex; gap: 8px; margin-left: auto; }
      .primary-btn, .ghost-btn, .danger-btn {
        font-family: 'Baloo 2', sans-serif; font-weight: 600; border-radius: 10px; padding: 9px 16px; font-size: 13.5px; cursor: pointer; border: none;
      }
      .primary-btn { background: var(--accent, #FF8C42); color: white; box-shadow: 0 2px 0 var(--accent-dark, #C6642A); }
      .primary-btn:disabled { background: #E9D8BE; box-shadow: none; cursor: not-allowed; color: #B5A780; }
      .ghost-btn { background: transparent; color: #8A7A55; }
      .danger-btn { background: #FFE3DE; color: #B34A3A; }
      .danger-btn.subtle { background: transparent; color: #B79A7A; padding: 4px 8px; font-size: 12px; }
      .danger-btn.confirm { background: #B34A3A; color: white; }

      .theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 6px; }
      .theme-swatch {
        border: 3px solid; border-radius: 14px; padding: 14px 10px 12px; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative;
        font-family: 'Baloo 2', sans-serif;
      }
      .theme-swatch.selected { box-shadow: 0 0 0 3px #2B2D42; }
      .theme-swatch-emoji { font-size: 26px; }
      .theme-swatch-name { font-weight: 700; font-size: 13.5px; }
      .theme-swatch-dot { width: 16px; height: 16px; border-radius: 50%; margin-top: 2px; }

      @media (max-width: 480px) {
        .app-header h1 { font-size: 22px; max-width: 46vw; }
        .name-input { font-size: 19px; max-width: 46vw; }
        .template-sticky { flex: 0 0 130px; width: 130px; }
        .theme-btn span { display: none; }
        .print-btn span { display: none; }
        .photo-frame { width: 52px; height: 52px; border-radius: 10px; }
        .photo-placeholder { font-size: 20px; }
        .photo-remove { width: 18px; height: 18px; font-size: 12px; }
        .tray-scroll { padding-right: 22px; }
      }

      .print-only { display: none; }

      @media print {
        @page { margin: 14mm; }
        .no-print { display: none !important; }
        .app-root { background: white !important; padding: 0 !important; min-height: 0; }
        .print-only {
          display: block !important;
          font-family: 'Nunito', sans-serif;
          color: #2B2D42;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-header { text-align: center; margin-bottom: 18px; }
        .print-header h1 {
          font-family: 'Baloo 2', sans-serif; color: var(--accent-text, #FF6B4A); font-size: 26px; margin: 0 0 4px;
        }
        .print-range { color: #8A7A55; font-weight: 700; font-size: 13px; }
        .print-days { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .print-day { break-inside: avoid; border: 1.5px solid #E7D9B8; border-radius: 10px; padding: 10px 12px; }
        .print-day-head {
          font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 14px; color: #6B5A3E;
          border-bottom: 1.5px solid #E7D9B8; padding-bottom: 6px; margin-bottom: 8px;
          display: flex; justify-content: space-between;
        }
        .print-day-head span { font-weight: 600; color: #A79B80; }
        .print-empty { color: #B5A780; font-style: italic; font-size: 12px; }
        .print-block { border-left: 4px solid; padding-left: 8px; margin-bottom: 8px; page-break-inside: avoid; }
        .print-time { font-weight: 700; font-size: 11.5px; color: #6B5A3E; }
        .print-title { font-family: 'Baloo 2', sans-serif; font-weight: 600; font-size: 13.5px; }
        .print-desc { font-size: 11px; color: #8A7A55; }
      }

      .login-wrap {
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        background-color: #FBF6EC; background-image: radial-gradient(#E4D9C2 1.4px, transparent 1.4px);
        background-size: 22px 22px; padding: 20px;
      }
      .login-card {
        background: #FFFBF2; border: 3px solid #F1E0BE; border-radius: 18px; padding: 28px 26px;
        max-width: 340px; width: 100%; box-shadow: 0 10px 0 rgba(0,0,0,0.1); text-align: center;
      }
      .login-card h1 { font-family: 'Baloo 2', sans-serif; color: #FF6B4A; font-size: 24px; margin: 6px 0 4px; }
      .login-card p { color: #8A7A55; font-size: 13.5px; margin: 0 0 18px; }
      .login-card input { margin-bottom: 10px; }
      .login-error { color: #B34A3A; font-size: 12.5px; font-weight: 700; margin: 6px 0 4px; }
      .login-success { color: #4C8A2E; font-size: 12.5px; font-weight: 700; margin: 6px 0 4px; }
      .login-links { display: flex; justify-content: space-between; margin-top: 12px; }
      .login-toggle { background: none; border: none; color: #FF8C42; font-weight: 700; font-size: 12.5px; cursor: pointer; text-decoration: underline; }
      .login-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Baloo 2', sans-serif; color: #8A7A55; }
    `}</style>
  );
}

/* ---------- family PIN (asked once per device) ---------- */

function PinScreen({ message }) {
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState(message || "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await fetchRemote(pin.trim());
      setPin(pin.trim());
      window.location.reload();
    } catch (err) {
      if (err instanceof PinError) setError("That PIN didn't work. Try again.");
      else if (err instanceof LockedError) setError("Too many tries – wait 10 minutes, then try again.");
      else setError("Can't reach the home server. Check the Wi-Fi and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <style>{`
        .login-card input { width: 100%; border: 2px solid #E7D9B8; border-radius: 10px; padding: 12px; font-family: 'Nunito', sans-serif; font-size: 22px; letter-spacing: 0.3em; text-align: center; }
        .login-card input:focus { outline: none; border-color: #FF8C42; }
      `}</style>
      <form className="login-card" onSubmit={handleSubmit}>
        <span style={{ fontSize: 28 }}>📌</span>
        <h1>Trinity&rsquo;s Timetable</h1>
        <p>Grown-ups: type the family PIN once on this device.</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPinValue(e.target.value)}
          required
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button className="primary-btn" style={{ width: "100%" }} disabled={busy || !pin.trim()} type="submit">
          {busy ? "Checking…" : "Open timetable"}
        </button>
        <div className="login-links">
          <a className="login-toggle" href="../../">← Learning Garden</a>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [pin, setPinState] = useState(() => getPin());
  const [message, setMessage] = useState("");

  const onPinRejected = useCallback(() => {
    setPin("");
    setMessage("The family PIN has changed. Please type the new one.");
    setPinState("");
  }, []);

  return (
    <>
      <GlobalStyle />
      {!pin ? <PinScreen message={message} /> : <TrinitysTimetable pin={pin} onPinRejected={onPinRejected} />}
    </>
  );
}
