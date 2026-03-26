import { log } from "../logger";

// In-memory rate limit tracker — resets when the server restarts
// Simulates a sliding window: 5 requests per 60 seconds per IP
const LIMIT = 5;
const WINDOW_MS = 60_000;

interface WindowEntry {
  count: number;
  window_start: number;
}

const tracker = new Map<string, WindowEntry>();

export function handleRateLimit(req: Request): Response {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();

  const entry = tracker.get(ip);

  if (!entry || now - entry.window_start > WINDOW_MS) {
    // New window
    tracker.set(ip, { count: 1, window_start: now });

    log({
      level: "info",
      route: "/fail/rate-limit",
      method: req.method,
      status: 200,
      error_type: null,
      duration_ms: Date.now() - start,
      message: `Request accepted — ${LIMIT - 1} remaining in current window`,
    });

    return Response.json(
      {
        message: "Request accepted.",
        rate_limit: {
          limit: LIMIT,
          remaining: LIMIT - 1,
          window_seconds: WINDOW_MS / 1000,
          reset_at: new Date(now + WINDOW_MS).toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": String(LIMIT - 1),
          "X-RateLimit-Reset": String(Math.floor((now + WINDOW_MS) / 1000)),
        },
      }
    );
  }

  entry.count += 1;
  const remaining = Math.max(0, LIMIT - entry.count);
  const retryAfterSeconds = Math.ceil((entry.window_start + WINDOW_MS - now) / 1000);

  if (entry.count > LIMIT) {
    log({
      level: "warn",
      route: "/fail/rate-limit",
      method: req.method,
      status: 429,
      error_type: "RATE_LIMIT_EXCEEDED",
      duration_ms: Date.now() - start,
      message: `Rate limit exceeded for ${ip} — retry after ${retryAfterSeconds}s`,
    });

    return Response.json(
      {
        error: {
          type: "RATE_LIMIT_EXCEEDED",
          status: 429,
          message: `Too many requests. You have exceeded the limit of ${LIMIT} requests per ${WINDOW_MS / 1000} seconds.`,
          retry_after_seconds: retryAfterSeconds,
          hint: "In production: implement exponential backoff and respect the Retry-After header.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor((entry.window_start + WINDOW_MS) / 1000)),
        },
      }
    );
  }

  log({
    level: "info",
    route: "/fail/rate-limit",
    method: req.method,
    status: 200,
    error_type: null,
    duration_ms: Date.now() - start,
    message: `Request accepted — ${remaining} remaining in current window`,
  });

  return Response.json(
    {
      message: "Request accepted.",
      rate_limit: {
        limit: LIMIT,
        remaining,
        window_seconds: WINDOW_MS / 1000,
        reset_at: new Date(entry.window_start + WINDOW_MS).toISOString(),
      },
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(LIMIT),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.floor((entry.window_start + WINDOW_MS) / 1000)),
      },
    }
  );
}