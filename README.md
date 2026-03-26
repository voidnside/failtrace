# FailTrace

API failure simulation built with Bun + TypeScript.

FailTrace exposes four endpoints, each reproducing a specific class of API failure. Every request generates a structured JSON log — timestamp, route, error type, status code, duration. The goal is to make failure behavior explicit, reproducible, and observable.

---

## Why this exists

In support engineering, the first step in any investigation is reproducing the failure. You cannot diagnose what you cannot reproduce, and you cannot document what you cannot observe.

FailTrace exists to make that process concrete: here is a timeout, here is what it looks like in logs, here is the structured response a client receives. Each failure mode is isolated so it can be tested independently.

---

## Failure routes

| Route                  | Status | Error type                                                                          | What it simulates                                                                     |
| ---------------------- | ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /fail/timeout`    | 408    | `REQUEST_TIMEOUT`                                                                   | 5-second delayed response — simulates a hung server or slow downstream dependency     |
| `GET /fail/auth`       | 401    | `MISSING_CREDENTIALS` / `MALFORMED_CREDENTIALS` / `TOKEN_EXPIRED`                   | Three authentication sub-cases depending on what the client sends                     |
| `GET /fail/server`     | 500    | `UNHANDLED_EXCEPTION` / `DATABASE_CONNECTION_FAILED` / `UPSTREAM_DEPENDENCY_FAILED` | Rotates through three server-side failure scenarios                                   |
| `GET /fail/rate-limit` | 429    | `RATE_LIMIT_EXCEEDED`                                                               | Sliding window rate limiter — 5 requests per 60 seconds. Returns `Retry-After` header |

`GET /health` returns server uptime. Use it to confirm the server is running.

---

## Setup

```bash
# Requires Bun — https://bun.sh
bun install
bun run dev     # development with file watching
bun run start   # production
```

Server starts on `http://localhost:3000`.

---

## Usage examples

### Timeout

```bash
curl -i http://localhost:3000/fail/timeout
# Waits 5 seconds, then:
# HTTP/1.1 408 Request Timeout
```

### Auth — no credentials

```bash
curl -i http://localhost:3000/fail/auth
# HTTP/1.1 401 Unauthorized
# WWW-Authenticate: Bearer realm="failtrace", error="invalid_token"
```

### Auth — malformed header

```bash
curl -i http://localhost:3000/fail/auth \
  -H "Authorization: mytoken123"
# HTTP/1.1 401 — MALFORMED_CREDENTIALS
```

### Auth — well-formed but expired

```bash
curl -i http://localhost:3000/fail/auth \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.example"
# HTTP/1.1 401 — TOKEN_EXPIRED
```

### Server error

```bash
curl -i http://localhost:3000/fail/server
# HTTP/1.1 500 Internal Server Error
# Rotates scenario each minute
```

### Rate limit — trigger the 429

```bash
for i in {1..6}; do curl -s http://localhost:3000/fail/rate-limit | jq .error.type; done
# null null null null null "RATE_LIMIT_EXCEEDED"
```

---

## Sample log output

Each request produces exactly one JSON log line on stdout. Format:

```json
{"timestamp":"2025-03-15T14:22:03.441Z","level":"warn","route":"/fail/auth","method":"GET","status":401,"error_type":"MISSING_CREDENTIALS","duration_ms":0,"message":"No Authorization header was provided."}
{"timestamp":"2025-03-15T14:22:11.887Z","level":"error","route":"/fail/server","method":"GET","status":500,"error_type":"DATABASE_CONNECTION_FAILED","duration_ms":1,"message":"PostgreSQL connection timeout after 5000ms — pool exhausted (max: 10)"}
{"timestamp":"2025-03-15T14:22:19.003Z","level":"warn","route":"/fail/timeout","method":"GET","status":408,"error_type":"REQUEST_TIMEOUT","duration_ms":5001,"message":"Request stalled for 5000ms and timed out"}
{"timestamp":"2025-03-15T14:22:31.214Z","level":"warn","route":"/fail/rate-limit","method":"GET","status":429,"error_type":"RATE_LIMIT_EXCEEDED","duration_ms":0,"message":"Rate limit exceeded for unknown — retry after 43s"}
```

Fields:

| Field         | Type                      | Description                                 |
| ------------- | ------------------------- | ------------------------------------------- |
| `timestamp`   | ISO 8601                  | UTC time of the request                     |
| `level`       | `info` / `warn` / `error` | Severity of the event                       |
| `route`       | string                    | Endpoint path                               |
| `method`      | string                    | HTTP method                                 |
| `status`      | number                    | HTTP status code returned                   |
| `error_type`  | string / null             | Machine-readable error code                 |
| `duration_ms` | number                    | Time from request receipt to response       |
| `message`     | string                    | Human-readable description of what happened |

---

## What this demonstrates

**For support engineering:** I understand how APIs fail at the system level — not just that they return errors, but what those errors mean, what causes them, and what information needs to be in the log for them to be diagnosable.

**For debugging workflows:** The structured log format here is the same format you'd use to filter production logs, build alerts, or correlate failures across services. Every field is there for a reason.

**For async communication:** The `hint` field in each error response is what I'd write to a user in a support ticket — specific, actionable, no filler.

---

## Stack

- [Bun](https://bun.sh) — runtime and server
- TypeScript — strict mode
- Zero external dependencies
