# Weiterrechnen — design (was Path OS)

Date: 2026-09-12  
Player: Martin Kaiser, Dr. (FIDE 4689640, GER) · Lichess [emperor555](https://lichess.org/@/emperor555)

## Decision

Build a **local Path OS**: one self-contained HTML dossier that holds the playing plan, enforces the week, and **opens existing software**. Do not invent a puzzle trainer, engine, or opening trainer.

## Constraints (locked)

- Hard blitz cap (0 preferred, max 3/day, after training only)
- Train first, crush later (OTB volume TBD)
- ~10 hours/week slow work (8–12 band)
- Mac-first; no Windows-only dependency
- No external requests from the HTML file

## Approaches considered

1. **Path OS (chosen).** Local tracker + protocol. Work happens in Lichess, Chessable, ChessTempo, books. Thin, honest, finishable in one pass.
2. **Custom trainer.** Rebuild puzzles/engine/repertoire. Months of work, worse than tools that already exist. Rejected.
3. **Spreadsheet + books only.** No blitz-cap enforcement, no “what do I do today.” Too weak for this habit profile (12,241 Lichess blitz games).

## Architecture

- Single file: `index.html` (CSS/JS inlined)
- Persistence: `localStorage` (`chess_path_to_v1`) + JSON export/import
- Units: Today protocol, Week, Ladder, Stack, Log, Crush
- External tools are links, not embeds

## Training split (~10h)

| Block | Hours | Tool |
|---|---|---|
| Calculation | 3.5 | Aagaard *Calculation* + ChessTempo mixed (untimed) |
| Endgames | 2 | de la Villa / Chessable + Lichess practice / tablebase |
| Slow games + postmortem | 2.5 | Lichess 15+10 or 30+20, then analysis **without** engine first |
| Openings | 1.5 | Chessable MoveTrainer + Lichess study (maintenance, not expansion) |
| Strategy / model games | 0.5 | One annotated game, pause-and-predict |

## Title facts used

FIDE Title Regulations B.01 effective 1 January 2024 (handbook.fide.com/chapter/B012024): CM 2200; FM 2300; IM 2400 + 3 IM norms; GM 2500 + 3 GM norms (27+ games; GM performance ≥ 2600, opponents’ average ≥ 2380).

## Out of scope (v1)

Engine GUI, PGN parser, ChessBase clone, live FIDE fetch, tournament auto-calendar, coach matching.

## Self-review

- Placeholders: event volume is explicitly TBD (user: train first). No other TBDs.
- Consistency: 10 h week, blitz cap 3, compose existing tools — same in spec, README, and `index.html`.
- Scope: one HTML file plus attribution. Fits a single implementation.
- Ambiguity: “crush later” means Crush tab is protocol, not a dated calendar.
