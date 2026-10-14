# Trinity's Learning Garden

The static site behind [learn.raychufamily.com](https://learn.raychufamily.com) - a little
learning garden for Trinity (P1-P2, Hong Kong). Bilingual: Cantonese/Traditional Chinese
at home, English at school.

Served by a Caddy container ("trinity-web") straight from a folder on the home NAS.
No build step, no framework - each app is a self-contained folder of HTML/CSS/JS.

## Apps

| Path | What it is |
|---|---|
| `site/` | Dashboard ("Trinity's Learning Garden · 學習花園") - PWA root |
| `site/maths/jiuyinge/` | 九因歌 - times-table practice with Cantonese audio |
| `site/chinese/recognise/` | 認字樂園 - character recognition game (learn/quiz/match, card editor, optional AI auto-fill) |
| `site/english/phonics/` | Phonics Machine / Syllable Scramble |

## Conventions for new apps

- `site/<subject>/<app-name>/index.html`, relative paths only, back link `href="../../"`.
- Progress in the app's own `localStorage` key `trinity-<app>-v1`, every read/write in try/catch.
- Traditional Chinese (HK) text; speech via browser `speechSynthesis` with `zh-HK` where it helps.
- Big touch targets, portrait-first, no ads/links/tracking; cheerful feedback, never punishing.
- No secrets in any file, ever. No build tooling.

See `site/chinese/recognise/README.md` for a worked example (including the dashboard card
snippet and the optional `/api/ai` integration contract).
