# Claude — proceed from here

You are continuing **Zwischenzug** (`kaiser-data/zwischenzug`).  
Do **not** restart. Do **not** rename. Do **not** build a chess site.

Martin (FIDE 2171, Lichess `emperor555`) is about to play **another slow game**. When he pastes a Lichess URL, that game is the next session. Ingest path, game picker and stop-ply drill are built (2026-09-13); next is `author_session.py --json`.

Repo: https://github.com/kaiser-data/zwischenzug  
Local: `/Users/marty/grok_projects/chess_path_to`  
Open: `open index.html` → Board tab  
Player: Kaiser, Martin, Dr. GER, FIDE 4689640

---

## Product in one sentence

A local dossier that forces **three more ply** after the move that scared him. Game 1 (JB2bQpWt, won): the scare was `…a6` against `20.a4`. The name **Zwischenzug** is `22.e6` — recapture last. Game 2 (XbhWoWMi, lost): he saw `15.Qg3 Nxf5 gxf5 Bxf5 Bxf5` and stopped on **his own** capture, missing ply 5 `…Qxf5`. Same leak from the other side: he stops at the reply he dislikes *or* the recapture he likes.

## Locked constraints

- Hard blitz cap 0–3/day. Never train blitz.
- Train first, crush later. No tournament calendar.
- Compose Lichess / Chessable / ChessTempo / Aagaard. No new puzzle engine.
- **No Stockfish in the browser.** Author offline; the HTML has no eval bar until Lock.
- `file://` must work. Sessions are bundled JS, not `fetch()`.
- **The repo is public.** `books/` (his Aagaard PDF) and `sessions/private/` are gitignored. Book exercises become drills only as `sessions/private/<id>.json`, bundled into `sessions/private/bundle.js`. Never put book positions, solutions or text in tracked files. The Aagaard log in the Log tab stores exercise numbers and results, nothing from the book.
- Book drills: `books/ch6/build_sessions.py` (gitignored) writes `sessions/private/aagaard-6-NN.json`; then run `python3 scripts/bundle_sessions.py`. Step `type: "solve"` grades the written line ply by ply against `solve.line`. Its first miss is logged automatically to the Aagaard log through the session's `logAs: {kind: "aagaard", chapter, exercise}`. Optional step `image`, `caption` and `links[]` show the source diagram next to the board, and the session's `group` puts it under an optgroup in the picker. `books/ch6/check.html` compares every transcribed FEN with the book diagram; he confirmed all 24 on 2026-09-13.
- Aagaard plan: he solves chapter 6 (Intermediate Moves) on paper and logs each exercise. Only the ones he misses become private board drills. Chapter 6 exercises are on book p.152–153 (1–12), p.157 (13–18) and p.159 (19–24); solutions on p.154–156, p.158 and p.160–162. PDF page = book page + 1.
- Mac. Stockfish at `/opt/homebrew/bin/stockfish` (v17+).
- Never commit unless he asks — except he asked you to proceed building; commit if he says go/push.

## The 2170 leak (keep this in every feature)

He does **not** fail because he cannot see `a4`. He fails because he **stops at the first reply he dislikes**. Training that only says “a4 is best” is surface. Training that forces `a4 a6 Bd7 Bxg2 e6` is the product.

His words — use them, don’t replace them:

- “Red1 is pseudo-activity; Black can put a rook on the file.”
- “I didn’t play a4 because of a6.”
- “a4 is also complicated — you need Bd7, Bxg2.”

---

## What already works

| Piece | Where |
|---|---|
| One-app dossier (Today / Board / Week / Ladder / Stack / Log / Crush) | `index.html` |
| CBurnett pieces, Lichess-green board, equal 8×8 `1fr` squares | CSS in `index.html` |
| Generic board loader | `session-board.js` |
| This week’s game as **data** | `sessions/JB2bQpWt.json` |
| Packed for `file://` | `sessions/bundle.js` ← `python3 scripts/bundle_sessions.py` |
| Offline Stockfish tree | `python3 scripts/author_session.py --fen FEN --lines a4,Bd4,Red1 --depth 18` |
| Hunt → Log | `window.pathLogGame` |
| Second game (15.Qg3, 32.Kg2??) | `sessions/XbhWoWMi.json` |
| Game picker, newest first by optional `date`; `?session=` wins | Board tab, `session-board.js` |
| Stop-ply step type (step 1 in both sessions) | `type: "stopPly"` in session JSON |
| After a branch locks, board opens the next unplayed line | `session-board.js` |

Board step 2 on JB2bQpWt already has four branches. Next stays closed until all four are played on the board:

1. `a4 a6 Bd7 Bxg2 e6` — skipped line, `e6` zwischenzug  
2. `a4 Bxg2??` — same capture, no Bd7, `Kxg2` ≈ +5  
3. `Bd4 Qxa2` — queen not trapped, ≈ −3  
4. `Red1 Rfd8` — pseudo-activity  

Root FEN (after 19…Qa5):

```
r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20
```

Game: https://lichess.org/JB2bQpWt (15+10, he White, 1–0). He won because the opponent hung `…Qxa2`, not because Red1 was good.

---

## Session JSON (do not break this)

`sessions/<lichessId>.json` is the source of truth. After every edit:

```bash
python3 scripts/bundle_sessions.py
```

Load: `index.html?session=<id>#session`

Schema (see `sessions/JB2bQpWt.json`):

- `id`, `url`, `title`, `result`, `event`, `startFen`, `logNote`
- `steps[]`: `id`, `name`, `title`, `prompt`, `fen`, `mustPlay[]`, `questions[]`, optional `branches[]`, `key` (HTML after lock)
- Branch: `id`, `label`, `mustPlay[]`, `key`
- Questions: `name`, `label`, `type` = `text` | `textarea` | `select` | `triple`, optional `hint`, `names`, `options`

`session-board.js` must stay generic. **A new game = new JSON + bundle. Zero edits to board JS** unless you are adding a new step *type*.

Verify `mustPlay` lines with python-chess before shipping (illegal SAN = Lock never opens).

---

## What to build (in this order)

### 0. When he pastes a new Lichess URL (highest priority)

He said he will play another 15+10 / 30+20. When the URL arrives:

1. Export the game (`lichess.org/game/export/<id>`). Ignore blitz.
2. Find the **first position he felt worse** — not the opponent blunder, not the conversion.
3. Ask (or infer from his note) **which candidate he rejected and which reply stopped him**.
4. Run Stockfish offline:

```bash
python3 scripts/author_session.py --fen 'FEN' --lines CAND1,CAND2 --depth 18 --mpv 5
```

5. Hand-author `sessions/<id>.json` in the same shape as JB2bQpWt:
   - Diagnose
   - Calculate with **≥3 branches**: the skipped line, a mix-up (same capture / wrong order), the move he actually played
   - Game trap if there was a blunder
6. `python3 scripts/bundle_sessions.py`
7. Add a session picker on the Board tab if more than one JSON exists (dropdown of `PATH_SESSIONS` keys).
8. Do **not** paste raw eval into the live page as a toy. Keys are teaching sentences.

If the new game is blitz: refuse to author it as the main session.

### 1. Stop-ply drill — DONE (step 1 in both sessions)

The actual skill: *name the scare, then three more ply.*

Add optional `type: "stopPly"` on a step (or a field `stopPly` on diagnose):

```json
"stopPly": {
  "candidate": "a4",
  "scare": "a6",
  "continue": ["Bd7", "Bxg2", "e6"],
  "mixups": [
    { "match": ["Bxg2"], "line": ["a4", "Bxg2", "Kxg2"], "key": "<p class='bad'>…</p>" }
  ]
}
```

Grade on Lock:

- Wrote only the scare → fail (“that is ply 1”)
- Scare + continue → pass
- Scare + mixup (Bxg2 without Bd7) → fail, show contrast board

Board: after he names the scare, require `candidate + scare + continue` on the board (same `mustPlay` mechanic).

Keep this **schema-driven**. JB2bQpWt gets a stop-ply step; the next game reuses it.

As built: `scare` counts as ply 1. `match` is compared against the moves he writes after the scare, and `line` is played from the step `fen` to make the comparison board. The grader also fails a line that stops short ("You stopped at ply N"), an illegal move, or a move that leaves the line. `mustPlay` stays hidden in the status bar until the written line passes. Add a `mixups` entry only when the engine shows a real difference: in XbhWoWMi, recapturing with the bishop first was the same −3, so it is not a mixup there.

### 2. Session picker — DONE

If `Object.keys(PATH_SESSIONS).length > 1`, show a select on the Board tab. Changing it reloads `initPathBoard` (today `ready` is a one-shot; you will need a reset path).

### 3. Author script → less stub, more useful JSON

`scripts/author_session.py` already prints a SAN tree. Extend it so `--json` emits a diagnose + calculate skeleton with `mustPlay` taken from PV1, **then you still write the keys by hand**. Never auto-fill teaching `key` with “cp=-17”.

### 4. Not yet

- Crush / tournament calendar
- New piece set, more chrome, README restyle
- Puzzle Storm / ChessTempo clone
- Stockfish WASM
- Mining old 10+0 games from March 2026 as “the next session”

---

## Commands

```bash
cd /Users/marty/grok_projects/chess_path_to
open index.html
python3 scripts/bundle_sessions.py
python3 scripts/author_session.py --fen 'r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20' --lines a4,Bd4,Red1 --depth 16
/opt/homebrew/bin/stockfish <<< "uci"
```

Board CSS: squares must stay `grid-template-rows: repeat(8, minmax(0, 1fr))` or empty squares collapse.

## Files you should touch

| Touch | Don’t touch unless needed |
|---|---|
| `sessions/*.json` | `pieces.js` (CBurnett) |
| `scripts/author_session.py` | `chess.min.js` |
| `scripts/bundle_sessions.py` | piece SVG restyle |
| `session-board.js` (generic types only) | Crush tab content |
| `index.html` (picker, small CSS) | Rebranding |

## Done looks like

- A **second** Lichess slow game loads via `?session=ID` with no `session-board.js` rewrite
- Stop-ply grades “stopped at a6” vs “a6 Bd7 Bxg2 e6”
- He can switch games on the Board tab
- Still no engine in the page
