#!/usr/bin/env python3
"""Pack sessions/*.json into sessions/bundle.js for file:// (no fetch).

sessions/private/*.json (gitignored: book exercises, never pushed) go into
sessions/private/bundle.js, which merges into the same PATH_SESSIONS.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sessions"
OUT = SRC / "bundle.js"
PRIVATE = SRC / "private"
PRIVATE_OUT = PRIVATE / "bundle.js"


def collect(src: Path) -> dict:
    sessions = {}
    for path in sorted(src.glob("*.json")):
        data = json.loads(path.read_text())
        sid = data.get("id") or path.stem
        sessions[sid] = data
    return sessions


def main() -> None:
    sessions = collect(SRC)
    OUT.write_text("window.PATH_SESSIONS = " + json.dumps(sessions, indent=2) + ";\n")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(sessions)} session(s): {', '.join(sessions)})")

    # Always written locally so index.html finds the file; a fresh clone just lacks it.
    PRIVATE.mkdir(exist_ok=True)
    private = collect(PRIVATE)
    clash = sorted(set(private) & set(sessions))
    if clash:
        raise SystemExit(f"private session id(s) clash with public: {', '.join(clash)}")
    PRIVATE_OUT.write_text(
        "window.PATH_SESSIONS = Object.assign(window.PATH_SESSIONS || {}, "
        + json.dumps(private, indent=2)
        + ");\n"
    )
    print(f"wrote {PRIVATE_OUT.relative_to(ROOT)} ({len(private)} private session(s){': ' + ', '.join(private) if private else ''})")


if __name__ == "__main__":
    main()
