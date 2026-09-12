# Handoff — Path OS, next depth

Date: 2026-09-12  
Repo: https://github.com/kaiser-data/path-os  
Workspace: `/Users/marty/grok_projects/chess_path_to`  
Open: `open index.html` → **Board** tab

This is for the next session. Do not restart from “2170 to GM, build an app.” The app exists. The gap is **calculation depth**.

---

## 1. Who and the real bottleneck

Martin Kaiser, Dr. GER, FIDE **4689640**, standard **2171**, no title.  
Lichess [`emperor555`](https://lichess.org/@/emperor555): 12k blitz, peak 2319 (2020), now ~2085, **0 classical**.

Locked: hard blitz cap (0–3), train first / crush later, ~10h/week, **compose existing tools** (Lichess, Chessable, ChessTempo, Aagaard). Do not rebuild a chess site.

**The 2170 leak is not “doesn’t know a4 is best.”**  
It is: **sees a reply he dislikes (`…a6`) and stops.**  
GM-path work is forcing the next three moves.

---

## 2. The game that is currently in the Board tab

[lichess.org/JB2bQpWt](https://lichess.org/JB2bQpWt) — 15+10, Kaiser White, Alapin, 1–0.

Critical position after **19…Qa5**, White to move:

```
r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20
```

### What he played vs what he saw

| He said / did | Truth |
|---|---|
| Played **20.Red1** | Pseudo-activity. If Black does **not** grab a2, **…Rfd8** contests the file and White is worse (~−1.7). |
| Opponent played **…Qxa2** | Blunder. **21.Ra1 22.Ra3** hunts the queen. That is why he won. |
| Rejected **20.a4** because of **…a6** | a6 attacks Bb5. The bishop is not lost. |
| Named **Bd7** and **Bg2** as reasons a4 is “complicated” | Correct instinct, incomplete line. **Bg2 is Black taking on g2**, not White playing Bg2. |
| Candidate **Bd4** | Looks central. **20.Bd4 Qxa2** is ~−3: bishop left b2, no Ra1 trap. |

### Engine-backed tree (Stockfish 17, depth ~20–24, 2026-09-12)

Binary: `/opt/homebrew/bin/stockfish` (installed this session). Re-run; do not treat these as gospel.

**Root after 19…Qa5** (White):

- **a4** ≈ **−0.17** (best)
- Red1 / Ra1 / Rbd1 / Rbc1 ≈ **−1.6 to −1.8**

**20.a4 a6 21.Bd7** ≈ equal (**−0.1 to 0.0**).

Critical skip-line (must be in the trainer):

```
20.a4 a6 21.Bd7 Bxg2 22.e6!
```

- **22.e6** is the zwischenzug. Do not recapture first.
- Sample: `22…Bd5 23.Bxg7 Kxg7 24.exf7` ≈ equal.
- **22.Kxg2 Qd5+** is the worse recapture (check).
- **20.a4 Bxg2 immediately** (no a6/Bd7) is a blunder: `21.Kxg2` ≈ **+5**. Do not mix this with the Bd7 line.

**20.Bd4 Qxa2** ≈ **−3.2**. Queen not trapped.

Other 21st moves after `a4 a6`: Bd7 best; Bc4 / Bd3 keep the piece, slacker.

---

## 3. What is built

One dossier: `index.html` + three JS files.

| File | Role |
|---|---|
| `index.html` | Chrome, tabs (Today, Board, Week, Ladder, Stack, Log, Crush), board CSS |
| `session-board.js` | Four-step session for **this one game** |
| `pieces.js` | CBurnett SVGs (Lichess set, public domain) |
| `chess.min.js` | chess.js 0.10.3 UMD, legal moves only, **not an engine** |
| `session.html` | Redirect to `index.html#session` |

Board tab steps today:

1. **Diagnose** — candidates, “which Black move stopped you from a4”
2. **Calculate a4** — must play `a4 a6 Bd7 Bxg2 e6` on the board before Lock
3. **Trap** — game line `…Qxa2 Ra1`
4. **Hunt** — `Ra3` + honest tag

Persistence: `localStorage` key `chess_path_to_v1` (week log / blitz). Board answers are **not** saved across refresh.

Constraints still in force: **no engine in the browser**, no Lichess API from the HTML file, no ChessBase clone.

---

## 4. What the player asked for next (do this, not cosmetics)

> “For the training we need to go deeper you too much on the surface. Actually I didn’t play a4 because of a6. I need to learn to calculate further.”

The next product is a **calculation desk**, not more tabs.

### Slice A — Generalise the Board session (highest leverage)

Hardcoded FENs and one forced line do not survive the next 15+10.

Build a **session schema** (JSON) so any slow game can load:

```json
{
  "id": "JB2bQpWt",
  "url": "https://lichess.org/JB2bQpWt",
  "startFen": "...",
  "steps": [
    {
      "name": "Calculate a4",
      "fen": "...",
      "mustPlay": ["a4", "a6", "Bd7", "Bxg2", "e6"],
      "questions": [...],
      "key": "..."
    }
  ]
}
```

Keep lock-until-the-line-is-on-the-board. That mechanic is the pedagogy.

Importer (later): paste a Lichess URL or PGN → pick the critical ply → author 2–3 calculation steps. Authoring can be you + Stockfish **offline**; the HTML still has no engine.

### Slice B — Candidate trees, not single lines

Current step 2 forces **one** PV. He also needs:

- After `a4 a6`, **three bishop retreats** (Bd7 / Bc4 / Bd3) with 2–3 ply each
- **Bd4 Qxa2** as a failed candidate (why the trap dies)
- **Red1 Rfd8** as the quiet refutation
- Sibling: `a4 Bxg2??` vs `a4 a6 Bd7 Bxg2` (same capture, opposite eval)

UI: a small move tree beside the board. Click a branch → board jumps to that FEN. He must write the next two moves **before** the branch label is revealed.

### Slice C — “Stop ply” drill (the actual skill)

Input: a candidate he rejected.  
Output: “name the reply that scared you, then give **three more ply**.”

Grade:

- Stopped at ply 1 → fail (this week’s a6)
- Reached the zwischenzug → pass
- Mixed two lines (Bxg2 with vs without Bd7) → fail with a contrast board

This can live as a reusable component on the Board tab.

### Slice D — Stockfish as an **authoring** tool, not a toy in the page

Mac binary already: `/opt/homebrew/bin/stockfish`.

A small `scripts/author_session.py`:

- FEN in
- multipv 5, depth 20
- print SAN tree
- emit session JSON

Never ship Stockfish WASM in v2 unless he asks. The leak is stopping early, not missing eval numbers.

### Slice E — Log writes back into training

After Hunt, auto-append to Path OS Log:

- result, tag `calculation`
- note: `Stopped at a6; missed Bd7 Bxg2 e6`

Today the Log is a separate form. Wire it.

### Slice F — Second slow game

He has almost no 15+10 volume. Next session: play **one** new 15+10, then author Slice A from **his** next critical position. Do not keep mining JB2bQpWt forever.

---

## 5. Do not do

- More chrome, more tabs, another piece set, another README pass
- A puzzle rush, Puzzle Storm, or blitz trainer
- “a4 is best” as a slogan without the a6-Bd7-Bxg2-e6 line
- In-page engine that answers before he writes
- ChessBase / opening-repertoire tourism
- Crush / tournament calendar until the blitz cap holds for weeks

---

## 6. How to verify

```bash
open /Users/marty/grok_projects/chess_path_to/index.html
```

Board tab: empty squares must be the **same size** as occupied (grid `8×8 1fr`).  
Step 2 Lock stays dead until `a4 a6 Bd7 Bxg2 e6` is on the board.

Re-run engine (optional):

```bash
python3 -c "import chess, chess.engine; print('ok')"
/opt/homebrew/bin/stockfish <<< "uci"
```

---

## 7. Player voice to keep

He already has the right words. Use them in the UI:

- “Red1 is **pseudo-activity**; Black can put a rook on the file.”
- “I didn’t play a4 because of **a6**.”
- “a4 is also complicated — you need **Bd7, Bxg2**.”

The trainer’s job is to make him **finish those sentences with moves**, not to replace them with eval.

---

## 8. Suggested first PR for the next session

1. Extract `sessions/JB2bQpWt.json` from the hardcoded object in `session-board.js`
2. Add a second branch step: `Bd4 Qxa2` (queen not trapped) vs `Red1 Rfd8`
3. `scripts/author_session.py` wrapping Stockfish → JSON
4. One new 15+10 from emperor555, same schema

Stop when a **new** game can be loaded without editing `session-board.js` by hand.
