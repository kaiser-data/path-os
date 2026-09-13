# Zwischenzug hosted — design

Date: 2026-09-13
Supersedes nothing. Extends [2026-09-12 Path OS design](2026-09-12-gm-path-os-design.md).
Owner: Martin Kaiser (Lichess `emperor555`)

## Decision

Put Zwischenzug on the web so friends can train on it, **without touching the board code and without breaking `file://`**.

v1 is deliberately small: **friends sign in with Lichess and solve the sessions Martin authors; their progress is their own.** No engine, no LLM, no API key, no recurring compute cost. Authoring stays manual, exactly as it works today.

## Constraints (locked, inherited)

- `file://` must keep working. The local dossier stays a first-class way to run the app.
- **No Stockfish in the page.** Analysis is a link to Lichess, opened only after Lock.
- **Public repo.** Book positions, solution lines, diagrams and page text never reach a tracked file — and now, never reach the server either.
- Keys are teaching sentences, never raw eval.
- `session-board.js` stays generic; a new game is a new JSON plus a bundle.

## New constraints (this design)

- **No book content on the server.** `sessions/private/` is excluded by the publisher, enforced by a test and by CI.
- **Friends' data is other people's data.** Martin becomes a data controller: minimal fields, owner-only reads, a delete-everything button, a short privacy note.
- No feature may require an always-on server process of Martin's own.

## Scope

### v1 — Shared library (this spec)

1. Storage layer with two backends (local, hosted)
2. Sign in with Lichess
3. Postgres schema with row-level security
4. `publish_sessions.py`
5. Deploy + CI, including the book-content gate
6. Installable on a phone; responsive pass

### Later, explicitly not now

- **v2 auto-authoring.** Read `[%eval]` and `[%clk]` from the Lichess PGN export, find the largest swing *for that player*, cross-reference the clock collapse, draft a stop-ply step. Engine-free: it reads the analysis Lichess has already computed. If a game is unanalysed, the app links out and waits.
- **v3 LLM.** Generated teaching keys and training plans, server-side key, per-user budget cap.
- **Request queue.** A friend pastes a Lichess URL and Martin authors it by hand. Added only if friends ask; it is his evenings.
- Aagaard log on the server. It holds only chapter and exercise numbers, which is harmless, but there is no reason to move it.

## Approaches considered

1. **Static frontend + Supabase (chosen).** Cloudflare Pages serves today's files unchanged; Supabase provides Postgres, row-level security and auth. No server to run, no CPU bill, free tier is ample for a handful of friends.
2. **Vanilla frontend + FastAPI + Fly.io + server-side Stockfish.** Reuses the Python authoring scripts and enables v2 auto-authoring without depending on Lichess having analysed a game. Rejected for v1: a container, a CPU bill and ops work for a feature v1 does not ship. Lichess's own evals make the engine unnecessary.
3. **Next.js + Prisma + Vercel.** The conventional answer. Rejected: it forces a rewrite of the board code and the Python pipeline, and Vercel's serverless functions cannot host a long-running engine anyway, so the architecture ends up as (2) plus a rewrite.

## Architecture

```
Cloudflare Pages  (static: index.html, session-board.js, pieces.js, chess.min.js)
        |
        +-- local mode  -> sessions/bundle.js + localStorage        (file:// keeps working)
        +-- hosted mode -> Supabase: Postgres + RLS + Auth
                              ^
              publish_sessions.py  (Martin's Mac, one command)
```

### The storage layer — the one real refactor

`index.html` already exposes the seams: `pathLogGame`, `pathLogAagaard`, `pathVariations.get/set`, `pathOpenSession`, and `localStorage` under `chess_path_to_v1`. Today those read and write the browser directly.

They become **one interface with two implementations**:

| | `LocalStore` | `RemoteStore` |
|---|---|---|
| Sessions | `window.PATH_SESSIONS` from `bundle.js` | `sessions` table |
| Progress, variations, log | `localStorage` | Postgres, owner-scoped |
| Chosen when | no Supabase session, or `file://` | a valid Supabase session exists |

`session-board.js` does not learn that servers exist. It keeps calling the same hooks. This is what protects the board code — navigation, grading, `Use board line`, the rewind-to-the-miss — from being re-debugged.

**Async is the real cost.** `localStorage` is synchronous; the network is not. Every hook becomes promise-returning, and the call sites in `session-board.js` must tolerate that. This is the part of the work most likely to be underestimated.

**Offline behaviour:** hosted mode keeps a `localStorage` write-through cache. A lost connection degrades to local mode for the session and syncs on the next successful call. A drill half-solved on a train is not lost.

### Sign in with Lichess — verified, and it needs a spike

Both sides were checked against current documentation, and **they do not fit directly**:

- **Lichess** is OAuth2 **PKCE only**. Client authentication is not supported and **no client secret is issued**; `client_id` is an arbitrary constant. Authorization endpoint `https://lichess.org/oauth`, token endpoint `https://lichess.org/api/token`, profile at `/api/account`.
- **Supabase custom OAuth/OIDC providers require a `client_secret`.** There is no public-client or PKCE option. Free plan allows three custom providers.

So Lichess cannot be configured as a Supabase custom provider. The flow must be:

1. Browser runs the Lichess PKCE flow (`code_verifier` in session storage, `code_challenge_method=S256`), getting a Lichess access token.
2. An **Edge Function** verifies the token by calling `/api/account`, then creates-or-fetches the corresponding Supabase user and returns a Supabase session.
3. The frontend holds the Supabase session; `RemoteStore` uses it. The Lichess token is needed only at sign-in for v1 and is not stored.

**Step 2 has two candidate mechanisms and must be settled by a spike before implementation:**

- **Primary:** service-role `auth.admin` — create or look up the user, then `generateLink` and `verifyOtp` to hand the browser a real Supabase session. Uses supported API surface only.
- **Fallback:** the Edge Function signs a JWT itself with the project JWT secret (`sub`, `role: authenticated`). Fewer moving parts, but it depends on the legacy shared-secret signing model; verify against the current signing-keys behaviour before choosing it.

The spike's exit criterion: a signed-in browser can read its own row and is refused another user's row, proven by a test.

### Publishing

`bundle_sessions.py` keeps writing the local bundles and does not change. A new `scripts/publish_sessions.py` upserts `sessions/*.json` into Postgres with the service-role key from the environment.

It **refuses to publish anything under `sessions/private/`**, and refuses if a session id collides with a private one. This is a test, not a comment. CI additionally fails the build when a tracked file contains book content or when `git ls-files` matches `^books/` or `^sessions/private/`.

## Data

| Table | Columns (shape) | Read access |
|---|---|---|
| `profiles` | `id`, `lichess_id`, `username`, `rating`, `created_at` | Owner; `username` readable by any signed-in user |
| `sessions` | `id`, `json`, `group`, `date`, `published_at` | Any signed-in user |
| `attempts` | `user_id`, `session_id`, `step_id`, `result`, `stopped_at_ply`, `minutes`, `written_line`, `created_at` | **Owner only** |
| `variations` | `user_id`, `session_id`, `step_id`, `moves`, `note`, `created_at` | Owner only |
| `game_log` | `user_id`, `date`, `event`, `result`, `tag`, `note` | Owner only |

Row-level security is on for every table, `deny` by default, owner-scoped through `auth.uid()`. A friend cannot read another friend's answers — and neither can Martin. `sessions` is the only table with a shared read policy; writes to it are service-role only.

`attempts` keeps the written line because *where the line stopped* is the entire training signal. That makes it the most sensitive column in the schema and the reason the owner-only policy is not negotiable.

## Privacy and deletion

- Stored: Lichess id, username, rating at signup, and what the player writes in the app. Nothing else. No email, no password.
- **Delete everything** in the UI: removes every row for that user from `profiles`, `attempts`, `variations` and `game_log` in one transaction, then signs out. `sessions` is shared library content and is not user data, so it is untouched.
- A short privacy note states what is stored, where (Supabase region, EU), and how to delete it.
- Supabase backup policy differs by plan; confirm what the chosen plan actually retains before friends are invited.

## Mobile

The app already ships a viewport meta and five media queries; the board collapses to one column at 860px and was checked at 400px. v1 adds:

- A web app manifest and icons, so it installs to the home screen.
- A responsive pass over the tabs that were never used on a phone (Week, Ladder, Stack tables).
- Touch targets on the board and the navigation row checked at 400px.

A service worker for true offline use is **not** in v1; the write-through cache covers the realistic case.

## Testing

- **Unit:** storage layer against both backends behind the same interface — the same test suite runs twice.
- **Policy:** two seeded users; each read and write path asserted to succeed for the owner and fail for the other. RLS is the security boundary, so it is tested directly rather than trusted.
- **Publisher:** refuses `sessions/private/`; refuses an id collision; upserts idempotently.
- **Browser:** the existing Playwright suite keeps running against `file://` — this is the regression test that `file://` still works. A second run against the deployed preview covers hosted mode.
- **CI:** `node --check`, python-chess verification of every line in `sessions/*.json`, the book-content gate, then deploy preview.

## Risks

| Risk | Mitigation |
|---|---|
| Supabase session minting is harder than expected | Spike it first; it is the one unknown and it gates everything else |
| Sync hooks become async and break grading | Storage-layer tests run before `session-board.js` is touched; Playwright suite is the backstop |
| Book content reaches the server | Publisher refusal + test + CI gate; three independent barriers |
| Friends sign in once and never return | v1 is cheap by design; the queue and auto-authoring are deliberately deferred until there is evidence of use |
| Cost grows with friends | v1 has no compute. Cost is a domain plus a free-tier database until v3 |

## Success criteria

1. A friend opens a link on a phone, signs in with Lichess, solves a session, and closes it — progress is there the next day on a different device.
2. Martin authors a session exactly as he does today, plus one command to publish.
3. `open index.html` still works with no network, and the Aagaard drills still run there and only there.
4. No book content exists anywhere in the repo or the database, proven by CI rather than by memory.

## Sources

- [Custom OAuth/OIDC Providers — Supabase](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [Custom OIDC Providers for Supabase Auth](https://supabase.com/blog/custom-oauth-oidc-providers)
- [Deprecate OAuth Authorization Code Flow without PKCE — lichess-org/lila#9214](https://github.com/ornicar/lila/issues/9214)
- [lichess-oauth-pkce-app](https://github.com/tors42/lichess-oauth-pkce-app)
