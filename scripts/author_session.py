#!/usr/bin/env python3
"""Offline Stockfish authoring. Does not run in the browser.

Usage:
  python3 scripts/author_session.py --fen 'r4rk1/p3ppbp/1p4p1/qB1bP3/8/7P/PB2QPP1/1R2R1K1 w - - 2 20'
  python3 scripts/author_session.py --fen FEN --lines a4,Bd4,Red1 --depth 18 --json > stub.json
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import chess
import chess.engine

STOCKFISH = shutil.which("stockfish") or "/opt/homebrew/bin/stockfish"


def analyse(board: chess.Board, engine: chess.engine.SimpleEngine, depth: int, mpv: int) -> list[dict]:
    infos = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=mpv)
    rows = []
    for inf in infos:
        score = inf["score"].white()
        b = board.copy()
        sans = []
        for move in inf.get("pv") or []:
            sans.append(b.san(move))
            b.push(move)
            if len(sans) >= 14:
                break
        rows.append({
            "cp": score.score(mate_score=100000),
            "mate": score.mate(),
            "line": sans,
        })
    return rows


def main() -> None:
    p = argparse.ArgumentParser(description="Stockfish tree → SAN (author sessions offline)")
    p.add_argument("--fen", required=True)
    p.add_argument("--depth", type=int, default=18)
    p.add_argument("--mpv", type=int, default=5)
    p.add_argument("--lines", default="", help="comma SAN from the root, e.g. a4,Bd4,Red1")
    p.add_argument("--json", action="store_true", help="emit a session stub")
    p.add_argument("--id", default="untitled")
    args = p.parse_args()

    if not Path(STOCKFISH).exists():
        sys.exit(f"stockfish not found at {STOCKFISH}")

    root = chess.Board(args.fen)
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH)
    engine.configure({"Threads": 2, "Hash": 128})

    print(f"# root {args.fen}", file=sys.stderr)
    tree = {"fen": args.fen, "root": analyse(root, engine, args.depth, args.mpv), "children": {}}
    for row in tree["root"]:
        print(f"  {row['cp']}  {' '.join(row['line'])}")

    for san in [s.strip() for s in args.lines.split(",") if s.strip()]:
        b = root.copy()
        if san not in [b.san(m) for m in b.legal_moves]:
            print(f"illegal {san}", file=sys.stderr)
            continue
        b.push_san(san)
        print(f"\n# after {san}")
        tree["children"][san] = analyse(b, engine, args.depth, min(4, args.mpv))
        for row in tree["children"][san]:
            print(f"  {row['cp']}  {san} {' '.join(row['line'])}")

    engine.quit()

    if args.json:
        stub = {
            "id": args.id,
            "startFen": args.fen,
            "title": args.id,
            "steps": [
                {
                    "id": "root",
                    "name": "1 Calculate",
                    "title": "Root",
                    "prompt": "Play the line. Do not stop at the first scare.",
                    "fen": args.fen,
                    "mustPlay": tree["root"][0]["line"][:6] if tree["root"] else [],
                    "questions": [
                        {"name": "stop", "label": "Which reply made you reject the candidate?", "type": "text"},
                        {"name": "then", "label": "Three more ply after that reply", "type": "text"},
                    ],
                    "branches": [
                        {
                            "id": san.lower(),
                            "label": san,
                            "mustPlay": [san] + (rows[0]["line"][:4] if rows else []),
                            "key": f"<p>{san} cp={rows[0]['cp'] if rows else '?'}</p>",
                        }
                        for san, rows in tree["children"].items()
                    ],
                    "key": "<p>Fill from Stockfish output. Do not paste eval into the live page as a toy.</p>",
                }
            ],
        }
        json.dump(stub, sys.stdout, indent=2)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
