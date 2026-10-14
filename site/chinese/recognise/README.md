# 認字樂園 · Character Garden

Trinity's Chinese character recognition game (P1–P2 Hong Kong level). Part of
Trinity's Learning Garden at learn.raychufamily.com.

One self-contained `index.html` (~30 KB). No build step, no CDN scripts, no API
calls, no images — works fully offline once uploaded.

## What's inside

- **80 common Traditional Chinese characters** in 7 sets:
  數字 (12) · 家人 (12) · 身體 (12) · 大自然 (12) · 食物 (12) · 顏色 (8) · 動物 (12),
  plus a 混合 (mixed-all) option. Each character has Jyutping, a simple English
  meaning, an emoji and one example word (HK flavour: 飲茶-related words, 九龍, 公仔麵…).
- **三個模式 · Three modes**
  - 🌱 **學一學 Learn** — flashcards; tap the card or 🔊 to hear the character
    spoken in Cantonese (browser `speechSynthesis`, `zh-HK`/`yue` voice).
  - ✦ **玩遊戲 Quiz** — 8 questions per round. Half are "listen and pick the
    character", half are "see the emoji + English, pick the character".
    Wrong choices dim and can be retried; never punishing.
  - ❀ **配一配 Match** — memory game pairing 4 characters with their emoji.
- **Progress** — stars per set and total (5 stars = 1 flower 🌼), and a
  「識咗」confident count using the same rule as 九因歌: latest three attempts
  all correct and unassisted. Saved in `localStorage` key **`trinity-recognise-v1`**
  (own key; every read/write is wrapped in try/catch).
- **家長角 Parent corner** — student name (falls back to the name saved in
  `trinity-garden-v1` if this app has none), stats, characters needing practice,
  and a clear-progress button (keeps the name).
- **✎ 編輯字卡 Card editor** (inside the parent corner) — edit every card's
  字 / Jyutping / English / emoji / 例詞, add or delete cards, rename/re-icon/add/delete
  whole sets, and Export / Import the deck as JSON to move it between devices.
  Changes take effect immediately and are saved in this browser under the
  `trinity-recognise-sets-v1` key (separate from progress, so a bad progress
  record can never wipe a customised deck). 回復預設 · Reset restores the
  built-in 80 characters and clears that key.
- **✨ AI auto-fill (optional)** — in the card editor, type just the character
  and the rest of the card (Jyutping, simple English, an emoji, a 2-character
  example word) is filled in automatically; a ✨ AI 幫手填 button re-fills or
  fills any card on demand. It calls the site's own `POST /api/ai` route
  (Kimi via the Caddy proxy — the API key stays server-side; nothing is in
  this file). **The app never depends on it:** if the route isn't deployed
  yet, is down, or times out, you get a friendly「自己填」message and manual
  editing works exactly as before. AI results are per-device edits like all
  card edits — check them before showing them to your child.

## Upload steps

1. Upload the whole `site/chinese/recognise/` folder to the NAS web folder that
   the `trinity-web` (Caddy) container serves, keeping the path:
   `<web root>/chinese/recognise/index.html`
2. On the dashboard (`site/index.html`), replace the Chinese section's
  "Coming soon" card (the `<div class="card soon chinese">…</div>` block) with
   the card snippet from this README (below).
3. Reload learn.raychufamily.com — the root service worker is network-first,
   so the new card and app appear on refresh. No other deploy steps.

## Dashboard card snippet

Replace this block in `site/index.html` (Chinese section):

```html
<div class="card soon chinese" aria-disabled="true"><div class="icon">字</div><h3>快將推出</h3><p>認字、筆順、故事 · Coming soon</p></div>
```

with:

```html
<a class="card chinese" href="chinese/recognise/"><div class="icon">字</div><h3>認字樂園</h3><p>Character garden · 學一學、玩遊戲、配一配</p><div class="go">Let’s play →</div></a>
```

(Style matches the Phonics Machine card: same `card chinese` accent classes,
so no CSS changes are needed.)

## Adding or editing characters

**Quick way (per device):** open the game → 家長角 Parent ↗ → ✎ 編輯字卡 ·
Edit cards. Pick a set, tap a card to open its form (字, Jyutping, English,
emoji, 例詞), or use ＋ 加字 / ＋ 新一組 / 刪除這組. Edits save on that device
only — use **Export** to copy the whole deck as JSON and **Import** it on
another device (e.g. edit on the laptop, import on Trinity's tablet).
**回復預設 · Reset** restores the built-in cards.

**Permanent way (all devices):** edit `index.html` and re-upload. Find the
`BUILTIN_SETS=[` array near the top of the `<script>`. Each set looks like:

```js
{id:'nature',zh:'大自然',ic:'🌏',c:[
  ['山','saan1','mountain','⛰️','火山'],
  // character, Jyutping, English meaning, emoji, example word
]},
```

Add a new line per character (keep sets small, ~8–12). Traditional Chinese
characters only. A deck stored by the card editor overrides the built-ins, so
after changing the file press **回復預設 · Reset** in the parent corner on each
device to pick up the new built-ins. Progress for removed characters is ignored
harmlessly, and counts update automatically.

## Notes & limits

- **Speech**: uses an installed Cantonese voice (`zh-HK` / `yue`). On iPad this
  normally means downloading the 粵語 voice in Settings → Accessibility →
  Spoken Content. Without any Cantonese voice the app works normally and shows
  "read together" guidance instead — nothing depends on audio.
- **No AI dependency**: the optional `/api/ai` route is used only by the
  parent-corner card editor's ✨ auto-fill, and only when the page is served
  over http(s). The app is fully functional without it (404-tested).
- **Test hook**: open with `?nostorage=1` to preview the app with storage
  blocked (progress and deck edits last for the visit only). This is also how
  it was tested.
- Progress lives in the browser on each device; there is no sync. Card edits
  made in the parent corner are per-device too until you Export/Import them.
