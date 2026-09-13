# Storage Layer Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every read and write of player data behind one interface with a swappable backend, changing no behaviour, so the hosted backend can be added later without touching `session-board.js`.

**Architecture:** A new `store.js` owns the state object and a backend. The page keeps reading state **synchronously** from an in-memory cache; only hydration at boot and persistence on write are asynchronous. `session-board.js` is not modified at all — it keeps calling `pathVariations`, `pathLogGame` and `pathLogAagaard` exactly as today.

**Tech Stack:** Vanilla ES5-style browser JS (no build step, no npm, no framework), `localStorage`, pytest 9.0.2 + Playwright 1.59.0 (Python, `channel="chrome"`), python-chess 1.11.2.

## Global Constraints

- `file://` must keep working. Every test runs against `file:///…/index.html`.
- No build step, no `package.json`, no bundler, no framework. Plain `<script src>` tags.
- **No Stockfish in the page.** Analysis is a link to Lichess, enabled only after Lock.
- **Public repo.** No book position, solution line, diagram or page text in any tracked file. `books/` and `sessions/private/` stay gitignored.
- Keys are teaching sentences, never raw eval.
- `session-board.js` is **not modified by this plan.** If a task appears to require editing it, stop and report — that is a design failure, not a step to improvise past.
- Browser JS style matches the existing files: `function` declarations, `var`/`let`/`const` as already used, no arrow functions in `store.js` (matches `session-board.js`), double-quoted strings.
- Commit after every task. Do not push; the repo owner pushes.

## Deviation from the spec (deliberate, and better)

The spec says "every hook becomes promise-returning, and the call sites in `session-board.js` must tolerate that." **This plan does not do that.** Instead the store hydrates once at boot into an in-memory cache; reads stay synchronous, writes return promises. The async blast radius shrinks from "every call site" to "the boot sequence". `session-board.js` needs no changes, which removes the largest risk in the spec.

## File Structure

| File | Responsibility |
|---|---|
| `store.js` *(new)* | State cache + backend interface. `PathStore.local()` today; `PathStore.remote()` in the next plan. |
| `index.html` *(modify)* | Boots the store, calls `store.commit()` where it called `save(state)`. |
| `pytest.ini` *(new)* | Points pytest at `tests/`. |
| `tests/conftest.py` *(new)* | Chrome fixture + `app_url` helper. |
| `tests/store_harness.html` *(new)* | Bare page loading `store.js` alone, for unit tests. |
| `tests/test_store.py` *(new)* | Store unit tests, run in the browser. |
| `tests/test_board.py` *(new)* | Board regression suite (ported from the throwaway scratchpad script). |
| `tests/test_persistence.py` *(new)* | Round-trip: write in the page, reload, still there. |

`session-board.js` appears in no row. That is the point.

---

### Task 1: Commit the test harness and the board regression suite

The board suite currently exists only as a throwaway script in a scratch directory. Before refactoring anything it must live in the repo and pass, or the refactor has no backstop.

**Files:**
- Create: `pytest.ini`
- Create: `tests/conftest.py`
- Create: `tests/test_board.py`

**Interfaces:**
- Consumes: nothing.
- Produces: pytest fixtures `browser_page` (a Playwright `Page`) and `app_url(session=None, tab=None)` (returns a `file://` URL string), used by every later test file.

- [ ] **Step 1: Create the pytest config**

Create `pytest.ini`:

```ini
[pytest]
testpaths = tests
addopts = -v
```

- [ ] **Step 2: Create the fixtures**

Create `tests/conftest.py`:

```python
import pathlib
import pytest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def _browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        yield browser
        browser.close()


@pytest.fixture
def browser_page(_browser):
    """A fresh page per test, with console errors collected on page.errors."""
    page = _browser.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    yield page
    page.close()


@pytest.fixture
def app_url():
    def build(session=None, tab=None):
        url = "file://" + str(ROOT / "index.html")
        if session:
            url += "?session=" + session
        if tab:
            url += "#" + tab
        return url
    return build


@pytest.fixture
def harness_url():
    return "file://" + str(ROOT / "tests" / "store_harness.html")
```

- [ ] **Step 3: Port the board regression suite**

Create `tests/test_board.py`:

```python
import json
import pathlib

import chess
import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOLVE_SESSION = "aagaard-6-01"
STOP_SESSION = "XbhWoWMi"


def square_index(square):
    """#chessBoard button index for a python-chess square (rank 8 first)."""
    return (7 - chess.square_rank(square)) * 8 + chess.square_file(square)


def play(page, fen, sans):
    board = chess.Board(fen)
    for san in sans:
        move = board.parse_san(san)
        page.locator("#chessBoard button").nth(square_index(move.from_square)).click()
        page.locator("#chessBoard button").nth(square_index(move.to_square)).click()
        board.push(move)
    return board


def private_step(session_id):
    path = ROOT / "sessions" / "private" / (session_id + ".json")
    if not path.exists():
        pytest.skip("private drills are not present in this checkout")
    return json.load(path.open())["steps"][0]


def test_use_board_line_fills_and_grades(browser_page, app_url):
    step = private_step(SOLVE_SESSION)
    line, fen = step["solve"]["line"], step["fen"]
    page = browser_page
    page.goto(app_url(session=SOLVE_SESSION, tab="session"))
    page.wait_for_selector("#boardTake")

    assert page.is_disabled("#boardTake"), "nothing on the board yet"

    play(page, fen, line[:2])
    assert "(2 ply)" in page.inner_text("#boardTake")
    page.click("#boardTake")
    assert page.input_value("input[name=line]").startswith(fen.split()[5] + ". ")

    page.click("#boardLock")
    assert "stopped at ply 2" in page.inner_text("#boardErr")


def test_miss_rewinds_board_to_the_failing_ply(browser_page, app_url):
    step = private_step(SOLVE_SESSION)
    line, fen = step["solve"]["line"], step["fen"]
    page = browser_page
    page.goto(app_url(session=SOLVE_SESSION, tab="session"))
    page.wait_for_selector("#boardTake")

    board = play(page, fen, line[:2])
    wrong = next(
        board.san(m)
        for m in board.legal_moves
        if board.san(m).rstrip("+#") != line[2].rstrip("+#")
    )
    play(page, board.fen(), [wrong])
    page.click("#boardTake")
    page.click("#boardLock")

    assert "Ply 3" in page.inner_text("#boardErr")
    assert "▶ 1 more" in page.inner_text("#boardStatus")


def test_full_line_locks_without_replaying(browser_page, app_url):
    step = private_step(SOLVE_SESSION)
    line, fen = step["solve"]["line"], step["fen"]
    page = browser_page
    page.goto(app_url(session=SOLVE_SESSION, tab="session"))
    page.wait_for_selector("#boardTake")

    play(page, fen, line)
    page.click("#boardTake")
    page.click("#boardStart")
    page.click("#boardLock")

    assert page.is_disabled("#boardLock")
    assert "show" in (page.get_attribute("#boardKey", "class") or "")
    assert page.is_disabled("#boardTake")
    assert page.errors == []


def test_enter_locks_without_reloading(browser_page, app_url):
    private_step("aagaard-6-02")  # skips the test when the private drills are absent
    page = browser_page
    page.goto(app_url(session="aagaard-6-02", tab="session"))
    page.wait_for_selector("input[name=line]")
    page.fill("input[name=line]", "Kh1")
    before = page.url

    page.press("input[name=line]", "Enter")
    page.wait_for_timeout(300)

    assert page.url == before
    assert page.input_value("input[name=line]") == "Kh1"
    assert page.inner_text("#boardErr") != ""


def test_stop_ply_splits_the_board_line(browser_page, app_url):
    page = browser_page
    page.goto(app_url(session=STOP_SESSION, tab="session"))
    page.wait_for_selector("#boardTake")
    fen = "r4rk1/pppq1ppp/2nn2b1/3p1NB1/3P2P1/2PB1P2/P1P4P/R3QRK1 w - - 5 15"

    play(page, fen, ["Nxd6"])
    page.click("#boardTake")
    assert "Start the board line with Qg3" in page.inner_text("#boardErr")

    page.click("#boardReset")
    play(page, fen, ["Qg3", "Nxf5", "gxf5", "Bxf5", "Bxf5"])
    page.click("#boardTake")

    assert page.input_value("input[name=scare]") == "Nxf5"
    assert page.input_value("input[name=continue]") == "16. gxf5 Bxf5 17. Bxf5"
    assert page.errors == []
```

- [ ] **Step 4: Run the suite against the current code**

Run: `cd /Users/marty/grok_projects/chess_path_to && python3 -m pytest`
Expected: 5 passed. These tests describe today's behaviour, so they must pass **before** any refactor. If one fails, the port is wrong — fix the test, not the app.

- [ ] **Step 5: Commit**

```bash
git add pytest.ini tests/conftest.py tests/test_board.py
git commit -m "Add the board regression suite to the repo"
```

---

### Task 2: `store.js` with the local backend

**Files:**
- Create: `store.js`
- Create: `tests/store_harness.html`
- Create: `tests/test_store.py`

**Interfaces:**
- Consumes: nothing.
- Produces `window.PathStore`:
  - `PathStore.KEY` → `"chess_path_to_v1"`
  - `PathStore.blank()` → a fresh state object `{sessions: [], games: [], blitz: {}, checks: {}, aagaard: [], variations: {}}`
  - `PathStore.local(key?)` → store
  - `PathStore.create(backend)` → store, where `backend` is `{name, read(), write(state)}`
  - store: `.backend` (string), `.state` (getter, sync), `.hydrate()` → `Promise<state>`, `.commit()` → `Promise<boolean>`, `.settled()` → `Promise<boolean>`

- [ ] **Step 1: Write the harness page**

Create `tests/store_harness.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>store harness</title>
<script src="../store.js"></script>
```

- [ ] **Step 2: Write the failing tests**

Create `tests/test_store.py`:

```python
def test_blank_shape(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    shape = page.evaluate("Object.keys(window.PathStore.blank()).sort()")
    assert shape == ["aagaard", "blitz", "checks", "games", "sessions", "variations"]


def test_hydrate_empty_storage_gives_blank(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    result = page.evaluate(
        """async () => {
            localStorage.clear();
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return { games: state.games.length, backend: store.backend };
        }"""
    )
    assert result == {"games": 0, "backend": "local"}


def test_commit_then_hydrate_round_trips(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    games = page.evaluate(
        """async () => {
            localStorage.clear();
            const a = window.PathStore.local();
            await a.hydrate();
            a.state.games.push({ event: "test", result: "1-0" });
            await a.commit();
            const b = window.PathStore.local();
            const state = await b.hydrate();
            return state.games;
        }"""
    )
    assert games == [{"event": "test", "result": "1-0"}]


def test_state_identity_is_stable_across_commits(browser_page, harness_url):
    """index.html keeps a local alias of state; commit must not replace the object."""
    page = browser_page
    page.goto(harness_url)
    same = page.evaluate(
        """async () => {
            const store = window.PathStore.local();
            const first = await store.hydrate();
            await store.commit();
            return first === store.state;
        }"""
    )
    assert same is True


def test_unknown_keys_survive_hydrate(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    kept = page.evaluate(
        """async () => {
            localStorage.setItem(window.PathStore.KEY, JSON.stringify({ futureField: 42 }));
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return state.futureField;
        }"""
    )
    assert kept == 42


def test_corrupt_storage_does_not_throw(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    games = page.evaluate(
        """async () => {
            localStorage.setItem(window.PathStore.KEY, "{not json");
            const store = window.PathStore.local();
            const state = await store.hydrate();
            return state.games.length;
        }"""
    )
    assert games == 0
    assert page.errors == []


def test_settled_resolves_after_commit(browser_page, harness_url):
    page = browser_page
    page.goto(harness_url)
    ok = page.evaluate(
        """async () => {
            const store = window.PathStore.local();
            await store.hydrate();
            store.commit();
            return await store.settled();
        }"""
    )
    assert ok is True
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python3 -m pytest tests/test_store.py`
Expected: 7 failed, each with a JS error along the lines of `Cannot read properties of undefined (reading 'blank')` — `window.PathStore` does not exist yet.

- [ ] **Step 4: Write `store.js`**

Create `store.js`:

```javascript
// Persistence behind one interface, so the page never talks to a backend directly.
// Reads stay synchronous off an in-memory cache; only hydrate and commit are async.
// LocalStore is today's behaviour: one JSON blob in localStorage, works from file://.
(function () {
  const KEY = "chess_path_to_v1";

  function blank() {
    return { sessions: [], games: [], blitz: {}, checks: {}, aagaard: [], variations: {} };
  }

  function localBackend(key) {
    return {
      name: "local",
      read: function () {
        try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
      },
      write: function (state) {
        // A full quota or a private window must not break the page; the cache stays correct.
        try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch (e) { return false; }
      }
    };
  }

  // `backend` is { name, read() -> state|Promise<state>, write(state) -> bool|Promise<bool> }.
  function create(backend) {
    let state = blank();
    let pending = null;
    return {
      backend: backend.name,
      // The same object for the life of the store: index.html keeps a local alias of it.
      get state() { return state; },
      hydrate: function () {
        return Promise.resolve(backend.read()).then(function (loaded) {
          Object.assign(state, blank(), loaded || {});
          return state;
        });
      },
      commit: function () {
        pending = Promise.resolve(backend.write(state)).then(function (ok) {
          pending = null;
          return ok !== false;
        });
        return pending;
      },
      settled: function () { return pending || Promise.resolve(true); }
    };
  }

  window.PathStore = {
    KEY: KEY,
    blank: blank,
    create: create,
    local: function (key) { return create(localBackend(key || KEY)); }
  };
})();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `python3 -m pytest tests/test_store.py`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add store.js tests/store_harness.html tests/test_store.py
git commit -m "Add a storage layer with a local backend"
```

---

### Task 3: Wire `index.html` to the store

**Files:**
- Modify: `index.html:600-604` (script tags), `index.html:643-646` (`load`/`save`), `index.html:682-696` (`state`, `pathVariations`), and every `save(state)` call site
- Create: `tests/test_persistence.py`

**Interfaces:**
- Consumes: `window.PathStore` from Task 2.
- Produces: no new public interface. `window.pathLogGame`, `window.pathLogAagaard` and `window.pathVariations` keep their exact current signatures, which is what lets `session-board.js` stay untouched.

- [ ] **Step 1: Write the failing round-trip test**

Create `tests/test_persistence.py`:

```python
def test_aagaard_entry_survives_reload(browser_page, app_url):
    page = browser_page
    page.goto(app_url(tab="log"))
    page.wait_for_function("typeof window.pathLogAagaard === 'function'")
    page.evaluate(
        """async () => {
            await window.pathStore.settled();
            window.pathLogAagaard({
                date: "2026-09-13", chapter: 6, exercise: 1,
                minutes: 7, result: "short", ply: 3, note: "test"
            });
            await window.pathStore.settled();
        }"""
    )

    page.reload()
    page.wait_for_function("typeof window.pathLogAagaard === 'function'")
    entries = page.evaluate("window.pathStore.state.aagaard")

    assert len(entries) == 1
    assert entries[0]["exercise"] == 1
    assert entries[0]["ply"] == 3


def test_variation_survives_reload(browser_page, app_url):
    page = browser_page
    page.goto(app_url(tab="log"))
    page.wait_for_function("typeof window.pathVariations === 'object'")
    page.evaluate(
        """async () => {
            window.pathVariations.set("s1:step1", [{ moves: ["e4", "e5"], note: "n" }]);
            await window.pathStore.settled();
        }"""
    )

    page.reload()
    page.wait_for_function("typeof window.pathVariations === 'object'")
    lines = page.evaluate("window.pathVariations.get('s1:step1')")

    assert lines[0]["moves"] == ["e4", "e5"]


def test_store_is_local_backend_on_file_url(browser_page, app_url):
    page = browser_page
    page.goto(app_url())
    page.wait_for_function("window.pathStore !== undefined")
    assert page.evaluate("window.pathStore.backend") == "local"
    assert page.errors == []
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m pytest tests/test_persistence.py`
Expected: 3 failed on the `window.pathStore` wait — the page does not expose a store yet.

- [ ] **Step 3: Load `store.js` in the page**

In `index.html`, change the script block that currently reads:

```html
<script src="pieces.js"></script>
```

to:

```html
<script src="store.js"></script>
<script src="pieces.js"></script>
```

`store.js` must load before the inline script that uses it.

- [ ] **Step 4: Replace `load`/`save` with the store**

In `index.html`, replace these two functions:

```javascript
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
```

with:

```javascript
  // One store for the whole page; the backend is swappable, the call sites are not.
  const store = window.PathStore.local(KEY);
  window.pathStore = store;
  // Deliberate compatibility shim: the eleven existing call sites pass `state` or `s`,
  // which is already the store's own object, so the argument is ignored rather than
  // rewriting them. Renaming this would touch every caller for no behaviour change.
  function save() { return store.commit(); }
```

`save` now ignores its argument, so the existing `save(state)` and `save(s)` calls keep working unchanged. Do not rename them.

- [ ] **Step 5: Point `state` at the store**

Replace:

```javascript
  const state = Object.assign({
    sessions: [],
    games: [],
    blitz: {},
    checks: {},
    aagaard: [],
    variations: {}
  }, load());
```

with:

```javascript
  // Hydrated before first render; the object identity never changes, so every closure below
  // and the `s` alias in pathLogGame keep pointing at live data.
  const state = store.state;
```

- [ ] **Step 6: Hydrate before the first render**

At the very end of the inline script, replace:

```javascript
  render();
})();
```

with:

```javascript
  store.hydrate().then(function () {
    render();
    const boot = location.hash.replace("#", "");
    if (boot) showTab(boot);
  });
})();
```

Then delete these two lines (currently `index.html:881-882`), so the tab is chosen once, after hydration:

```javascript
  const hashTab = location.hash.replace("#", "");
  if (hashTab) showTab(hashTab);
```

Leave the `hashchange` listener immediately below them alone.

- [ ] **Step 7: Run the persistence tests**

Run: `python3 -m pytest tests/test_persistence.py`
Expected: 3 passed.

- [ ] **Step 8: Run the whole suite — nothing may regress**

Run: `python3 -m pytest`
Expected: 15 passed. If any board test fails, the refactor broke behaviour. Do not edit `session-board.js` to make it pass; fix `index.html`.

- [ ] **Step 9: Commit**

```bash
git add index.html tests/test_persistence.py
git commit -m "Route page state through the storage layer"
```

---

### Task 4: Prove `file://` still works, then document it

**Files:**
- Modify: `HANDOFF.md` (§3 Storage, §7 How to verify)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing executable.

- [ ] **Step 1: Open the app the way the owner does**

Run: `open /Users/marty/grok_projects/chess_path_to/index.html`
Expected: the Today tab renders, the Board tab loads a session, the Drills tab shows mini boards, the Log tab shows existing entries. No console errors. This is a human check — the automated suite already covers the rest.

- [ ] **Step 2: Confirm no book content reached a tracked file**

Run:

```bash
git ls-files | grep -E "^books/|^sessions/private/" ; echo "exit=$?"
```

Expected: no output, `exit=1`.

- [ ] **Step 3: Update the handoff**

In `HANDOFF.md` §3, replace the `**Storage:**` line with:

```markdown
**Storage:** `store.js` owns the state and the backend. `PathStore.local()` keeps one JSON blob in `localStorage` under `chess_path_to_v1`; reads are synchronous off the cached object, `hydrate()` runs once at boot and `commit()` persists. The page exposes `window.pathStore`. Page hooks are unchanged: `pathLogGame`, `pathLogAagaard`, `pathVariations.get/set`, `pathOpenSession`, `initPathBoard`.
```

In `HANDOFF.md` §7, replace the Playwright paragraph with:

```markdown
The browser suite lives in `tests/` and runs with `python3 -m pytest` (pytest + Python Playwright, `channel="chrome"`; Node Playwright is not installed). Squares: `#chessBoard button` index `(8 - rank) * 8 + file`. Playwright refuses to click `aria-disabled` links — use `force=True` for the disabled Lichess link. Tests that need `sessions/private/` skip themselves in a checkout without it.
```

- [ ] **Step 4: Final run**

Run: `python3 -m pytest && node --check session-board.js && node --check store.js`
Expected: 15 passed, then no output from either check.

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md
git commit -m "Document the storage layer"
```

---

## Not in this plan

Deliberately deferred to the hosted plan, so this one stays shippable on its own:

- `PathStore.remote()`, Supabase, Lichess OAuth, Edge Functions
- Dirty-collection tracking in `commit()` (a full-blob write is correct for the local backend; the remote backend will need per-table writes and will add it then)
- `publish_sessions.py`, Cloudflare Pages, CI, the web app manifest
- The delete-everything button and the privacy note

## Self-review

**Spec coverage:** this plan implements spec item 1 only ("storage layer with two backends") and builds the test infrastructure the remaining items need. Items 2–6 are listed above as deferred, each with a home in the hosted plan. The spec's async requirement is deliberately narrowed — see "Deviation from the spec".

**Placeholder scan:** every step carries the literal file content or command. No "TBD", no "handle errors appropriately", no "similar to Task N".

**Type consistency:** `PathStore.blank`, `PathStore.local`, `PathStore.create`, `PathStore.KEY`, and store members `.backend`, `.state`, `.hydrate()`, `.commit()`, `.settled()` are used with the same names and shapes in Task 2's tests, Task 2's implementation and Task 3's wiring. `save()` keeps its name and drops its parameter, so the eleven existing `save(state)` / `save(s)` call sites need no edit.
