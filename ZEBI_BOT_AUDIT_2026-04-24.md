# Zebi Bot Integration Audit — 2026-04-24

**Author:** Benjamin Brown  
**Status:** Active — drives tasks in "Bot configuration and testing framework" project  
**Do not archive** — task #7 (repo hygiene) explicitly preserves this file.

---

## Purpose

Full audit of how the four bots (Doug, Harvey, Theo, Casper) interact with the Zebi app. Every finding maps to one or more tasks in the "Bot configuration and testing framework" Zebi project.

---

## What's Good

1. `validateAIAuth` in `lib/doug-auth.ts` correctly resolves all four bot tokens to named identities.
2. Kill switch (`AGENT_WORK_ENABLED=false`) works globally.
3. Prisma ORM is consistent across routes — no raw SQL in hot paths.
4. `Agent` model in schema provides per-bot profile storage.
5. `POST /api/relay` passthrough exists (committed `a5bdce0`) — needs hardening.

---

## What's Bad

### #1 — No canonical relay entrypoint (FIXED by task 60bb7cb8)

`/api/relay` existed as a thin passthrough but lacked: `X-Actor-Agent` injection for downstream authorAgent stamping, DB logging to `relay_calls`, per-bot configurable rate limits (was 120 flat, should be 60/bot), and docs.

### #2 — No authorAgent on write models

`TaskComment`, `Note`, `AIMemory`, `ProgressEntry` have no `authorAgent` or `authorType` field. Bot writes are indistinguishable from human writes in the timeline. Makes `GET /api/tasks/:id/thread` meaningless. Task: `fd6275ad`.

### #3 — No unified task thread

There is no single endpoint that returns a chronological feed of comments, notes, memory, activity, and progress for a task. Bots build their own context by polling multiple endpoints. Task: `f462599e`.

### #4 — Meeting conclusions are ephemeral

Meetings exist in the DB but conclusions never materialise into tasks automatically. The `Meeting` model has no `spaceId`, `projectId`, or `objectiveId` — it floats unanchored. Tasks have no `meetingId` FK. Task: `dfe50137`.

### #5 — `AIMemory` has no version history

Documents have `DocumentVersion`. `AIMemory` has no equivalent. A bot overwriting a memory entry loses the previous value forever. Task: `514433c0`.

### #6 — No schema discoverability

Bots hard-code status IDs, enum values, and field names. When the schema changes, bots break silently. A `GET /api/schema/enums` endpoint would let bots resolve names → IDs at runtime. Task: `9ae6d4f1`.

### #7 — `/api/doug/*` routes are Doug-only

Harvey, Theo, Casper cannot use `/api/doug/my-tasks`, `/api/doug/task`, etc. Auth is `requireDougAuth` not `validateAIAuth`. Either open these routes to all bots or forward them to generic equivalents. Task: `8643f775`.

### #8 — No staging environment

All four bots run against production. Schema migrations, workflow changes, and relay behaviour cannot be tested safely without touching live data. Task: `108488a5`.

### #9 — `companyId` is the wrong name for spaces

The `Company` model is used as the space/context container throughout Zebi. It should be `Space`. The mismatch confuses bots and makes API documentation misleading. Task: `13db80af`.

### #10 — ~95 root markdown files and ~35 stale source files

The repo root has accumulated ~95 markdown files from old build sessions (e.g. `BOARD_TILE_REDESIGN_SUMMARY.md`, `VOICE_COACH_DEV_LOG.md`). None are referenced in code or linked in docs. Multiple Prisma schema backups exist. Task: `7b77c505`.

### #14 — No staging workspace (duplicate of #8 above, tracked separately)

See task `108488a5`.

---

## Task Map

| Task ID      | Title                                              | Priority |
|--------------|----------------------------------------------------|----------|
| `60bb7cb8`   | Build `/api/relay` single-entrypoint               | P2       |
| `fd6275ad`   | Add `authorAgent`/`authorType` to write models     | P2       |
| `f462599e`   | Build `GET /api/tasks/:id/thread`                  | P2       |
| `dfe50137`   | Materialise meetings → tasks; add FK fields        | P3       |
| `514433c0`   | Version `AIMemory`                                 | P3       |
| `9ae6d4f1`   | Publish `GET /api/schema/enums`                    | P3       |
| `8643f775`   | Deprecate `/api/doug/*` Doug-only auth             | P3       |
| `108488a5`   | Set up staging workspace                           | P3       |
| `13db80af`   | Rename `companyId` → `spaceId`                     | P4       |
| `7b77c505`   | Repo hygiene (archive/delete stale files)          | P4       |

---

## Reference

- Repo: `benjamingbrown064/zebi-app`
- Local: `/Users/botbot/.openclaw/workspace/zebi-app`
- Project in Zebi: "Bot configuration and testing framework" (`4159eab4-3fd1-43a3-9f1d-6dbc7b0213d9`)
