#!/usr/bin/env python3
"""Pack sessions/*.json into sessions/bundle.js for file:// (no fetch)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sessions"
OUT = SRC / "bundle.js"


def main() -> None:
    sessions = {}
    for path in sorted(SRC.glob("*.json")):
        data = json.loads(path.read_text())
        sid = data.get("id") or path.stem
        sessions[sid] = data
    body = "window.PATH_SESSIONS = " + json.dumps(sessions, indent=2) + ";\n"
    OUT.write_text(body)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(sessions)} session(s): {', '.join(sessions)})")


if __name__ == "__main__":
    main()
