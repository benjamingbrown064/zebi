# POST /api/relay — Bot API Relay

The relay is the **canonical entrypoint** for all bot API calls into Zebi. Every bot (Doug, Harvey, Theo, Casper) should route API calls through the relay rather than calling `/api/*` routes directly.

## Why the relay exists

- **Identity propagation** — the relay resolves the caller's bot identity from the Bearer token and injects `X-Actor-Agent: <bot>` on every forwarded request, so downstream writes can consistently stamp `authorAgent`.
- **Audit logging** — every call is persisted to the `relay_calls` table with actor, method, path, status, and latency.
- **Rate limiting** — per-bot rate limits enforced at a single choke point (default 60 req/min per bot).
- **Structured errors** — relay always returns `{ success, error, code, field? }` instead of raw Prisma 500s.

---

## Request

```
POST /api/relay
Authorization: Bearer <bot-token>
Content-Type: application/json
```

### Envelope body

| Field    | Type                                   | Required | Description                                     |
|----------|----------------------------------------|----------|-------------------------------------------------|
| `method` | `GET \| POST \| PATCH \| PUT \| DELETE` | Yes      | HTTP method for the target endpoint             |
| `path`   | `string`                               | Yes      | Target path, must start with `/api/`            |
| `query`  | `Record<string, string>`               | No       | Query parameters appended to the target URL     |
| `body`   | `object`                               | No       | Request body forwarded as JSON (POST/PATCH/PUT) |

### Example — fetch task list

```json
{
  "method": "GET",
  "path": "/api/tasks/direct",
  "query": { "workspaceId": "dfd6d384-9e2f-4145-b4f3-254aa82c0237" }
}
```

### Example — create task

```json
{
  "method": "POST",
  "path": "/api/tasks/direct",
  "body": {
    "workspaceId": "dfd6d384-9e2f-4145-b4f3-254aa82c0237",
    "title": "Write quarterly report",
    "priority": 2
  }
}
```

### Example — update task status

```json
{
  "method": "PATCH",
  "path": "/api/tasks/60bb7cb8-3722-4edc-bb4c-441ad3640299",
  "body": {
    "workspaceId": "dfd6d384-9e2f-4145-b4f3-254aa82c0237",
    "statusId": "2ce2defa-8850-442a-bb5c-428c0aa74fd2",
    "ownerAgent": "doug"
  }
}
```

---

## Response

The relay returns the **exact upstream response** (status, body, Content-Type) with added headers:

| Header             | Value                               |
|--------------------|-------------------------------------|
| `X-Relay-Duration` | Latency in ms, e.g. `42ms`         |
| `X-Relay-Agent`    | Resolved bot name, e.g. `doug`     |
| `X-Actor-Agent`    | Same as X-Relay-Agent (canonical)  |

---

## Error responses

All relay errors (before forwarding) use this shape:

```json
{
  "success": false,
  "error":   "Human-readable description",
  "code":    "MACHINE_READABLE_CODE",
  "field":   "path"   // optional — which envelope field caused the error
}
```

| Code                  | Status | Meaning                                                  |
|-----------------------|--------|----------------------------------------------------------|
| `UNAUTHORIZED`        | 401    | Missing or invalid Bearer token                          |
| `AGENT_DISABLED`      | 503    | Kill switch active (`AGENT_WORK_ENABLED=false`)          |
| `RATE_LIMIT_EXCEEDED` | 429    | Per-bot rate limit hit; `Retry-After: 60` is set         |
| `INVALID_JSON`        | 400    | Envelope body is not valid JSON                          |
| `INVALID_PATH`        | 400    | `path` does not start with `/api/`                       |
| `BLOCKED_PATH`        | 403    | `path` is on the deny-list (`/api/relay`, `/api/auth`)   |
| `INVALID_METHOD`      | 400    | `method` is not one of the allowed HTTP verbs            |
| `UPSTREAM_ERROR`      | 502    | Network error fetching the target endpoint               |

---

## Rate limits

Default: **60 requests/minute** per bot. Configurable per bot via Vercel env vars:

| Bot    | Env var                    |
|--------|----------------------------|
| Doug   | `RELAY_RATE_LIMIT_DOUG`    |
| Harvey | `RELAY_RATE_LIMIT_HARVEY`  |
| Theo   | `RELAY_RATE_LIMIT_THEO`    |
| Casper | `RELAY_RATE_LIMIT_CASPER`  |

Rate limit counters are in-memory and reset on Vercel cold start.

---

## Bot tokens

Each bot authenticates with its own token. All four are configured in Vercel production env:

| Bot    | Env var             |
|--------|---------------------|
| Doug   | `DOUG_API_TOKEN`    |
| Harvey | `HARVEY_API_TOKEN`  |
| Theo   | `THEO_API_TOKEN`    |
| Casper | `CASPER_API_TOKEN`  |

---

## Audit log — relay_calls table

Every call is persisted to `relay_calls`:

| Column          | Type        | Notes                              |
|-----------------|-------------|------------------------------------|
| `id`            | text (uuid) | Primary key                        |
| `actor`         | text        | `doug` / `harvey` / `theo` / `casper` |
| `method`        | text        | HTTP method                        |
| `path`          | text        | Target path                        |
| `status_code`   | int         | Upstream HTTP status               |
| `latency_ms`    | int         | Total relay latency                |
| `request_size`  | int         | Bytes in envelope body             |
| `response_size` | int         | Bytes in upstream response body    |
| `success`       | bool        | `status_code` 2xx                  |
| `error_code`    | text?       | Structured error code if failed    |
| `called_at`     | timestamptz | Defaults to `now()`                |

RLS: `service_role` only.

---

## Blocked paths

The following paths are never forwarded:

- `/api/relay` — prevents self-loops
- `/api/auth` — prevents auth-endpoint abuse via relay

---

## Migrating from direct endpoint calls

If a bot currently calls `/api/doug/my-tasks` directly, switch to:

```json
{
  "method": "GET",
  "path": "/api/doug/my-tasks",
  "query": { "workspaceId": "..." }
}
```

No other changes needed. The relay is transparent to the upstream endpoint.
